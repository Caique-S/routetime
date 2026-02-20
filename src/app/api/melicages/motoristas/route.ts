import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

function serializeDocument(doc: any): any {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { ...rest, id: _id.toString() };
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDatabase();
    const { nome } = await request.json();
    if (!nome) return NextResponse.json({ erro: 'Nome é obrigatório' }, { status: 400 });

    const agora = new Date();
    const motorista = {
      nome,
      status: 'aguardando',
      dataChegada: agora.toLocaleDateString('pt-BR'),
      horaChegada: agora.toLocaleTimeString('pt-BR'),
      timestampChegada: agora,
      tempoFila: 0,
      tempoDescarga: 0,
      timestampInicioDescarga: null,
      timestampFimDescarga: null,
    };

    const result = await db.collection('melicages_motoristas').insertOne(motorista);
    const novoMotorista = { ...motorista, _id: result.insertedId };

    return NextResponse.json({
      success: true,
      message: 'Chegada registrada com sucesso',
      data: serializeDocument(novoMotorista),
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ erro: 'Erro interno', detalhes: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const filtro = status ? { status } : {};

    const motoristas = await db.collection('melicages_motoristas')
      .find(filtro)
      .sort({ timestampChegada: -1 })
      .limit(100)
      .toArray();

    const serialized = motoristas.map(serializeDocument);
    return NextResponse.json({ success: true, count: serialized.length, data: serialized });
  } catch (error: any) {
    return NextResponse.json({ erro: 'Erro interno', detalhes: error.message }, { status: 500 });
  }
}