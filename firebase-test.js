#!/usr/bin/env node

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * firebase-test.js  —  Diagnóstico profundo do Firebase Admin SDK
 *
 * USO:
 *   node firebase-test.js
 *
 * DEPENDÊNCIAS:  firebase-admin  dotenv
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

// ── Carrega vars — compatível com dotenv, dotenvx e Next.js ──────────────────
try { require('dotenv').config({ path: '.env.local', override: false }); } catch {}
try { require('dotenv').config({ path: '.env',       override: false }); } catch {}

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m',
  blue: '\x1b[34m', cyan: '\x1b[36m', magenta: '\x1b[35m',
};

const ok   = (m) => console.log(`${C.green}  ✓${C.reset} ${m}`);
const fail = (m) => console.log(`${C.red}  ✗${C.reset} ${m}`);
const info = (m) => console.log(`${C.blue}  ℹ${C.reset} ${m}`);
const warn = (m) => console.log(`${C.yellow}  ⚠${C.reset} ${m}`);
const step = (m) => console.log(`\n${C.bold}${C.cyan}▶ ${m}${C.reset}`);
const sep  = ()  => console.log(`${C.dim}${'─'.repeat(64)}${C.reset}`);
const dump = (label, val) => console.log(`  ${C.magenta}${label}:${C.reset} ${C.dim}${val}${C.reset}`);

let OK = 0, FAIL = 0;
const pass  = (desc, detail = '') => { OK++;   ok(`${desc}${detail ? `  ${C.dim}(${detail})` : ''}${C.reset}`); };
const error = (desc, detail = '') => { FAIL++; fail(`${desc}${detail ? `  ${C.dim}→ ${detail}` : ''}${C.reset}`); };

// ─────────────────────────────────────────────────────────────────────────────
// PASSO 1 — Inspecionar o valor real da PRIVATE_KEY
// ─────────────────────────────────────────────────────────────────────────────
async function inspecionarKey() {
  step('1/6 — Inspecionando FIREBASE_PRIVATE_KEY em detalhe');
  sep();

  const rawKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!rawKey) {
    error('FIREBASE_PRIVATE_KEY não encontrada no ambiente');
    return null;
  }

  // ── Informações do valor bruto ──
  dump('Comprimento bruto (chars)',        rawKey.length);
  dump('Primeiros 40 chars',               JSON.stringify(rawKey.slice(0, 40)));
  dump('Últimos 30 chars',                 JSON.stringify(rawKey.slice(-30)));
  dump('Contém \\\\n (barra dupla)',        String(rawKey.includes('\\n')));
  dump('Contém \\n real (newline)',         String(rawKey.includes('\n')));
  dump('Contém aspas duplas envolvendo',   String(rawKey.startsWith('"') || rawKey.endsWith('"')));
  dump('Contém "BEGIN PRIVATE KEY"',       String(rawKey.includes('BEGIN PRIVATE KEY')));
  dump('Contém "BEGIN RSA PRIVATE KEY"',   String(rawKey.includes('BEGIN RSA PRIVATE KEY')));

  // ── Problemas comuns detectados ──
  const problemas = [];

  if (rawKey.startsWith('"') || rawKey.endsWith('"')) {
    problemas.push('A key começa/termina com aspas duplas — elas foram incluídas no valor!');
  }
  if (!rawKey.includes('BEGIN')) {
    problemas.push('Falta o header "-----BEGIN ... KEY-----"');
  }
  if (!rawKey.includes('\\n') && !rawKey.includes('\n')) {
    problemas.push('Sem quebras de linha — a key parece estar em uma única linha corrompida');
  }

  problemas.forEach(p => error(`Problema detectado: ${p}`));

  // ── Normalização ──
  // 1. Remove aspas externas se existirem
  let key = rawKey;
  if (key.startsWith('"') && key.endsWith('"')) key = key.slice(1, -1);
  if (key.startsWith("'") && key.endsWith("'")) key = key.slice(1, -1);

  // 2. Converte \\n literais para \n reais
  key = key.replace(/\\n/g, '\n');

  // 3. Remove espaços extras ao redor
  key = key.trim();

  dump('\nKey normalizada — comprimento', key.length);
  dump('Linhas após normalização',        String(key.split('\n').length));
  dump('Header presente',                 String(key.startsWith('-----BEGIN')));
  dump('Footer presente',                 String(key.includes('-----END')));

  const keyValida = key.startsWith('-----BEGIN') && key.includes('-----END') && key.split('\n').length > 3;

  if (keyValida) {
    pass('PRIVATE_KEY normalizada é válida (formato PEM correto)', `${key.split('\n').length} linhas`);
  } else {
    error('PRIVATE_KEY não tem formato PEM válido mesmo após normalização');
    warn('Solução: regenere a chave no Firebase Console e copie EXATAMENTE o campo "private_key" do JSON');
  }

  return keyValida ? key : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// PASSO 2 — Verificar clock skew (JWT depende de hora precisa)
