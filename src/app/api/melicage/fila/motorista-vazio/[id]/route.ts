import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { inicioViagem, doca, gaiolas, palets, mangas, transportadora } = body;

    if (!id) {
      return NextResponse.json({ message: 'ID do registro não fornecido.' }, { status: 400 });
    }

    const db = await getDatabase('brj_transportes');
    const collection = db.collection('melicages_motoristas');

    const camposAtualizados: any = {};
    if (inicioViagem) camposAtualizados.inicioViagem = inicioViagem;
    if (doca !== undefined) camposAtualizados.doca = doca;
    if (gaiolas !== undefined) camposAtualizados.gaiolas = gaiolas;
    if (palets !== undefined) camposAtualizados.palets = palets;
    if (mangas !== undefined) camposAtualizados.mangas = mangas;
    if (transportadora !== undefined) camposAtualizados.transportadora = transportadora;

     if (Object.keys(camposAtualizados).length === 0) {
      return NextResponse.json({ message: 'Nenhum campo válido para atualização foi enviado.' }, { status: 400 });
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: camposAtualizados }
    );

    return NextResponse.json({ message: `Registro atualizado com sucesso..: ${result}` }, { status: 200 });

  } catch (error: any) {
    console.error('[ERRO] PATCH /api/fila/motorista-vazio/[id]', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor', error: error.message },
      { status: 500 }
    );
  }
}