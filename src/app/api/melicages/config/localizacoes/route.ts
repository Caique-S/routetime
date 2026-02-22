import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/lib/mongodb';

export async function GET() {
  try {
    const db = await getDatabase();
    const config = await db.collection('melicages_localizacoes_config').findOne({});
    if (!config) {
      return NextResponse.json(
        { success: false, erro: 'Configuração de localização não encontrada' },
        { status: 404 }
      );
    }
    const { _id, ...rest } = config;
    return NextResponse.json({ success: true, data: { ...rest, id: _id.toString() } });
  } catch (error: any) {
    console.error('GET config/localizacao error:', error);
    return NextResponse.json(
      { success: false, erro: 'Erro interno', detalhes: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const db = await getDatabase();
    const body = await request.json();
    const { coo_lat, coo_lon, raio, origin } = body;

    if (coo_lat === undefined || coo_lon === undefined || raio === undefined) {
      return NextResponse.json(
        { success: false, erro: 'Campos obrigatórios: coo_lat, coo_lon, raio' },
        { status: 400 }
      );
    }

    // Upsert: atualiza ou cria o documento único
    await db.collection('melicages_localizacoes_config').updateOne(
      {},
      {
        $set: {
          coo_lat: parseFloat(coo_lat),
          coo_lon: parseFloat(coo_lon),
          raio: parseInt(raio, 10),
          origin: origin || '',
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    const updated = await db.collection('melicages_localizacoes_config').findOne({});
    const { _id, ...rest } = updated!;
    return NextResponse.json({ success: true, data: { ...rest, id: _id.toString() } });
  } catch (error: any) {
    console.error('PUT config/localizacao error:', error);
    return NextResponse.json(
      { success: false, erro: 'Erro interno', detalhes: error.message },
      { status: 500 }
    );
  }
}