// ─────────────────────────────────────────────────────────────────────────────
async function verificarClock() {
  step('2/6 — Verificando clock skew (hora do sistema)');
  sep();

  let horaRemota = null;
  try {
    // Usa a API do Google para checar a hora real (sem auth necessário)
    const https = require('https');
    horaRemota = await new Promise((resolve, reject) => {
      const req = https.get('https://www.googleapis.com/', (res) => {
        // O header "date" do Google é hora UTC confiável
        const serverDate = res.headers['date'];
        resolve(serverDate ? new Date(serverDate) : null);
        res.resume();
      });
      req.on('error', reject);
      req.setTimeout(5000, () => { req.destroy(); reject(new Error('timeout')); });
    });
  } catch (e) {
    warn(`Não foi possível checar clock via googleapis.com: ${e.message}`);
  }

  const local = new Date();
  dump('Hora local',   local.toISOString());

  if (horaRemota) {
    const diffMs = Math.abs(local.getTime() - horaRemota.getTime());
    const diffS  = Math.floor(diffMs / 1000);
    dump('Hora servidor Google', horaRemota.toISOString());
    dump('Diferença',            `${diffS}s (${diffMs}ms)`);

    // JWT falha se clock skew > 300s (5 min)
    if (diffS < 30) {
      pass(`Clock sincronizado`, `diferença de ${diffS}s`);
    } else if (diffS < 300) {
      warn(`Clock com diferença de ${diffS}s — pode causar instabilidade no JWT`);
    } else {
      error(`Clock skew crítico: ${diffS}s — JWTs serão rejeitados`, 'sincronize o relógio do sistema');
    }
  } else {
    warn('Não foi possível comparar com hora remota');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PASSO 3 — Testar geração de JWT (sem depender do Admin SDK ainda)
// ─────────────────────────────────────────────────────────────────────────────
async function testarJWT(privateKey) {
  step('3/6 — Testando geração de JWT com a private_key');
  sep();

  if (!privateKey) {
    warn('Pulando teste JWT — private_key inválida (corrigir no passo anterior)');
    return false;
  }

  try {
    const crypto = require('crypto');

    // Gera um JWT mínimo com o formato que o Firebase Admin usa
    const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      iss: process.env.FIREBASE_CLIENT_EMAIL,
      sub: process.env.FIREBASE_CLIENT_EMAIL,
      aud: 'https://oauth2.googleapis.com/token',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    })).toString('base64url');

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(`${header}.${payload}`);
    const sig = sign.sign(privateKey, 'base64url');

    const jwt = `${header}.${payload}.${sig}`;
    pass('JWT gerado com sucesso usando a private_key', `${jwt.length} chars`);
    dump('JWT (primeiros 80 chars)', jwt.slice(0, 80) + '...');
    return true;
  } catch (err) {
    error('Falha ao gerar JWT', err.message);
    if (err.message.includes('PEM routines')) {
      warn('A private_key tem problema de encoding PEM — verifique se foi copiada integralmente');
    }
    if (err.message.includes('bad decrypt') || err.message.includes('unsupported')) {
      warn('Formato de chave não suportado — Firebase usa RSA (PKCS8). Regenere a chave.');
    }
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PASSO 4 — Inicializar Admin SDK e testar leitura
// ─────────────────────────────────────────────────────────────────────────────
async function testarAdminSDK(privateKey) {
  step('4/6 — Inicializando Firebase Admin SDK');
  sep();

  let admin;
  try {
    admin = require('firebase-admin');
  } catch {
    error('"firebase-admin" não instalado', 'npm install firebase-admin');
    return null;
  }

  // Destrói instâncias anteriores (hot-reload safety)
  const APP_NAME = 'melicages-diag';
  try {
    const existing = admin.apps.find(a => a?.name === APP_NAME);
    if (existing) await existing.delete();
  } catch {}

  let app;
  try {
    app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  privateKey, // já normalizada
      }),
    }, APP_NAME);
    pass('Admin SDK inicializado sem erros de configuração');
  } catch (err) {
    error('Falha ao inicializar Admin SDK', err.message);
    return null;
  }

  const db = app.firestore();
  const COLLECTION = process.env.FIRESTORE_COLLECTION || 'motoristas_fila';

  // Leitura simples
  try {
    const t0 = Date.now();
    const snap = await db.collection(COLLECTION).limit(3).get();
    pass(`Leitura da coleção "${COLLECTION}"`, `${Date.now() - t0}ms, ${snap.size} doc(s)`);

    if (snap.size > 0) {
      const d = snap.docs[0].data();
      info(`Exemplo de doc: id=${snap.docs[0].id}, status=${d.status ?? '?'}`);
    }
  } catch (err) {
    error('Falha na leitura do Firestore', err.message);
    if (err.code === 16) {
      fail('→ Código 16 = UNAUTHENTICATED apesar do JWT válido');
      warn('  Isso pode indicar que a SERVICE ACCOUNT foi desabilitada ou deletada.');
      warn('  Verifique em: console.cloud.google.com → IAM → Contas de serviço');
      warn('  Confirme que firebase-adminsdk@... está ATIVA e tem papel "Firebase Admin"');
    }
    return null;
  }

  // Escrita de teste
  const TEST_ID = `__diag_${Date.now()}`;
  try {
    const t0 = Date.now();
    await db.collection(COLLECTION).doc(TEST_ID).set({ __test: true, ts: new Date().toISOString() });
    pass('Escrita (set) no Firestore', `${Date.now() - t0}ms`);

    await db.collection(COLLECTION).doc(TEST_ID).set({ doca: 'TEST' }, { merge: true });
    pass('Escrita com merge (set + merge: true)', 'igual à rota /doca');

    await db.collection(COLLECTION).doc(TEST_ID).delete();
    pass('Limpeza do documento de teste');
  } catch (err) {
    error('Falha na escrita do Firestore', err.message);
  }

  return db;
}

