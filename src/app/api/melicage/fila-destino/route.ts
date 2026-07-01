import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/lib/mongodb';
import { DESTINO_NOMES, getNomeDestino } from '@/app/lib/utils/destinos';
import { formatarHoraBrasil } from '@/app/lib/utils/dateUtils';

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface ItemMotoristaDestino {
  nomeCSV:              string;
  idCSV:                string;
  dadosMotorista:       Record<string, any> | null;
  readinessTimestamp:   string | null;
  pronto:               boolean;
  statusTexto:          string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizarNome(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function resolverProntidao(dadosMotorista: Record<string, any>): {
  pronto: boolean;
  readinessTimestamp: string | null;
  statusTexto: string;
} {
  const st: string = dadosMotorista.status ?? '';

  switch (st) {
    case 'aguardando_carregamento':
      return {
        pronto:             !!dadosMotorista.timestampChegada,
        readinessTimestamp: dadosMotorista.timestampChegada ?? null,
        statusTexto:        'Pronto (vazio)',
      };

    case 'descarregado':
      return {
        pronto:             true,
        readinessTimestamp: dadosMotorista.timestampFimDescarga ?? dadosMotorista.timestampChegada ?? null,
        statusTexto:        'Pronto (descarregado)',
      };

    case 'descarregando': return { pronto: false, readinessTimestamp: null, statusTexto: 'Descarregando' };
    case 'em_fila':       return { pronto: false, readinessTimestamp: null, statusTexto: 'Aguardando descarga' };
    case 'a_caminho':     return { pronto: false, readinessTimestamp: null, statusTexto: 'A caminho' };

    default:
      return { pronto: false, readinessTimestamp: null, statusTexto: st || 'Desconhecido' };
  }
}

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const latestUploads = await db
      .collection('uploads_atribuicao')
      .find({})
      .sort({ uploadDate: -1 })
      .limit(1)
      .toArray();

    if (!latestUploads.length || !Array.isArray(latestUploads[0]?.data) || latestUploads[0].data.length === 0) {
      return NextResponse.json({
        success:    true,
        data:       [],
        uploadDate: null,
        message:    'Nenhum arquivo CSV foi carregado ainda.',
      });
    }

    const csvData:    any[]  = latestUploads[0].data;
    const uploadDate: Date   = latestUploads[0].uploadDate;

    const host     = request.headers.get('host') ?? 'localhost:3000';
    const protocol = host.startsWith('localhost') ? 'http' : 'https';

    let motoristas: any[] = [];
    try {
      const res = await fetch(`${protocol}://${host}/api/melicage/motoristas`, {
        cache:   'no-store',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        motoristas = Array.isArray(json?.data) ? json.data : [];
      } else {
        console.warn('[fila-destino] motoristas endpoint retornou', res.status);
      }
    } catch (err) {
      console.error('[fila-destino] erro ao buscar motoristas:', err);
    }

    const byChave = new Map<string, any>();
    const byNome  = new Map<string, any>();

    for (const m of motoristas) {
      const chave = m.chave_identificacao ? String(m.chave_identificacao).trim() : null;
      if (chave) byChave.set(chave, m);

      const nome = m.nome ? normalizarNome(m.nome) : null;
      if (nome && !byNome.has(nome)) byNome.set(nome, m);
    }

    const destinosMap = new Map<string, { codigo: string; nome: string; itens: ItemMotoristaDestino[] }>();

    for (const row of csvData) {
      const codigoDestino = String(row['Destino'] ?? '').trim();
      const nomeCSV       = String(row['Nome do motorista 1'] ?? '').trim();
      const idCSV         = String(row['ID do motorista 1']   ?? '').trim();

      if (!codigoDestino || !nomeCSV) continue;

      const nomeDestino = getNomeDestino(codigoDestino);

      let dadosMotorista: any = null;
      if (idCSV) dadosMotorista = byChave.get(idCSV) ?? null;
      if (!dadosMotorista) dadosMotorista = byNome.get(normalizarNome(nomeCSV)) ?? null;

      const { pronto, readinessTimestamp, statusTexto } = dadosMotorista
        ? resolverProntidao(dadosMotorista)
        : { pronto: false, readinessTimestamp: null, statusTexto: 'Não chegou' };

      if (!destinosMap.has(codigoDestino)) {
        destinosMap.set(codigoDestino, { codigo: codigoDestino, nome: nomeDestino, itens: [] });
      }

      destinosMap.get(codigoDestino)!.itens.push({
        nomeCSV, idCSV, dadosMotorista, readinessTimestamp, pronto, statusTexto,
      });
    }

    const filasPorDestino = Array.from(destinosMap.values()).map((destino) => {
      const prontos = destino.itens
        .filter((i) => i.pronto && i.readinessTimestamp)
        .sort((a, b) => new Date(a.readinessTimestamp!).getTime() - new Date(b.readinessTimestamp!).getTime())
        .map((i, idx) => ({
          posicao:             idx + 1,
          nome:                i.nomeCSV,
          status:              i.dadosMotorista?.status ?? 'nao_chegou',
          statusTexto:         i.statusTexto,
          readinessTimestamp:  i.readinessTimestamp,
          readinessHora:       formatarHoraBrasil(i.readinessTimestamp),
          timestampChegada:    i.dadosMotorista?.timestampChegada    ?? null,
          timestampFimDescarga: i.dadosMotorista?.timestampFimDescarga ?? null,
          pronto:              true,
          id:                  i.dadosMotorista?.id ?? i.dadosMotorista?._id ?? null,
        }));

      const pendentes = destino.itens
        .filter((i) => !i.pronto)
        .sort((a, b) => a.nomeCSV.localeCompare(b.nomeCSV, 'pt-BR'))
        .map((i) => ({
          posicao:              null,
          nome:                 i.nomeCSV,
          status:               i.dadosMotorista?.status ?? 'nao_chegou',
          statusTexto:          i.statusTexto,
          readinessTimestamp:   null,
          readinessHora:        null,
          timestampChegada:     i.dadosMotorista?.timestampChegada ?? null,
          timestampFimDescarga: null,
          pronto:               false,
          id:                   i.dadosMotorista?.id ?? i.dadosMotorista?._id ?? null,
        }));

      return {
        codigo:         destino.codigo,
        nome:           destino.nome,
        totalProntos:   prontos.length,
        totalPendentes: pendentes.length,
        total:          destino.itens.length,
        motoristas:     [...prontos, ...pendentes],
      };
    });

    filasPorDestino.sort(
      (a, b) => b.totalProntos - a.totalProntos || a.nome.localeCompare(b.nome, 'pt-BR')
    );

    return NextResponse.json(
      {
        success:       true,
        uploadDate,
        totalDestinos: filasPorDestino.length,
        data:          filasPorDestino,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: any) {
    console.error('[GET /api/fila-destino]', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao calcular filas por destino', message: error.message },
      { status: 500 }
    );
  }
}