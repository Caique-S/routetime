import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/app/lib/mongodb';
import { STATUS_VALIDOS, type StatusCarregamento } from '@/app/lib/utils/status';
import { TZ_BRASIL } from '@/app/lib/utils/dateUtils';

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

    const db      = await getDatabase();
    const agora   = new Date();
    const agoraISO = agora.toISOString();

    console.log(
      `[API] Etapa avançada — id: ${id}, status: ${status}`,
      `| UTC: ${agoraISO}`,
      `| Brasília: ${agora.toLocaleString('pt-BR', { timeZone: TZ_BRASIL })}`
    );

    const setPayload: Record<string, unknown> = {
      status,
      [`timestamps.${status}`]: agoraISO,
      dataAtualizacao: agora,
    };

    if (dadosAdicionais && typeof dadosAdicionais === 'object') {
      const camposProtegidos = new Set(['status', 'timestamps', 'dataAtualizacao', '_id']);
      for (const [key, value] of Object.entries(dadosAdicionais)) {
        if (!camposProtegidos.has(key)) {
          setPayload[key] = value;
        }
      }
    }

    const objectId = new ObjectId(id);
    const result   = await db
      .collection('carregamentos')
      .updateOne({ _id: objectId }, { $set: setPayload });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Carregamento não encontrado' }, { status: 404 });
    }

    const doc = await db.collection('carregamentos').findOne({ _id: objectId });

    return NextResponse.json({
      success: true,
      data: {
        id:         doc!._id.toString(),
        status:     doc!.status,
        timestamps: doc!.timestamps ?? {},
      },
    });
  } catch (error) {
    console.error('[PATCH /api/carregamento/[id]/status]', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}