import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/app/lib/mongodb';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const data           = await request.json();
    const { _id, ...updateData } = data;

    const db     = await getDatabase();
    const result = await db
      .collection('carregamentos')
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PUT /api/expedicao/[id]]', error);
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 });
  }
}

/**
 * DELETE /api/expedicao/[id]
 *
 * Remove um carregamento pelo _id.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const db     = await getDatabase();
    const result = await db
      .collection('carregamentos')
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/expedicao/[id]]', error);
    return NextResponse.json({ error: 'Erro ao deletar' }, { status: 500 });
  }
}