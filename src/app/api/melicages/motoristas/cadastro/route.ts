import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/lib/mongodb';

export async function GET() {
  console.log('[API] GET /motoristas/cadastro');
  try {
    const db = await getDatabase();
    const motoristas = await db
      .collection('melicages_motoristas_cadastro')
      .find({})
      .sort({ nome: 1 })
      .toArray();
    const data = motoristas.map(({ _id, ...rest }) => ({ id: _id.toString(), ...rest }));
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[API] GET /motoristas/cadastro error:', error);
    return NextResponse.json({ success: false, erro: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log('[API] POST /motoristas/cadastro');
  try {
    const db = await getDatabase();
    const { nome, cpf, telefone, email, origem, destino_xpt } = await request.json();

    if (!nome || !cpf || !telefone || !email || !origem || !destino_xpt) {
      return NextResponse.json(
        { success: false, erro: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

    const existente = await db.collection('melicages_motoristas_cadastro').findOne({ cpf });
    if (existente) {
      return NextResponse.json({ success: false, erro: 'CPF já cadastrado' }, { status: 409 });
    }

    // Gerar chave de identificação única
    const baseChave = `${nome}_${origem}_${destino_xpt}`.replace(/\s+/g, '_');
    let chave_identificacao = baseChave;
    let contador = 1;
    while (await db.collection('melicages_motoristas_cadastro').findOne({ chave_identificacao })) {
      chave_identificacao = `${baseChave}_${contador}`;
      contador++;
    }

    const novo = {
      nome,
      cpf,
      telefone,
      email,
      origem,
      destino_xpt,
      chave_identificacao,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('melicages_motoristas_cadastro').insertOne(novo);
    const data = { id: result.insertedId.toString(), ...novo };
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error: any) {
    console.error('[API] POST /motoristas/cadastro error:', error);
    return NextResponse.json({ success: false, erro: 'Erro interno' }, { status: 500 });
  }
}