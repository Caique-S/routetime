import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/app/lib/mongodb';
import { STATUS_VALIDOS, validarTransicao, type StatusCarregamento,} from '@/app/lib/utils/status';
import { TZ_BRASIL } from '@/app/lib/utils/dateUtils';

/**
 * PATCH /api/carregamento/[id]/status
 *
 * Avança ou cancela a etapa de um carregamento.
 *
 * Transições válidas (definidas em lib/utils/status.ts):
 *   aguardando → emDoca | not_used
 *   emDoca     → carregando | not_used
 *   carregando → liberado | not_used
 *   liberado   → (terminal)
 *   not_used   → (terminal)
 *
 * Body: {
 *   status: StatusCarregamento,
 *   dadosAdicionais?: Record<string, unknown>
 *     Exemplos por status:
 *       emDoca:    { doca: 'D1' }
 *       carregando: { horaInicio: '14:00' }
 *       liberado:  { saidaLiberada: '15:30', lacreTraseiro: 'LAC-001' }
 *       not_used:  { motivoCancelamento?: string }
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { status, dadosAdicionais } = body as {
      status: StatusCarregamento;
      dadosAdicionais?: Record<string, unknown>;
    };

    if (!status || !STATUS_VALIDOS.includes(status)) {
      return NextResponse.json(
        { error: `Status inválido. Use: ${STATUS_VALIDOS.join(', ')}` },
        { status: 400 }
      );
    }

    const db       = await getDatabase();
    const objectId = new ObjectId(id);

    const docAtual = await db.collection('carregamentos').findOne({ _id: objectId });

    if (!docAtual) {
      return NextResponse.json({ error: 'Carregamento não encontrado' }, { status: 404 });
    }

    const erroTransicao = validarTransicao(docAtual.status as StatusCarregamento, status);
    if (erroTransicao) {
      return NextResponse.json({ error: erroTransicao }, { status: 422 });
    }

    const agora    = new Date();
    const agoraISO = agora.toISOString();

    console.log(
      `[API] Transição de status — id: ${id}`,
      `| ${docAtual.status} → ${status}`,
      `| UTC: ${agoraISO}`,
      `| Brasília: ${agora.toLocaleString('pt-BR', { timeZone: TZ_BRASIL })}`
    );

    const setPayload: Record<string, unknown> = {
      status,
      [`timestamps.${status}`]: agoraISO,
      dataAtualizacao: agora,
    };

    const camposProtegidos = new Set(['status', 'timestamps', 'dataAtualizacao', '_id', 'motoristaId', 'dataCriacao']);

    if (dadosAdicionais && typeof dadosAdicionais === 'object') {
      for (const [key, value] of Object.entries(dadosAdicionais)) {
        if (!camposProtegidos.has(key)) {
          setPayload[key] = value;
        }
      }
    }

    if (status === 'liberado') {
      // Marca o momento de liberação para relatórios
      setPayload['timestamps.liberado'] = agoraISO;
    }

    if (status === 'not_used') {
      // Preserva o status anterior para auditoria
      setPayload['statusAnterior'] = docAtual.status;
    }

    // ── Persiste ──────────────────────────────────────────────────────────────
    await db.collection('carregamentos').updateOne({ _id: objectId }, { $set: setPayload });

    const docAtualizado = await db.collection('carregamentos').findOne({ _id: objectId });

    return NextResponse.json({
      success: true,
      data: {
        id:              docAtualizado!._id.toString(),
        status:          docAtualizado!.status,
        statusAnterior:  docAtualizado!.statusAnterior ?? null,
        timestamps:      docAtualizado!.timestamps ?? {},
      },
    });
  } catch (error) {
    console.error('[PATCH /api/carregamento/[id]/status]', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}