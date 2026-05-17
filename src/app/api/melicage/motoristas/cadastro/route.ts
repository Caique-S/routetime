import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/lib/mongodb';


export async function GET(request: NextRequest) {
  const transportadoraId = request.headers.get('x-transportadora-id');
  if (!transportadoraId) {
    return NextResponse.json({ success: false, erro: 'Não autenticado' }, { status: 401 });
  }

  try {
    const db = await getDatabase();
    const motoristas = await db
      .collection('melicages_motoristas_cadastro')
      .find({
        $or: [
          { transportadora_id: transportadoraId },
          { transportadora_id: { $exists: false } } // inclui antigos sem campo
        ]
      })
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
  const transportadoraId = request.headers.get('x-transportadora-id');
  if (!transportadoraId) {
    return NextResponse.json({ success: false, erro: 'Não autenticado' }, { status: 401 });
  }

  try {
    const db = await getDatabase();
    const { nome, cpf, telefone, email, origem, destino_xpt } = await request.json();

    if (!nome || !cpf || !telefone || !email || !origem) {
      return NextResponse.json(
        { success: false, erro: 'Campos obrigatórios: nome, cpf, telefone, email, origem' },
        { status: 400 }
      );
    }

    const cpfLimpo = cpf.replace(/\D/g, '');

    // Verifica se CPF já está cadastrado para esta transportadora
    const existente = await db.collection('melicages_motoristas_cadastro').findOne({
      cpf: cpfLimpo,
      transportadora_id: transportadoraId
    });
    if (existente) {
      return NextResponse.json({ success: false, erro: 'CPF já cadastrado nesta transportadora' }, { status: 409 });
    }

    // Geração da chave única (opcional)
    const partes = [nome, origem, destino_xpt].filter(Boolean).join('_');
    const baseChave = partes.replace(/\s+/g, '_');
    let chave_identificacao = baseChave;
    let contador = 1;
    while (
      await db
        .collection('melicages_motoristas_cadastro')
        .findOne({ chave_identificacao, transportadora_id: transportadoraId })
    ) {
      chave_identificacao = `${baseChave}_${contador}`;
      contador++;
    }

    const novo = {
      nome,
      cpf: cpfLimpo,
      telefone,
      email,
      origem,
      destino_xpt: destino_xpt ?? '',
      chave_identificacao,
      transportadora_id: transportadoraId,
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