import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = await getDatabase();
    const { id } = params;

    console.log('📥 ID recebido (finalizar-descarga):', id);
    const cleanId = id.trim();

    if (!ObjectId.isValid(cleanId)) {
      try {
        new ObjectId(cleanId);
      } catch {
        return NextResponse.json({ erro: 'ID inválido' }, { status: 400 });
      }
    }

    const objectId = new ObjectId(cleanId);
    const motorista = await db.collection('melicages_motoristas').findOne({ _id: objectId });

    if (!motorista) {
      return NextResponse.json({ erro: 'Motorista não encontrado' }, { status: 404 });
    }

    if (motorista.status !== 'descarregando') {
      return NextResponse.json(
        { erro: 'Motorista não está descarregando', statusAtual: motorista.status },
        { status: 400 }
      );
    }

    const agora = new Date();
    const tempoDescarga = Math.floor((agora.getTime() - new Date(motorista.timestampInicioDescarga).getTime()) / 1000);

    await db.collection('melicages_motoristas').updateOne(
      { _id: objectId },
      {
        $set: {
          status: 'descarregado',
          timestampFimDescarga: agora,
          tempoDescarga,
        },
      }
    );

    const atualizado = await db.collection('melicages_motoristas').findOne({ _id: objectId });
    const { _id, ...rest } = atualizado!;

    return NextResponse.json({
      success: true,
      message: 'Descarga finalizada',
      data: { ...rest, id: _id.toString() },
    });
  } catch (error: any) {
    console.error('❌ Erro interno:', error);
    return NextResponse.json(
      { erro: 'Erro interno', detalhes: error.message },
      { status: 500 }
    );
  }
}