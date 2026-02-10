import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const client = new MongoClient(uri);

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    await client.connect();
    const database = client.db('brj_transportes');
    const collection = database.collection('informacoes_carregamento');
    
    // Adicionar data de criação
    const dadosCompletos = {
      ...data,
      dataCriacao: new Date(),
      dataAtualizacao: new Date()
    };
    
    const result = await collection.insertOne(dadosCompletos);
    
    return NextResponse.json({
      success: true,
      message: 'Informações salvas com sucesso',
      id: result.insertedId
    });
    
  } catch (error) {
    console.error('Erro ao salvar informações:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar informações' },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}