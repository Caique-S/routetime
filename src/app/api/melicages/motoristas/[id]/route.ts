import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET /api/melicages/motoristas/[id] (buscar um motorista da fila)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDatabase();
    const objectId = new ObjectId(id);
    const motorista = await db.collection('melicages_motoristas').findOne({ _id: objectId });

    if (!motorista) {
      return NextResponse.json({ success: false, erro: 'Motorista não encontrado' }, { status: 404 });
    }

    const { _id, ...rest } = motorista;
    return NextResponse.json({ success: true, data: { id: _id.toString(), ...rest } });
  } catch (error: any) {
    return NextResponse.json({ success: false, erro: error.message }, { status: 500 });
  }
}

// PATCH /api/melicages/motoristas/[id] (atualização genérica – usada para doca)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDatabase();
    const objectId = new ObjectId(id);
    const body = await request.json();

    // Permite apenas atualizar campos específicos (evita alterações indevidas)
    const allowed = ['doca'];
    const update: any = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        update[key] = body[key];
      }
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: false, erro: 'Nenhum campo válido para atualização' }, { status: 400 });
    }

    update.updatedAt = new Date();

    const result = await db.collection('melicages_motoristas').updateOne(
      { _id: objectId },
      { $set: update }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, erro: 'Motorista não encontrado' }, { status: 404 });
    }

    const updated = await db.collection('melicages_motoristas').findOne({ _id: objectId });
    const { _id, ...rest } = updated!;
    return NextResponse.json({ success: true, data: { id: _id.toString(), ...rest } });
  } catch (error: any) {
    return NextResponse.json({ success: false, erro: error.message }, { status: 500 });
  }
}