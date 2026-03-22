import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/lib/mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ motorista: string }> }
) {
  console.log('[API] GET /localizacoes/[motorista]');
  try {
    const { motorista } = await params;
    const db = await getDatabase();

    const localizacoes = await db
      .collection('melicages_localizacoes')
      .find({ motorista })
      .sort({ timestamp: -1 })
      .limit(100)
      .toArray();

    const data = localizacoes.map(({ _id, ...rest }) => ({
      id: _id.toString(),
      ...rest,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[API] GET /localizacoes/[motorista] error:', error);
    return NextResponse.json({ success: false, erro: 'Erro interno' }, { status: 500 });
  }
}