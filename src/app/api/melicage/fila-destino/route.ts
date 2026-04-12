
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/lib/mongodb';

// Mapeamento de código de rota → nome da cidade
const DESTINO_NOMES: Record<string, string> = {
  EBA14: 'Serrinha',
  EBA4: 'Santo Antônio de Jesus',
  EBA19: 'Itaberaba',
  EBA3: 'Jacobina',
  EBA2: 'Pombal',
  EBA16: 'Senhor do Bonfim',
  EBA21: 'Seabra',
  EBA6: 'Juazeiro',
  EBA29: 'Valença',
};

//  Remove acentos e normaliza para comparação fuzzy de nomes 
function normalizarNome(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Formata ISO string para HH:MM (horário de Brasília) para exibição
function formatarHora(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export async function GET(request: NextRequest) {
  try {
    // ── 1. Busca o upload mais recente ──────────────────────────────────────
    const db = await getDatabase('brj_transportes');
    const latestUploads = await db
      .collection('uploads_atribuicao')
      .find({})
      .sort({ uploadDate: -1 })
      .limit(1)
      .toArray();

    if (!latestUploads.length || !Array.isArray(latestUploads[0]?.data) || latestUploads[0].data.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        uploadDate: null,
        message: 'Nenhum arquivo CSV foi carregado ainda.',
      });
    }

    const csvData: any[] = latestUploads[0].data;
    const uploadDate: Date = latestUploads[0].uploadDate;

    // ── 2. Busca motoristas ativos via endpoint existente ───────────────────
    // Usamos o host da própria request para montar a URL sem hardcode
    const host = request.headers.get('host') ?? 'localhost:3000';
    const protocol = host.startsWith('localhost') ? 'http' : 'https';
    const motoristaUrl = `${protocol}://${host}/api/melicage/motoristas`;

    let motoristas: any[] = [];
    try {
      const res = await fetch(motoristaUrl, {
        // Sem cache: precisamos de dados ao vivo
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        const json = await res.json();
        // O endpoint devolve { data: [...] } ou { data: { data: [...] } }
        motoristas = json?.data ?? [];
        if (!Array.isArray(motoristas)) motoristas = [];
      } else {
        console.warn('[fila-destino] motoristas endpoint retornou', res.status);
      }
    } catch (fetchErr) {
      // Falha ao buscar motoristas não deve quebrar a rota toda;
      // retornamos as filas com todos como "Não chegou"
      console.error('[fila-destino] erro ao buscar motoristas:', fetchErr);
    }

    // ── 3. Indexa motoristas para matching eficiente ────────────────────────
    // Prioridade: chave_identificacao (ID do motorista no sistema de transporte)
    // Fallback: nome normalizado
    const byChave = new Map<string, any>();
    const byNome = new Map<string, any>();

    for (const m of motoristas) {
      const chave = m.chave_identificacao ? String(m.chave_identificacao).trim() : null;
      if (chave) byChave.set(chave, m);

      const nome = m.nome ? normalizarNome(m.nome) : null;
      if (nome) {
        // Prioriza registros mais recentes caso haja duplicatas de nome
        if (!byNome.has(nome)) byNome.set(nome, m);
      }
    }

    // ── 4. Agrupa linhas do CSV por destino e calcula prontidão ─────────────
    interface MotoristaDestino {
      nomeCSV: string;
      idCSV: string;
      dadosMotorista: any | null;          // registro do sistema ou null
      readinessTimestamp: string | null;   // ISO — horário em que ficou pronto
      pronto: boolean;
      statusTexto: string;                 // legível para exibição
    }

    const destinosMap = new Map<string, {
      codigo: string;
      nome: string;
      itens: MotoristaDestino[];
    }>();

    for (const row of csvData) {
      const codigoDestino = (row['Destino'] ?? '').toString().trim();
      const nomeCSV = (row['Nome do motorista 1'] ?? '').toString().trim();
      const idCSV = (row['ID do motorista 1'] ?? '').toString().trim();

      // Ignora linhas sem destino ou sem nome do motorista
      if (!codigoDestino || !nomeCSV) continue;

      const nomeDestino = DESTINO_NOMES[codigoDestino] ?? codigoDestino;

      // Matching: chave → nome normalizado
      let dadosMotorista: any = null;
      if (idCSV) dadosMotorista = byChave.get(idCSV) ?? null;
      if (!dadosMotorista) dadosMotorista = byNome.get(normalizarNome(nomeCSV)) ?? null;

      // Determina prontidão com base no status do sistema
      let readinessTimestamp: string | null = null;
      let pronto = false;
      let statusTexto = 'Não chegou';

      if (dadosMotorista) {
        const st: string = dadosMotorista.status ?? '';
        switch (st) {
          case 'aguardando_carregamento':
            // Chegou vazio: pronto imediatamente na chegada
            readinessTimestamp = dadosMotorista.timestampChegada ?? null;
            pronto = !!readinessTimestamp;
            statusTexto = 'Pronto (vazio)';
            break;

          case 'descarregado':
            // Tinha gaiolas: pronto após fim da descarga
            readinessTimestamp =
              dadosMotorista.timestampFimDescarga ??
              dadosMotorista.timestampChegada ??
              null;
            pronto = !!readinessTimestamp;
            statusTexto = 'Pronto (descarregado)';
            break;

          case 'descarregando':
            pronto = false;
            statusTexto = 'Descarregando';
            break;

          case 'em_fila':
            pronto = false;
            statusTexto = 'Aguardando descarga';
            break;

          case 'a_caminho':
            pronto = false;
            statusTexto = 'A caminho';
            break;

          default:
            // Status desconhecido — conservador: não marca como pronto
            pronto = false;
            statusTexto = st || 'Desconhecido';
        }
      }

      if (!destinosMap.has(codigoDestino)) {
        destinosMap.set(codigoDestino, { codigo: codigoDestino, nome: nomeDestino, itens: [] });
      }

      destinosMap.get(codigoDestino)!.itens.push({
        nomeCSV,
        idCSV,
        dadosMotorista,
        readinessTimestamp,
        pronto,
        statusTexto,
      });
    }

    // ── 5. Ordena e formata a resposta ────────────────────────────────────────
    const filasPorDestino = Array.from(destinosMap.values()).map((destino) => {
      // Prontos: ordenados por horário de prontidão ascendente
      const prontos = destino.itens
        .filter((i) => i.pronto && i.readinessTimestamp)
        .sort(
          (a, b) =>
            new Date(a.readinessTimestamp!).getTime() -
            new Date(b.readinessTimestamp!).getTime()
        )
        .map((i, idx) => ({
          posicao: idx + 1,
          nome: i.nomeCSV,
          status: i.dadosMotorista?.status ?? 'nao_chegou',
          statusTexto: i.statusTexto,
          readinessTimestamp: i.readinessTimestamp,
          readinessHora: formatarHora(i.readinessTimestamp),
          timestampChegada: i.dadosMotorista?.timestampChegada ?? null,
          timestampFimDescarga: i.dadosMotorista?.timestampFimDescarga ?? null,
          pronto: true,
          id: i.dadosMotorista?.id ?? i.dadosMotorista?._id ?? null,
        }));

      // Pendentes: ordenados por nome (ordem de chegada desconhecida)
      const pendentes = destino.itens
        .filter((i) => !i.pronto)
        .sort((a, b) => a.nomeCSV.localeCompare(b.nomeCSV, 'pt-BR'))
        .map((i) => ({
          posicao: null,
          nome: i.nomeCSV,
          status: i.dadosMotorista?.status ?? 'nao_chegou',
          statusTexto: i.statusTexto,
          readinessTimestamp: null,
          readinessHora: null,
          timestampChegada: i.dadosMotorista?.timestampChegada ?? null,
          timestampFimDescarga: null,
          pronto: false,
          id: i.dadosMotorista?.id ?? i.dadosMotorista?._id ?? null,
        }));

      return {
        codigo: destino.codigo,
        nome: destino.nome,
        totalProntos: prontos.length,
        totalPendentes: pendentes.length,
        total: destino.itens.length,
        motoristas: [...prontos, ...pendentes],
      };
    });

    // Destinos com mais motoristas prontos aparecem primeiro
    filasPorDestino.sort(
      (a, b) => b.totalProntos - a.totalProntos || a.nome.localeCompare(b.nome, 'pt-BR')
    );

    return NextResponse.json(
      {
        success: true,
        uploadDate,
        totalDestinos: filasPorDestino.length,
        data: filasPorDestino,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('[fila-destino] Erro não tratado:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno ao calcular filas por destino',
        message: error?.message,
      },
      { status: 500 }
    );
  }
}