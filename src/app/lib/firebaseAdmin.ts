import * as admin from 'firebase-admin';

const APP_NAME = 'melicage-admin';

function getOrCreateAdminApp(): admin.app.App {

  const existing = admin.apps.find((a) => a?.name === APP_NAME);
  if (existing) return existing;

  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (!base64) {
    throw new Error(
      '[firebaseAdmin] Variável FIREBASE_SERVICE_ACCOUNT_BASE64 não encontrada. ' +
      'Consulte as instruções em firebaseAdmin.ts para configurar.'
    );
  }

  let serviceAccount: admin.ServiceAccount;
  try {
    const json = Buffer.from(base64, 'base64').toString('utf-8');
    serviceAccount = JSON.parse(json);
  } catch (e) {
    throw new Error(
      '[firebaseAdmin] Falha ao decodificar FIREBASE_SERVICE_ACCOUNT_BASE64. ' +
      'Verifique se o valor é um base64 válido do JSON do service account.'
    );
  }

  return admin.initializeApp(
    { credential: admin.credential.cert(serviceAccount) },
    APP_NAME
  );
}

const adminApp = getOrCreateAdminApp();

export const dbFirestore = adminApp.firestore();
export const FIRESTORE_COLLECTION =
  process.env.FIRESTORE_COLLECTION ?? 'motoristas_fila';

export default adminApp;