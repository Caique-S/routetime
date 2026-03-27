import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    const db = await getDatabase();
    const collection = db.collection('carregamentos');

    let filter = {};
    if (date) {
      const start = new Date(date);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setUTCHours(23, 59, 59, 999);
      filter = { dataCriacao: { $gte: start, $lte: end } };
    }

    const carregamentos = await collection.find(filter).toArray();
    return NextResponse.json(carregamentos);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 });
  }
}