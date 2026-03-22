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

    // destino_xpt é OPCIONAL — não entra na validação obrigatória
    if (!nome || !cpf || !telefone || !email || !origem) {
      return NextResponse.json(
        { success: false, erro: 'Campos obrigatórios: nome, cpf, telefone, email, origem' },
        { status: 400 }
      );
    }

    // CPF salvo sem formatação
    const cpfLimpo = cpf.replace(/\D/g, '');

    const existente = await db
      .collection('melicages_motoristas_cadastro')
      .findOne({ cpf: cpfLimpo });
    if (existente) {
      return NextResponse.json({ success: false, erro: 'CPF já cadastrado' }, { status: 409 });
    }

    // chave_identificacao baseada em nome + origem + destino (se houver)
    const partes = [nome, origem, destino_xpt].filter(Boolean).join('_');
    const baseChave = partes.replace(/\s+/g, '_');
    let chave_identificacao = baseChave;
    let contador = 1;
    while (
      await db
        .collection('melicages_motoristas_cadastro')
        .findOne({ chave_identificacao })
    ) {
      chave_identificacao = `${baseChave}_${contador}`;
      contador++;
    }

    const novo = {
      nome,
      cpf: cpfLimpo,          // salva sem máscara — padrão do sistema
      telefone,
      email,
      origem,
      destino_xpt: destino_xpt ?? '',   // string vazia quando não informado
      chave_identificacao,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('melicages_motoristas_cadastro').insertOne(novo);
    const data = { id: result.insertedId.toString(), ...novo };

    console.log(`[API] Motorista cadastrado — id: ${data.id}, nome: ${nome}`);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error: any) {
    console.error('[API] POST /motoristas/cadastro error:', error);
    return NextResponse.json({ success: false, erro: 'Erro interno' }, { status: 500 });
  }
}