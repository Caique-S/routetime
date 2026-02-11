import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../lib/mongodb';

export async function POST(request: NextRequest) {
  console.log('=== API CARREGAMENTO: Criando novo carregamento ===');
  
  try {
    const db = await getDatabase();
    const data = await request.json();
    
    console.log('Dados recebidos:', data);
    
    // --- Validação simplificada e compatível com o frontend ---
    if (!data.destino) {
      return NextResponse.json({ error: 'Destino é obrigatório' }, { status: 400 });
    }
    if (!data.facility) {
      return NextResponse.json({ error: 'Facility é obrigatória' }, { status: 400 });
    }
    if (!data.motorista || !data.motorista.nome) {
      return NextResponse.json({ error: 'Dados do motorista incompletos' }, { status: 400 });
    }
    
   const motoristaId = `${data.destino}_${data.facility}_${data.motorista.nome}_${data.motorista.travelId}`;

    const carregamento = {
      ...data,
      motoristaId,
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
    return NextResponse.json(
      { error: 'Erro ao criar carregamento' },
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
    const motoristaId = searchParams.get('motoristaId')

    
    const query: any = {};
    if (facility) query.facility = facility;
    if (status) query.status = status;
    if (motoristaId) query.motoristaId = motoristaId;
    
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