// ─────────────────────────────────────────────────────────────────────────────
// PASSO 5 — Testar onSnapshot com Client SDK
// ─────────────────────────────────────────────────────────────────────────────
async function testarOnSnapshot(adminDb) {
  step('5/6 — Testando onSnapshot (Client SDK)');
  sep();

  // Verifica vars do cliente
  const apiKey    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
                 || process.env.FIREBASE_PROJECT_ID;

  if (!apiKey) {
    warn('NEXT_PUBLIC_FIREBASE_API_KEY não definida — adicionando ao .env.local resolverá isso');
    warn('Valores do firebaseConfig.ts do app (não são secrets — podem ir no .env.local):');
    warn('  NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...');
    warn('  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=melicages.firebaseapp.com');
    warn('  NEXT_PUBLIC_FIREBASE_PROJECT_ID=melicages');
    warn('  NEXT_PUBLIC_FIREBASE_APP_ID=1:540071877661:web:...');
    warn('Pulando teste de onSnapshot.');
    return;
  }

  let initApp, getFirestore_, doc_, onSnapshot_;
  try {
    const fb    = require('firebase/app');
    const fbFs  = require('firebase/firestore');
    initApp     = fb.initializeApp;
    getFirestore_ = fbFs.getFirestore;
    doc_        = fbFs.doc;
    onSnapshot_ = fbFs.onSnapshot;
  } catch {
    warn('"firebase" (client SDK) não instalado — npm install firebase');
    return;
  }

  const COLLECTION = process.env.FIRESTORE_COLLECTION || 'motoristas_fila';
  const TEST_ID    = `__snap_${Date.now()}`;

  // Cria o documento de teste via Admin (garantido que existe)
  try {
    await adminDb.collection(COLLECTION).doc(TEST_ID).set({
      __test: true,
      status: 'em_fila',
      nome: 'Snapshot Test',
      timestampChegada: new Date().toISOString(),
    });
    pass('Documento de teste criado via Admin SDK para o listener');
  } catch (err) {
    error('Não foi possível criar doc de teste para onSnapshot', err.message);
    return;
  }

  // Inicializa client
  let clientApp;
  try {
    const { getApps, getApp } = require('firebase/app');
    const existente = getApps().find(a => a.name === 'diag-client');
    clientApp = existente || initApp({
      apiKey,
      authDomain:  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
      projectId,
      appId:       process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    }, 'diag-client');
    pass('Firebase Client SDK inicializado');
  } catch (err) {
    error('Falha ao inicializar Client SDK', err.message);
    return;
  }

  const clientDb  = getFirestore_(clientApp);
  const docRef    = doc_(clientDb, COLLECTION, TEST_ID);

  // Escuta com timeout de 8s
  await new Promise((resolve) => {
    let primeiroEvento   = false;
    let detectouUpdate   = false;
    let unsubscribe;

    const timeout = setTimeout(async () => {
      error('onSnapshot: timeout (8s sem eventos)', 'verifique as Regras do Firestore');
      warn('Regra necessária no Firebase Console → Firestore → Regras:');
      warn('  match /motoristas_fila/{id} { allow read: if true; }');
      if (unsubscribe) unsubscribe();
      await adminDb.collection(COLLECTION).doc(TEST_ID).delete().catch(() => {});
      resolve(false);
    }, 8000);

    const t0 = Date.now();

    unsubscribe = onSnapshot_(docRef, async (snap) => {
      const ms = Date.now() - t0;

      if (!primeiroEvento) {
        primeiroEvento = true;
        pass(`onSnapshot: primeiro evento recebido`, `${ms}ms`);

        if (!snap.exists()) {
          error('Snapshot recebido mas documento não existe', 'possível problema de permissão');
          clearTimeout(timeout);
          if (unsubscribe) unsubscribe();
          resolve(false);
          return;
        }

        info('Disparando atualização via Admin para testar tempo real...');
        await adminDb.collection(COLLECTION).doc(TEST_ID)
          .set({ doca: 'LIVE-7', updatedAt: new Date().toISOString() }, { merge: true });
      } else if (!detectouUpdate && snap.data()?.doca === 'LIVE-7') {
        detectouUpdate = true;
        pass('onSnapshot: atualização em tempo real detectada!', `${Date.now() - t0}ms total`);
        clearTimeout(timeout);
        if (unsubscribe) unsubscribe();
        await adminDb.collection(COLLECTION).doc(TEST_ID).delete().catch(() => {});
        pass('Documento de teste removido');
        resolve(true);
      }
    }, async (err) => {
      error('onSnapshot error', err.message);
      if (err.code === 'permission-denied') {
        warn('Regras do Firestore estão bloqueando leitura pública!');
        warn('No Firebase Console → Firestore → Regras, publique:');
        warn('  rules_version = "2";');
        warn('  service cloud.firestore {');
        warn('    match /databases/{database}/documents {');
        warn('      match /motoristas_fila/{id} {');
        warn('        allow read: if true;');
        warn('        allow write: if false;');
        warn('      }');
        warn('    }');
        warn('  }');
      }
      clearTimeout(timeout);
      if (unsubscribe) unsubscribe();
      await adminDb.collection(COLLECTION).doc(TEST_ID).delete().catch(() => {});
      resolve(false);
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PASSO 6 — Verificar service account no Cloud IAM
// ─────────────────────────────────────────────────────────────────────────────
async function verificarServiceAccount() {
  step('6/6 — Verificando alcance da service account');
  sep();

  const email = process.env.FIREBASE_CLIENT_EMAIL;
  if (email) {
    info(`Service account em uso: ${email}`);
    info('Para confirmar que está ativa e com permissões:');
    info(`  → console.cloud.google.com/iam-admin/serviceaccounts?project=${process.env.FIREBASE_PROJECT_ID}`);
    info('  → Procure pelo email acima → Status deve ser "Ativa"');
    info('  → Papéis mínimos: "Firebase Admin" ou "Cloud Datastore User"');
    pass('Identificação da service account OK (verificação manual necessária acima)');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  const t0 = Date.now();

  console.log(`\n${C.bold}${C.cyan}  🔥 FIREBASE DEEP DIAGNOSTIC${C.reset}`);
  sep();

  const privateKey = await inspecionarKey();
  await verificarClock();
  const jwtOk = await testarJWT(privateKey);
  const adminDb = jwtOk ? await testarAdminSDK(privateKey) : null;
  if (adminDb) await testarOnSnapshot(adminDb);
  await verificarServiceAccount();

  // ── Relatório ──
  const dur = ((Date.now() - t0) / 1000).toFixed(2);
  console.log(`\n`);
  sep();
  console.log(`${C.bold}  RELATÓRIO FINAL${C.reset}  ${C.dim}(${dur}s)${C.reset}`);
  sep();
  console.log(`  Passou:  ${C.green}${OK}${C.reset}   Falhou: ${FAIL > 0 ? C.red : C.dim}${FAIL}${C.reset}`);
  sep();

  if (FAIL === 0) {
    console.log(`\n${C.bold}${C.green}  ✅ Ambiente Firebase totalmente funcional!${C.reset}\n`);
  } else {
    console.log(`\n${C.bold}${C.red}  ❌ ${FAIL} problema(s) encontrado(s).${C.reset}`);
    console.log(`\n${C.yellow}  PRÓXIMOS PASSOS MAIS PROVÁVEIS:${C.reset}`);

    if (!jwtOk) {
      console.log(`\n  ${C.bold}A) private_key corrompida — solução:${C.reset}`);
      console.log(`     1. Firebase Console → Configurações do projeto → Contas de serviço`);
      console.log(`     2. Clique "Gerar nova chave privada" → baixa um JSON`);
      console.log(`     3. Abra o JSON e copie o campo "private_key" (incluindo -----BEGIN...END-----)`);
      console.log(`     4. No .env.local, coloque EXATAMENTE assim (aspas duplas obrigatórias):`);
      console.log(`        ${C.cyan}FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"${C.reset}`);
    } else {
      console.log(`\n  ${C.bold}A) Service account desabilitada ou sem permissão:${C.reset}`);
      console.log(`     → console.cloud.google.com/iam-admin/serviceaccounts`);
      console.log(`     → Confirme que ${process.env.FIREBASE_CLIENT_EMAIL} está Ativa`);
      console.log(`     → Confirme papéis: Firebase Admin SDK Administrator Service Agent`);
    }
    console.log('');
  }

  process.exit(FAIL > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`\n${C.red}  Erro fatal não capturado: ${err.message}${C.reset}`);
  process.exit(1);
});