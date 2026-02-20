import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🔍 Rota iniciar-descarga chamada');
  console.log('📦 params recebido:', params);
  console.log('🔑 id extraído:', params?.id);

  try {
    const db = await getDatabase();
    const { id } = params;

    if (!id || id.trim() === '') {
      console.log('❌ ID vazio ou não fornecido');
      return NextResponse.json({ erro: 'ID não fornecido' }, { status: 400 });
    }

    const cleanId = id.trim();
    console.log('🧹 ID limpo:', cleanId);

    // Tenta converter para ObjectId (mesmo que isValid falhe)
    let objectId;
    try {
      objectId = new ObjectId(cleanId);
      console.log('✅ ObjectId criado:', objectId);
    } catch (err) {
      console.error('❌ Falha ao criar ObjectId:', err);
      return NextResponse.json({ erro: 'ID inválido' }, { status: 400 });
    }

    const motorista = await db
      .collection('melicages_motoristas')
      .findOne({ _id: objectId });
    console.log('📦 Motorista encontrado:', motorista ? 'sim' : 'não');

    if (!motorista) {
      return NextResponse.json({ erro: 'Motorista não encontrado' }, { status: 404 });
    }

    if (motorista.status !== 'aguardando') {
      return NextResponse.json(
        { erro: 'Motorista não está aguardando', statusAtual: motorista.status },
        { status: 400 }
      );
    }

    const agora = new Date();
    const tempoFila = Math.floor(
      (agora.getTime() - new Date(motorista.timestampChegada).getTime()) / 1000
    );

    await db.collection('melicages_motoristas').updateOne(
      { _id: objectId },
      {
        $set: {
          status: 'descarregando',
          timestampInicioDescarga: agora,
          tempoFila,
        },
      }
    );

    const atualizado = await db
      .collection('melicages_motoristas')
      .findOne({ _id: objectId });
    const { _id, ...rest } = atualizado!;

    return NextResponse.json({
      success: true,
      message: 'Descarga iniciada',
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