import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getSocketServer } from '@/app/lib/socket'; // supondo que teremos um módulo socket

export async function POST(request: NextRequest) {
  try {
    const db = await getDatabase();
    const { motoristaId, doca } = await request.json();

    if (!motoristaId || !doca) {
      return NextResponse.json(
        { success: false, erro: 'motoristaId e doca são obrigatórios' },
        { status: 400 }
      );
    }

    let objectId;
    try {
      objectId = new ObjectId(motoristaId);
    } catch {
      return NextResponse.json({ success: false, erro: 'ID inválido' }, { status: 400 });
    }

    const motorista = await db.collection('melicages_motoristas').findOne({ _id: objectId });
    if (!motorista) {
      return NextResponse.json({ success: false, erro: 'Motorista não encontrado' }, { status: 404 });
    }

    const agora = new Date();
    await db.collection('melicages_motoristas').updateOne(
      { _id: objectId },
      {
        $set: {
          doca,
          docaNotifiedAt: agora,
          updatedAt: agora,
        },
      }
    );

    // Emitir via WebSocket para o app do motorista
    const io = getSocketServer();
    io.to(`motorista:${motoristaId}`).emit('notificacao-doca', { doca, tempoResposta: 300 });

    return NextResponse.json({ success: true, message: 'Notificação enviada' });
  } catch (error: any) {
    console.error('POST notificar error:', error);
    return NextResponse.json({ success: false, erro: 'Erro interno' }, { status: 500 });
  }
}