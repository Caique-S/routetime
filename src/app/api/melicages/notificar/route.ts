import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getAblyClient } from '@/app/lib/ably'; // ✅ Importar a função lazy

export async function POST(request: NextRequest) {
  console.log('[API] POST /notificar');
  try {
    const db = await getDatabase();
    const { motoristaId, doca } = await request.json();

    if (!motoristaId || !doca) {
      return NextResponse.json(
        { success: false, erro: 'motoristaId e doca são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar ID
    let objectId;
    try {
      objectId = new ObjectId(motoristaId);
    } catch {
      return NextResponse.json({ success: false, erro: 'ID inválido' }, { status: 400 });
    }

    // Buscar motorista
    const motorista = await db.collection('melicages_motoristas').findOne({ _id: objectId });
    if (!motorista) {
      return NextResponse.json({ success: false, erro: 'Motorista não encontrado' }, { status: 404 });
    }

    // Atualizar com a doca
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

    // ✅ Criar cliente Ably apenas quando necessário
    const ably = getAblyClient();
    const channel = ably.channels.get(`motorista:${motoristaId}`);
    await channel.publish('notificacao-doca', { doca, tempoResposta: 300 });

    console.log(`📢 Notificação enviada via Ably para motorista:${motoristaId}`);

    return NextResponse.json({ success: true, message: 'Notificação enviada' });
  } catch (error: any) {
    console.error('[API] POST /notificar error:', error);
    return NextResponse.json(
      { success: false, erro: 'Erro interno', detalhes: error.message },
      { status: 500 }
    );
  }
}