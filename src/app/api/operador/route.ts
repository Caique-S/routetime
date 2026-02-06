import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Operador } from '@/models/Operador';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const searchParams = request.nextUrl.searchParams;
    const operadorId = searchParams.get('id');
    
    if (!operadorId) {
      return NextResponse.json(
        { error: 'ID do operador é obrigatório' },
        { status: 400 }
      );
    }

    const operador = await Operador.findById(operadorId);
    
    if (!operador) {
      return NextResponse.json(
        { error: 'Operador não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: operador._id,
      operador: {
        nome: operador.nome,
        cargo: operador.cargo,
        dataDeCadastro: operador.dataDeCadastro,
      },
      registro: {}
    });
  } catch (error) {
    console.error('Erro ao buscar operador:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}