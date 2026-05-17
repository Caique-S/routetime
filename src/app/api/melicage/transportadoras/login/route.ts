import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/lib/mongodb';
import { ObjectId } from 'mongodb';
import * as bcrypt from 'bcryptjs'; // ou outra lib de hash

export async function POST(request: NextRequest) {
  try {
    const { carrierId, password } = await request.json();
    if (!carrierId || !password) {
      return NextResponse.json(
        { success: false, erro: 'ID e senha são obrigatórios' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const transportadora = await db
      .collection('melicages_transportadoras')
      .findOne({ _id: new ObjectId(carrierId) });

    if (!transportadora) {
      return NextResponse.json(
        { success: false, erro: 'Transportadora não encontrada' },
        { status: 404 }
      );
    }

    const senhaValida = await bcrypt.compare(password, transportadora.senha);
    if (!senhaValida) {
      return NextResponse.json(
        { success: false, erro: 'Senha incorreta' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      carrier: { id: transportadora._id.toString(), nome: transportadora.nome },
    });
  } catch (error: any) {
    console.error('[API] POST /transportadoras/login error:', error);
    return NextResponse.json({ success: false, erro: 'Erro interno' }, { status: 500 });
  }
}