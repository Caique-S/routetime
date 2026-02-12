import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../lib/mongodb';
import { ObjectId } from 'mongodb';

// ------------------------------------------------------------
// Utilitário para converter qualquer valor para string ISO
// Se for Date, converte; se for string, mantém; caso contrário, retorna vazio
// ------------------------------------------------------------
function toISOString(value: any): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return '';
}

// ------------------------------------------------------------
// Serialização profunda para converter todos os campos Date em string ISO
// ------------------------------------------------------------
function serializeDocument(doc: any): any {
  if (!doc) return doc;
  const result: any = Array.isArray(doc) ? [] : {};

  for (const [key, value] of Object.entries(doc)) {
    if (value instanceof Date) {
      result[key] = value.toISOString();
    } else if (value instanceof ObjectId) {
      result[key] = value.toString();
    } else if (value && typeof value === 'object') {
      result[key] = serializeDocument(value); // recursão para subobjetos
    } else {
      result[key] = value;
    }
  }
  return result;
}

// ------------------------------------------------------------
// POST - Criação de carregamento
// ------------------------------------------------------------
export async function POST(request: NextRequest) {
  console.log('=== API CARREGAMENTO: Criando novo carregamento ===');

  try {
    const db = await getDatabase();
    const data = await request.json();

    console.log('Dados recebidos:', data);

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
      dataCriacao: data.dataCriacao ? new Date(data.dataCriacao) : new Date(),
      dataAtualizacao: new Date(),
      numero: `CAR-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
    };

    console.log('Inserindo carregamento:', carregamento);

    const result = await db.collection('carregamentos').insertOne(carregamento);

    console.log('✅ Carregamento criado com ID:', result.insertedId);

    // Retorna o documento serializado
    const insertedDoc = await db.collection('carregamentos').findOne({ _id: result.insertedId });
    const serialized = serializeDocument(insertedDoc);

    return NextResponse.json({
      success: true,
      message: 'Carregamento criado com sucesso',
      data: serialized
    });

  } catch (error: any) {
    console.error('❌ Erro ao criar carregamento:', error);
    return NextResponse.json(
      { error: 'Erro ao criar carregamento' },
      { status: 500 }
    );
  }
}

// ------------------------------------------------------------
// GET - Listagem de carregamentos com filtros opcionais
// ------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const facility = searchParams.get('facility');
    const status = searchParams.get('status');
    const motoristaId = searchParams.get('motoristaId');

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

    // Serializa TODOS os campos (incluindo datas, ObjectIds e subobjetos)
    const serialized = carregamentos.map((c) => serializeDocument(c));

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