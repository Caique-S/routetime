import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/lib/mongodb';

export async function GET() {
  console.log('[API] GET /config/motoristas');
  try {
    const db = await getDatabase();
    const config = await db.collection('melicages_motoristas_config').findOne({});
    if (!config) {
      return NextResponse.json(
        { success: false, erro: 'Configuração de motoristas não encontrada' },
        { status: 404 }
      );
    }
    const { _id, ...rest } = config;
    return NextResponse.json({ success: true, data: { ...rest, id: _id.toString() } });
  } catch (error: any) {
    console.error('[API] GET /config/motoristas error:', error);
    return NextResponse.json({ success: false, erro: 'Erro interno' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  console.log('[API] PUT /config/motoristas');
  try {
    const db = await getDatabase();
    const body = await request.json();
    const { refresh_list, monitoramento, refresh_route, tracking_list } = body;

    if (refresh_list === undefined || monitoramento === undefined || refresh_route === undefined) {
      return NextResponse.json(
        { success: false, erro: 'Campos obrigatórios: refresh_list, monitoramento, refresh_route' },
        { status: 400 }
      );
    }

    const update: any = {
      refresh_list: parseInt(refresh_list, 10),
      monitoramento: !!monitoramento,
      refresh_route: parseInt(refresh_route, 10),
      updatedAt: new Date(),
    };

    if (tracking_list !== undefined) {
      if (!Array.isArray(tracking_list)) {
        return NextResponse.json(
          { success: false, erro: 'tracking_list deve ser um array' },
          { status: 400 }
        );
      }
      update.tracking_list = tracking_list.map(String);
    }

    await db.collection('melicages_motoristas_config').updateOne(
      {},
      { $set: update },
      { upsert: true }
    );

    const updated = await db.collection('melicages_motoristas_config').findOne({});
    const { _id, ...rest } = updated!;
    return NextResponse.json({ success: true, data: { ...rest, id: _id.toString() } });
  } catch (error: any) {
    console.error('[API] PUT /config/motoristas error:', error);
    return NextResponse.json({ success: false, erro: 'Erro interno' }, { status: 500 });
  }
}