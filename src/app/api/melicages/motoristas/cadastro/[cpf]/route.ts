import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/lib/mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cpf: string }> }
) {
  console.log('[API] GET /motoristas/cadastro/[cpf]');
  try {
    const { cpf } = await params;
    const db = await getDatabase();
    const motorista = await db.collection('melicages_motoristas_cadastro').findOne({ cpf });

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