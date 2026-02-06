import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../lib/mongodb';

export async function POST(request: NextRequest) {
  console.log('=== API CARREGAMENTO: Criando novo carregamento ===');
  
  try {
    const db = await getDatabase();
    const data = await request.json();
    
    console.log('Dados recebidos:', data);
    
    // Validar dados obrigatórios
    const requiredFields = ['destino', 'motorista', 'operadorId', 'facility'];
    for (const field of requiredFields) {
      if (!data[field]) {
        console.error(`❌ Campo obrigatório faltando: ${field}`);
        return NextResponse.json(
          { error: `Campo obrigatório faltando: ${field}` },
          { status: 400 }
        );
      }
    }
    
    // Buscar informações do CSV para completar dados
    const latestUpload = await db.collection('uploads_atribuicao')
      .findOne({}, { sort: { uploadDate: -1 } });
    
    let dadosMotorista = {};
    if (latestUpload?.data) {
      // Encontrar dados específicos do motorista no CSV
      const motoristaData = latestUpload.data.find((item: any) => 
        item['Nome do motorista principal'] === data.motorista &&
        item.destino === data.destino &&
        item.Facility === data.facility
      );
      
      if (motoristaData) {
        dadosMotorista = {
          tipoVeiculo: motoristaData['Tipo de veículo'],
          veiculoTracao: motoristaData['Veículo de tração'],
          placa: motoristaData['Placa'] || motoristaData['Placa do Cavalo'] || 'N/A',
          dataInicio: motoristaData['Data de início'] || new Date().toISOString(),
          transportadora: motoristaData['Transportadora'] || 'N/A'
        };
      }
    }
    
    // Criar carregamento
    const carregamento = {
      ...data,
      ...dadosMotorista,
      status: 'pendente',
      dataCriacao: new Date(),
      dataAtualizacao: new Date(),
      numero: `CAR-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
    };
    
    console.log('Inserindo carregamento:', carregamento);
    
    const result = await db.collection('carregamentos').insertOne(carregamento);
    
    console.log('✅ Carregamento criado com ID:', result.insertedId);
    
    return NextResponse.json({
      success: true,
      message: 'Carregamento criado com sucesso',
      data: {
        id: result.insertedId,
        numero: carregamento.numero,
        ...carregamento
      }
    });
    
  } catch (error: any) {
    console.error('❌ Erro ao criar carregamento:', error);
    console.error('Stack trace:', error.stack);
    
    return NextResponse.json(
      { 
        error: 'Erro ao criar carregamento',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const { searchParams } = new URL(request.url);
    
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const facility = searchParams.get('facility');
    const status = searchParams.get('status');
    
    const query: any = {};
    if (facility) query.facility = facility;
    if (status) query.status = status;
    
    const skip = (page - 1) * limit;
    
    const carregamentos = await db.collection('carregamentos')
      .find(query)
      .sort({ dataCriacao: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    
    const total = await db.collection('carregamentos').countDocuments(query);
    
    // Converter ObjectId para string
    const serialized = carregamentos.map(c => ({
      ...c,
      _id: c._id.toString()
    }));
    
    return NextResponse.json({
      success: true,
      data: serialized,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Erro ao buscar carregamentos:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar carregamentos' },
      { status: 500 }
    );
  }
}