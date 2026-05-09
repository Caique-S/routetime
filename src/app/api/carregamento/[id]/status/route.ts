import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/app/lib/mongodb';

// ─────────────────────────────────────────────────────────────
// TIMEZONE — Estratégia adotada no projeto (Brasil UTC-3)
//
// ARMAZENAMENTO → sempre em UTC via agora.toISOString()
//   "2025-05-08T17:00:00.000Z" = 14:00 em Brasília (UTC-3). Correto.
//   UTC é universal, sem ambiguidade de horário de verão.
//
// CÁLCULO DE DURAÇÃO (timers do Kanban) → timezone-agnóstico
//   new Date(isoUTC).getTime() retorna ms desde epoch.
//   A subtração (agora - inicio) é sempre correta, independente de fuso.
//
// EXIBIÇÃO → converter para America/Sao_Paulo APENAS no frontend
//   Use formatarHoraBrasil() abaixo sempre que for mostrar hora ao usuário.
//   NUNCA use new Date().toLocaleString() sem especificar o timeZone.
// ─────────────────────────────────────────────────────────────

export const TZ_BRASIL = 'America/Sao_Paulo';

/**
 * Converte um ISO string UTC para horário de Brasília (HH:MM).
 * Importar e usar no frontend para exibir os campos de horário das etapas.
 *
 * Exemplo:
 *   formatarHoraBrasil("2025-05-08T17:00:00.000Z") → "14:00"
 */
export function formatarHoraBrasil(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', {
      timeZone: TZ_BRASIL,
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

// ─────────────────────────────────────────────────────────────

type StatusCarregamento = 'aguardando' | 'emDoca' | 'carregando' | 'finalizado';

const STATUS_VALIDOS: StatusCarregamento[] = [
  'aguardando',
  'emDoca',
  'carregando',
  'finalizado',
];

/**
 * PATCH /api/carregamento/[id]/status
 *
 * Avança a etapa do carregamento e registra o timestamp (ISO UTC) da transição.
 * Aceita opcionalmente "dadosAdicionais" para gravar campos extras (doca, carga…).
 *
 * Body: { status: StatusCarregamento, dadosAdicionais?: Record<string, any> }
 *
 * Os timestamps ficam gravados em UTC ISO.
 * O KanbanBoard calcula durações com new Date(iso).getTime() — correto em UTC.
 * A exibição ao usuário usa formatarHoraBrasil() — converte para UTC-3.
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
      dadosAdicionais?: Record<string, any>;
    };

    if (!status || !STATUS_VALIDOS.includes(status)) {
      return NextResponse.json(
        { error: `Status inválido. Valores aceitos: ${STATUS_VALIDOS.join(', ')}` },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // new Date() é UTC internamente (todo Date JS é UTC).
    // .toISOString() serializa em UTC → "2025-05-08T17:00:00.000Z"
    // Isso equivale a 14:00 no horário de Brasília (UTC-3).
    const agora = new Date();
    const agoraISO = agora.toISOString(); // UTC — padrão para armazenamento

    // Log com horário de Brasília para facilitar leitura no console do servidor
    const agoraBrasil = agora.toLocaleString('pt-BR', { timeZone: TZ_BRASIL });
    console.log(
      `[API] Etapa avançada — id: ${id}, status: ${status} | UTC: ${agoraISO} | Brasília: ${agoraBrasil}`
    );

    const setPayload: Record<string, any> = {
      status,
      // timestamps.aguardando / timestamps.emDoca / etc. = ISO UTC
      // frontend converte para exibição com formatarHoraBrasil()
      [`timestamps.${status}`]: agoraISO,
      dataAtualizacao: agora,
    };

    // Mesclar dadosAdicionais sem sobrescrever campos de controle
    if (dadosAdicionais && typeof dadosAdicionais === 'object') {
      for (const [key, value] of Object.entries(dadosAdicionais)) {
        if (!['status', 'timestamps', 'dataAtualizacao', '_id'].includes(key)) {
          setPayload[key] = value;
        }
      }
    }

    const result = await db
      .collection('carregamentos')
      .updateOne({ _id: new ObjectId(id) }, { $set: setPayload });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Carregamento não encontrado' },
        { status: 404 }
      );
    }

    const doc = await db
      .collection('carregamentos')
      .findOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      success: true,
      data: {
        id: doc!._id.toString(),
        status: doc!.status,
        // timestamps em UTC ISO — use formatarHoraBrasil() para exibir
        timestamps: doc!.timestamps ?? {},
      },
    });
  } catch (error) {
    console.error('Erro PATCH /api/carregamento/[id]/status:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}