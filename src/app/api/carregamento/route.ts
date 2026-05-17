import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../lib/mongodb';
import { ObjectId } from 'mongodb';

function toISOString(value: any): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return '';
}

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

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const facility = searchParams.get('facility');
    const status = searchParams.get('status');
    const motoristaId = searchParams.get('motoristaId');
    const dataInicio = searchParams.get('dataInicio');
    const dataFim = searchParams.get('dataFim');

    const query: any = {};
    if (facility) query.facility = facility;
    if (status) query.status = status;
    if (motoristaId) query.motoristaId = motoristaId;

    if (dataInicio && dataFim) {
      const start = new Date(`${dataInicio}T00:00:00-03:00`).getTime();
      const end = new Date(`${dataFim}T23:59:59-03:00`).getTime();
      query.dataCriacao = { $gte: new Date(start), $lte: new Date(end) };
    }

    const skip = (page - 1) * limit;

    const carregamentos = await db.collection('carregamentos')
      .find(query)
      .sort({ dataCriacao: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await db.collection('carregamentos').countDocuments(query);

    // Serializa TODOS os campos (incluindo datas, ObjectIds e subobjetos )
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

export async function PUT(request: NextRequest) {
  try {
    const db = await getDatabase();
    const data = await request.json();
    const { motoristaId, ...updateData } = data;

    if (!motoristaId) {
      return NextResponse.json({ error: 'motoristaId é obrigatório' }, { status: 400 });
    }

    // Adiciona data de atualização
    updateData.dataAtualizacao = new Date();

    // Upsert: atualiza se existir, insere se não
    const result = await db.collection('carregamentos').updateOne(
      { motoristaId },
      { $set: updateData, $setOnInsert: { dataCriacao: new Date() } },
      { upsert: true }
    );

    // Recupera o documento atualizado para retornar
    const doc = await db.collection('carregamentos').findOne({ motoristaId });
    const serialized = serializeDocument(doc);

    return NextResponse.json({ success: true, data: serialized });
  } catch (error: any) {
    console.error('Erro no PUT /api/carregamento:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log('=== API CARREGAMENTO: Upsert por motoristaId ===');

  try {
    const db = await getDatabase();
    const data = await request.json();

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
    const agora = new Date();
    const agoraISO = agora.toISOString();

    const doc = await db.collection('carregamentos').findOneAndUpdate(
      { motoristaId },
      {
        $setOnInsert: {
          motoristaId,
          destino:   data.destino,
          facility:  data.facility,
          motorista: data.motorista,
          status:    'aguardando',
          timestamps: { aguardando: agoraISO }, // UTC — frontend exibe em Brasília
          dataCriacao: agora,
          numero: `CAR-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
        },
        $set: {
          dataAtualizacao: agora,
        },
      },
      { upsert: true, returnDocument: 'after' }
    );

    const serialized = serializeDocument(doc);

    const isNewDoc = doc?.status === 'aguardando' && !doc?.timestamps?.emDoca;
    console.log(
      isNewDoc
        ? `[API POST] Novo carregamento criado — motoristaId: ${motoristaId}`
        : `[API POST] Documento existente retornado — motoristaId: ${motoristaId}, status: ${doc?.status}`
    );

    return NextResponse.json(
      {
        success: true,
        message: isNewDoc ? 'Carregamento criado com sucesso' : 'Carregamento já existia, retornado sem alteração de status',
        data: serialized,
      },
      { status: isNewDoc ? 201 : 200 }
    );
  } catch (error: any) {
    console.error('❌ Erro ao criar/buscar carregamento:', error);
    return NextResponse.json({ error: 'Erro ao criar carregamento' }, { status: 500 });
  }
}