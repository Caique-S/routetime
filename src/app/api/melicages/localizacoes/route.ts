import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../lib/mongodb';

function serializeDocument(doc: any): any {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { ...rest, id: _id.toString() };
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDatabase();
    const { motorista, latitude, longitude, timestamp } = await request.json();

    if (!motorista || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ erro: 'Campos obrigatórios: motorista, latitude, longitude' }, { status: 400 });
    }

    const localizacao = {
      motorista,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    };

    const result = await db.collection('melicages_localizacoes').insertOne(localizacao);
    const nova = { ...localizacao, _id: result.insertedId };

    return NextResponse.json({ success: true, message: 'Localização recebida', data: serializeDocument(nova) }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ erro: 'Erro interno', detalhes: error.message }, { status: 500 });
  }
}