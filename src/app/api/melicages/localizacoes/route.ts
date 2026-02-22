import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const db = await getDatabase();
    const { motorista, latitude, longitude, timestamp } = await request.json();

    if (!motorista || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { success: false, erro: 'Campos obrigatórios: motorista, latitude, longitude' },
        { status: 400 }
      );
    }

    const localizacao = {
      motorista,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    };

    const result = await db.collection('melicages_localizacoes').insertOne(localizacao);
    const nova = { ...localizacao, id: result.insertedId.toString() };

    return NextResponse.json({ success: true, data: nova }, { status: 201 });
  } catch (error: any) {
    console.error('POST localizacoes error:', error);
    return NextResponse.json(
      { success: false, erro: 'Erro interno', detalhes: error.message },
      { status: 500 }
    );
  }
}