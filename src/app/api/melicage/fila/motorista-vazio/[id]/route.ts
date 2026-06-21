import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../lib/mongodb';
import { dbFirestore, FIRESTORE_COLLECTION } from '../../../../../lib/firebaseAdmin';
import { ObjectId } from 'mongodb';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({ message: 'ID do registro não fornecido.' }, { status: 400 });
    }

    const db = await getDatabase('brj_transportes');
    const collection = db.collection('melicages_motoristas');

    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ message: 'Registro não encontrado no sistema.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Registro removido da fila com sucesso.' }, { status: 200 });

  } catch (error: any) {
    console.error('[ERRO] DELETE /api/fila/motorista-vazio/[id]', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor', error: error.message },
      { status: 500 }
    );
  }
}


export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const { status, doca, gaiolas, palets, mangas } = body;

    if (!id) {
      return NextResponse.json({ message: 'ID do registro não fornecido.' }, { status: 400 });
    }

    const db = await getDatabase('brj_transportes');
    const collection = db.collection('melicages_motoristas');

    const camposAtualizados: any = {};
    if (status) camposAtualizados.status = status;
    if (doca !== undefined) camposAtualizados.doca = doca;
    if (gaiolas !== undefined) camposAtualizados.gaiolas = gaiolas;
    if (palets !== undefined) camposAtualizados.palets = palets;
    if (mangas !== undefined) camposAtualizados.mangas = mangas;

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: camposAtualizados }
    );

    return NextResponse.json({ message: 'Registro atualizado com sucesso.' }, { status: 200 });

  } catch (error: any) {
    console.error('[ERRO] PUT /api/fila/motorista-vazio/[id]', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor', error: error.message },
      { status: 500 }
    );
  }
}