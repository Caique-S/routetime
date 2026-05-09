import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/app/lib/mongodb';

export const TZ_BRASIL = 'America/Sao_Paulo';

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


type StatusCarregamento = 'aguardando' | 'emDoca' | 'carregando' | 'finalizado';

const STATUS_VALIDOS: StatusCarregamento[] = [
  'aguardando',
  'emDoca',
  'carregando',
  'finalizado',
];

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

    const agora = new Date();
    const agoraISO = agora.toISOString(); 

    const agoraBrasil = agora.toLocaleString('pt-BR', { timeZone: TZ_BRASIL });
    console.log(
      `[API] Etapa avançada — id: ${id}, status: ${status} | UTC: ${agoraISO} | Brasília: ${agoraBrasil}`
    );

    const setPayload: Record<string, any> = {
      status,
      [`timestamps.${status}`]: agoraISO,
      dataAtualizacao: agora,
    };

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
        timestamps: doc!.timestamps ?? {},
      },
    });
  } catch (error) {
    console.error('Erro PATCH /api/carregamento/[id]/status:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}