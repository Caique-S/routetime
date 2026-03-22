import { NextResponse } from 'next/server';
import { getDatabase } from '@/app/lib/mongodb';

export async function GET() {
  try {
    const db = await getDatabase('brj_transportes');
    const collection = db.collection('uploads_atribuicao');

    // Busca o documento mais recente ordenado por uploadDate decrescente
    const latest = await collection
      .find({})
      .sort({ uploadDate: -1 })
      .limit(1)
      .toArray();

    if (!latest || latest.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhum upload encontrado' },
        { status: 404 }
      );
    }

    const upload = latest[0];
    return NextResponse.json({
      success: true,
      data: upload.data || [],
      uploadDate: upload.uploadDate,
    });
  } catch (error: any) {
    console.error('Erro em GET /api/upload/latest:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno', message: error.message },
      { status: 500 }
    );
  }
}