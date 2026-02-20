import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = await getDatabase();
    const { id } = params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ erro: 'ID inválido' }, { status: 400 });

    const motorista = await db.collection('melicages_motoristas').findOne({ _id: new ObjectId(id) });
    if (!motorista) return NextResponse.json({ erro: 'Motorista não encontrado' }, { status: 404 });
    if (motorista.status !== 'descarregando') {
      return NextResponse.json({ erro: 'Motorista não está descarregando', statusAtual: motorista.status }, { status: 400 });
    }

    const agora = new Date();
    const tempoDescarga = Math.floor((agora.getTime() - motorista.timestampInicioDescarga.getTime()) / 1000);

    await db.collection('melicages_motoristas').updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'descarregado', timestampFimDescarga: agora, tempoDescarga } }
    );

    const atualizado = await db.collection('melicages_motoristas').findOne({ _id: new ObjectId(id) });
    const { _id, ...rest } = atualizado!;
    return NextResponse.json({ success: true, message: 'Descarga finalizada', data: { ...rest, id: _id.toString() } });
  } catch (error: any) {
    return NextResponse.json({ erro: 'Erro interno', detalhes: error.message }, { status: 500 });
  }
}