import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/mongodb';

function serializeDocument(doc: any): any {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { ...rest, id: _id.toString() };
}

export async function GET(request: NextRequest, { params }: { params: { motorista: string } }) {
  try {
    const db = await getDatabase();
    const { motorista } = params;

    const localizacoes = await db.collection('melicages_localizacoes')
      .find({ motorista })
      .sort({ timestamp: -1 })
      .limit(100)
      .toArray();

    const serialized = localizacoes.map(serializeDocument);
    return NextResponse.json({ success: true, count: serialized.length, data: serialized });
  } catch (error: any) {
    return NextResponse.json({ erro: 'Erro interno', detalhes: error.message }, { status: 500 });
  }
}