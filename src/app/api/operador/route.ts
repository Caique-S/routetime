import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  console.log('=== API OPERADOR: GET ===');
  
  try {
    const { searchParams } = new URL(request.url);
    const operadorId = searchParams.get('id');
    
    const db = await getDatabase();
    const collection = db.collection('operadores');
    
    // Se foi passado um ID, busca um operador específico
    if (operadorId) {
      console.log('Buscando operador por ID:', operadorId);
      
      if (!ObjectId.isValid(operadorId)) {
        return NextResponse.json({ error: 'ID do operador inválido' }, { status: 400 });
      }
      
      const operador = await collection.findOne({ _id: new ObjectId(operadorId) });
      if (!operador) {
        return NextResponse.json({ error: 'Operador não encontrado' }, { status: 404 });
      }
      
      const responseData = {
        id: operador._id.toString(),
        operador: {
          nome: operador.nome || 'Operador',
          cargo: operador.cargo || 'Operador de Expedição',
          dataDeCadastro: operador.dataDeCadastro 
            ? new Date(operador.dataDeCadastro).toISOString() 
            : new Date().toISOString(),
          codigo: operador.codigo || '',
          email: operador.email || '',
          telefone: operador.telefone || '',
          permissoes: operador.permissoes || ''
        },
      };
      return NextResponse.json(responseData);
    }
    
    // Se não foi passado ID, retorna a lista de todos os operadores
    console.log('Buscando todos os operadores');
    const operadores = await collection.find({}).sort({ dataDeCadastro: -1 }).toArray();
    
    const operadoresFormatados = operadores.map(op => ({
      _id: op._id.toString(),
      nome: op.nome,
      cargo: op.cargo,
      codigo: op.codigo,
      cpf: op.cpf,
      matricula: op.matricula,
      email: op.email,
      telefone: op.telefone,
      permissoes: op.permissoes,
      ativo: op.ativo,
      dataDeCadastro: op.dataDeCadastro ? new Date(op.dataDeCadastro).toISOString() : new Date().toISOString(),
    }));
    
    return NextResponse.json({
      success: true,
      data: operadoresFormatados,
    });
    
  } catch (error: any) {
    console.error('❌ Erro no GET /api/operador:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error.message },
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
      cargo: data.cargo || 'Dispatch',
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