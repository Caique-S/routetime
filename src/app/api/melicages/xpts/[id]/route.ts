import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ success: false, erro: 'ID não fornecido' }, { status: 400 });

    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      return NextResponse.json({ success: false, erro: 'ID inválido' }, { status: 400 });
    }

    const db = await getDatabase();
    const body = await request.json();
    const { cidade, codigo, latitude, longitude, raio, origin } = body;

    if (!cidade || !codigo || latitude === undefined || longitude === undefined || raio === undefined) {
      return NextResponse.json(
        { success: false, erro: 'Campos obrigatórios: cidade, codigo, latitude, longitude, raio' },
        { status: 400 }
      );
    }

    const update = {
      $set: {
        cidade,
        codigo,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        raio: parseInt(raio, 10),
        origin: origin || '',
        updatedAt: new Date(),
      },
    };

    const result = await db.collection('melicages_xpts').updateOne({ _id: objectId }, update);

    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, erro: 'XPT não encontrado' }, { status: 404 });
    }

    const updated = await db.collection('melicages_xpts').findOne({ _id: objectId });
    const { _id, ...rest } = updated!;
    return NextResponse.json({ success: true, data: { id: _id.toString(), ...rest } });
  } catch (error: any) {
    console.error('PUT xpt error:', error);
    return NextResponse.json({ success: false, erro: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ success: false, erro: 'ID não fornecido' }, { status: 400 });

    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      return NextResponse.json({ success: false, erro: 'ID inválido' }, { status: 400 });
    }

    const db = await getDatabase();
    const result = await db.collection('melicages_xpts').deleteOne({ _id: objectId });

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, erro: 'XPT não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE xpt error:', error);
    return NextResponse.json({ success: false, erro: 'Erro interno' }, { status: 500 });
  }
}