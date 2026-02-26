import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getAblyClient } from '@/app/lib/ably'; // ✅ Importar a função lazy

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('[API] PUT /motoristas/[id]/doca');
  try {
    const { id } = await params;
    const db = await getDatabase();
    const objectId = new ObjectId(id);
    const { doca } = await request.json();

    if (!doca || typeof doca !== 'string') {
      return NextResponse.json(
        { success: false, erro: 'Campo "doca" obrigatório e deve ser string' },
        { status: 400 }
      );
    }

    const agora = new Date();
    const result = await db.collection('melicages_motoristas').updateOne(
      { _id: objectId },
      {
        $set: {
          doca,
          docaNotifiedAt: agora,
          updatedAt: agora,
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, erro: 'Motorista não encontrado' }, { status: 404 });
    }

    // ✅ Emite atualização da fila usando Ably lazy
    const ably = getAblyClient();
    const filaChannel = ably.channels.get('fila');
    await filaChannel.publish('atualizacao-fila', {});

    const updated = await db.collection('melicages_motoristas').findOne({ _id: objectId });
    const { _id, ...rest } = updated!;
    return NextResponse.json({ success: true, data: { id: _id.toString(), ...rest } });
  } catch (error: any) {
    console.error('[API] PUT /motoristas/[id]/doca error:', error);
    return NextResponse.json({ success: false, erro: 'Erro interno' }, { status: 500 });
  }
}