import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/lib/mongodb';
import { criarIntervaloDia } from '@/app/lib/utils/dateUtils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    const db = await getDatabase();

    const filter: Record<string, unknown> = {};
    if (date) {
      const { start, end } = criarIntervaloDia(date);
      filter.dataCriacao = { $gte: start, $lte: end };
    }

    const carregamentos = await db
      .collection('carregamentos')
      .find(filter)
      .toArray();

    return NextResponse.json(carregamentos);
  } catch (error) {
    console.error('[GET /api/expedicao]', error);
    return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 });
  }
}