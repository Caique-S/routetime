import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/lib/mongodb';
import { ObjectId } from 'mongodb';

// ── Helper: resolve filtro por ObjectId (quando vem do frontend como id)
//            ou por CPF (quando vem do app mobile) ────────────────────────────
function buildFilter(param: string) {
  // ObjectId tem exatamente 24 caracteres hexadecimais
  if (/^[a-f\d]{24}$/i.test(param)) {
    return { _id: new ObjectId(param) };
  }
  // Caso contrário trata como CPF (remove formatação por segurança)
  return { cpf: param.replace(/\D/g, '') };
}

// ── GET /api/melicages/motoristas/cadastro/[cpf] ───────────────────────────── 
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cpf: string }> }
) {
  console.log('[API] GET /motoristas/cadastro/[cpf]');
  try {
    const { cpf } = await params;
    const db = await getDatabase();
    const motorista = await db
      .collection('melicages_motoristas_cadastro')
      .findOne(buildFilter(cpf));

    if (!motorista) {
      return NextResponse.json(
        { success: false, erro: 'Motorista não encontrado' },
        { status: 404 }
      );
    }

    const { _id, ...rest } = motorista;
    return NextResponse.json({ success: true, data: { id: _id.toString(), ...rest } });
  } catch (error: any) {
    console.error('[API] GET /motoristas/cadastro/[cpf] error:', error);
    return NextResponse.json({ success: false, erro: 'Erro interno' }, { status: 500 });
  }
}

// ── PUT /api/melicages/motoristas/cadastro/[cpf] ──────────────────────────────
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ cpf: string }> }
) {
  console.log('[API] PUT /motoristas/cadastro/[cpf]');
  try {
    const { cpf } = await params;
    const body = await request.json();

    // Campos permitidos para atualização
    const { nome, telefone, email, origem, destino_xpt } = body;
    // CPF formatado vindo do frontend → salva sem máscara
    const cpfNovo = body.cpf ? body.cpf.replace(/\D/g, '') : undefined;

    const update: Record<string, any> = {};
    if (nome        !== undefined) update.nome        = nome;
    if (cpfNovo     !== undefined) update.cpf         = cpfNovo;
    if (telefone    !== undefined) update.telefone    = telefone;
    if (email       !== undefined) update.email       = email;
    if (origem      !== undefined) update.origem      = origem;
    // destino_xpt pode ser string vazia (para limpar), então checa undefined explicitamente
    if (destino_xpt !== undefined) update.destino_xpt = destino_xpt;

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { success: false, erro: 'Nenhum campo para atualizar' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const collection = db.collection('melicages_motoristas_cadastro');

    const result = await collection.updateOne(
      buildFilter(cpf),
      { $set: update }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, erro: 'Motorista não encontrado' },
        { status: 404 }
      );
    }

    // Retorna documento atualizado
    const updated = await collection.findOne(buildFilter(cpf));
    const { _id, ...rest } = updated!;

    console.log(`[API] Motorista atualizado — param: ${cpf}`);
    return NextResponse.json({ success: true, data: { id: _id.toString(), ...rest } });
  } catch (error: any) {
    console.error('[API] PUT /motoristas/cadastro/[cpf] error:', error);
    return NextResponse.json(
      { success: false, erro: 'Erro interno', message: error.message },
      { status: 500 }
    );
  }
}

// ── DELETE /api/melicages/motoristas/cadastro/[cpf] ───────────────────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ cpf: string }> }
) {
  console.log('[API] DELETE /motoristas/cadastro/[cpf]');
  try {
    const { cpf } = await params;
    const db = await getDatabase();

    const result = await db
      .collection('melicages_motoristas_cadastro')
      .deleteOne(buildFilter(cpf));

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, erro: 'Motorista não encontrado' },
        { status: 404 }
      );
    }

    console.log(`[API] Motorista excluído — param: ${cpf}`);
    return NextResponse.json({ success: true, message: 'Motorista excluído com sucesso' });
  } catch (error: any) {
    console.error('[API] DELETE /motoristas/cadastro/[cpf] error:', error);
    return NextResponse.json(
      { success: false, erro: 'Erro interno', message: error.message },
      { status: 500 }
    );
  }
}