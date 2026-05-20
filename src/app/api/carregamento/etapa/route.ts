import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/lib/mongodb';

type Status = 'aguardando' | 'emDoca' | 'carregando' | 'finalizado';
const STATUS_VALIDOS: Status[] = ['aguardando', 'emDoca', 'carregando', 'finalizado'];
const TZ = 'America/Sao_Paulo';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { motoristaId, status, dadosAdicionais } = body as {
      motoristaId: string;
      status: Status;
      dadosAdicionais?: Record<string, any>;
    };

    if (!motoristaId || typeof motoristaId !== 'string') {
      return NextResponse.json({ error: 'motoristaId é obrigatório' }, { status: 400 });
    }

    if (!status || !STATUS_VALIDOS.includes(status)) {
      return NextResponse.json(
        { error: `Status inválido. Use: ${STATUS_VALIDOS.join(', ')}` },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const agora = new Date();
    const agoraISO = agora.toISOString(); 

    console.log(
      `[PATCH /etapa] ${motoristaId} → ${status}`,
      `| UTC: ${agoraISO}`,
      `| Brasília: ${agora.toLocaleString('pt-BR', { timeZone: TZ })}`
    );

    const setPayload: Record<string, any> = {
      status,
      [`timestamps.${status}`]: agoraISO,
      dataAtualizacao: agora,
    };

    if (dadosAdicionais && typeof dadosAdicionais === 'object') {
      for (const [key, value] of Object.entries(dadosAdicionais)) {
        if (!['status', 'timestamps', 'dataAtualizacao', '_id', 'motoristaId'].includes(key)) {
          setPayload[key] = value;
        }
      }
    }

    const result = await db
      .collection('carregamentos')
      .updateOne({ motoristaId }, { $set: setPayload });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: `Carregamento não encontrado: ${motoristaId}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { motoristaId, status, timestamp: agoraISO },
    });
  } catch (error) {
    console.error('[PATCH /api/carregamento/etapa]', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}