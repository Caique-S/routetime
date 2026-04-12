import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/lib/mongodb';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

// GET: listar todas (já existente)
export async function GET() {
  try {
    const db = await getDatabase();
    const transportadoras = await db
      .collection('melicages_transportadoras')
      .find({}, { projection: { _id: 1, nome: 1 } })
      .sort({ nome: 1 })
      .toArray();

    const data = transportadoras.map(({ _id, nome }) => ({
      id: _id.toString(),
      nome,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[API] GET /transportadoras error:', error);
    return NextResponse.json({ success: false, erro: 'Erro interno' }, { status: 500 });
  }
}

// POST: criar nova transportadora
export async function POST(request: NextRequest) {
  try {
    const { nome, senha } = await request.json();

    if (!nome || !senha) {
      return NextResponse.json(
        { success: false, erro: 'Nome e senha são obrigatórios' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const collection = db.collection('melicages_transportadoras');

    // Verifica se já existe uma transportadora com o mesmo nome
    const existente = await collection.findOne({ nome });
    if (existente) {
      return NextResponse.json(
        { success: false, erro: 'Já existe uma transportadora com este nome' },
        { status: 409 }
      );
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(senha, 10);

    const novaTransportadora = {
      nome,
      senha: hashedPassword,
      createdAt: new Date(),
    };

    const result = await collection.insertOne(novaTransportadora);
    const data = {
      id: result.insertedId.toString(),
      nome: novaTransportadora.nome,
      createdAt: novaTransportadora.createdAt,
    };

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error: any) {
    console.error('[API] POST /transportadoras error:', error);
    return NextResponse.json({ success: false, erro: 'Erro interno' }, { status: 500 });
  }
}