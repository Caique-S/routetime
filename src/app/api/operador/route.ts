import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  console.log('=== API OPERADOR: Buscando operador ===');
  
  try {
    // Obter parâmetros da URL
    const { searchParams } = new URL(request.url);
    const operadorId = searchParams.get('id');
    
    console.log('Parâmetros recebidos:', { operadorId });
    
    if (!operadorId) {
      console.error('❌ ID do operador não fornecido');
      return NextResponse.json(
        { error: 'ID do operador é obrigatório' },
        { status: 400 }
      );
    }

    // Conectar ao banco de dados
    console.log('Conectando ao banco de dados...');
    const db = await getDatabase();
    console.log('✅ Conectado ao banco:', db.databaseName);

    // Verificar se o ID é um ObjectId válido
    if (!ObjectId.isValid(operadorId)) {
      console.error('❌ ID não é um ObjectId válido:', operadorId);
      return NextResponse.json(
        { error: 'ID do operador inválido' },
        { status: 400 }
      );
    }

    // Buscar operador pelo _id
    const objectId = new ObjectId(operadorId);
    const operador = await db.collection('operadores').findOne({ 
      _id: objectId 
    });

    console.log('Resultado da busca:', operador);

    if (!operador) {
      console.error('❌ Operador não encontrado');
      return NextResponse.json(
        { error: 'Operador não encontrado' },
        { status: 404 }
      );
    }

    // Formatar a resposta
    const responseData = {
      id: operador._id.toString(),
      operador: {
        nome: operador.nome || 'Operador',
        cargo: operador.cargo || 'Operador de Expedição',
        dataDeCadastro: operador.dataDeCadastro 
          ? new Date(operador.dataDeCadastro).toISOString() 
          : new Date().toISOString(),
        // Incluir outros campos úteis
        codigo: operador.codigo || '',
        email: operador.email || '',
        telefone: operador.telefone || ''
      },
    };

    console.log('✅ Operador encontrado:', responseData.operador.nome);
    
    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('❌ Erro ao buscar operador:', error);
    console.error('Stack trace:', error.stack);
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// Método POST para criar operador
export async function POST(request: NextRequest) {
  console.log('=== API OPERADOR: Criando operador ===');
  
  try {
    const db = await getDatabase();
    const data = await request.json();
    
    console.log('Dados recebidos:', data);
    
    // Validar dados obrigatórios
    if (!data.nome) {
      return NextResponse.json(
        { error: 'Nome do operador é obrigatório' },
        { status: 400 }
      );
    }
    
    // Criar operador (o _id será gerado automaticamente pelo MongoDB)
    const operadorData = {
      nome: data.nome,
      cargo: data.cargo || 'Operador',
      dataDeCadastro: new Date(),
      codigo: data.codigo || `OP${Date.now().toString().slice(-6)}`,
      email: data.email || '',
      telefone: data.telefone || '',
      ativo: data.ativo !== undefined ? data.ativo : true,
      permissoes: data.permissoes || ['expedicao', 'visualizacao'],
      ultimoAcesso: null,
      criadoEm: new Date(),
      atualizadoEm: new Date()
    };
    
    console.log('Inserindo operador:', operadorData);
    
    const result = await db.collection('operadores').insertOne(operadorData);
    
    console.log('✅ Operador criado com ID:', result.insertedId);
    
    return NextResponse.json({
      success: true,
      id: result.insertedId,
      codigo: operadorData.codigo,
      message: 'Operador criado com sucesso',
      data: {
        ...operadorData,
        _id: result.insertedId
      }
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('❌ Erro ao criar operador:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro ao criar operador',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}