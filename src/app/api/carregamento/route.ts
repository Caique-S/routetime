import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/lib/mongodb';
import { serializeDocument } from '@/app/lib/utils/serialize';
import { criarIntervaloDia } from '@/app/lib/utils/dateUtils';

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const { searchParams } = new URL(request.url);

    const limit       = parseInt(searchParams.get('limit')       ?? '50');
    const page        = parseInt(searchParams.get('page')        ?? '1');
    const facility    = searchParams.get('facility');
    const status      = searchParams.get('status');
    const motoristaId = searchParams.get('motoristaId');
    const dataInicio  = searchParams.get('dataInicio');
    const dataFim     = searchParams.get('dataFim');

    const query: Record<string, unknown> = {};
    if (facility)    query.facility    = facility;
    if (status)      query.status      = status;
    if (motoristaId) query.motoristaId = motoristaId;

    if (dataInicio && dataFim) {
      const { start } = criarIntervaloDia(dataInicio);
      const { end }   = criarIntervaloDia(dataFim);
      query.dataCriacao = { $gte: start, $lte: end };
    }

    const skip = (page - 1) * limit;

    const [carregamentos, total] = await Promise.all([
      db.collection('carregamentos')
        .find(query)
        .sort({ dataCriacao: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection('carregamentos').countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data:    carregamentos.map(serializeDocument),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[GET /api/carregamento]', error);
    return NextResponse.json({ error: 'Erro ao buscar carregamentos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db   = await getDatabase();
    const data = await request.json();

    if (!data.destino) {
      return NextResponse.json({ error: 'Destino é obrigatório' }, { status: 400 });
    }
    if (!data.facility) {
      return NextResponse.json({ error: 'Facility é obrigatória' }, { status: 400 });
    }
    if (!data.motorista?.nome) {
      return NextResponse.json({ error: 'Dados do motorista incompletos' }, { status: 400 });
    }

    const agora       = new Date();
    const agoraISO    = agora.toISOString();
    const motoristaId = `${data.destino}_${data.facility}_${data.motorista.nome}_${data.motorista.travelId ?? ''}`;

    const doc = await db.collection('carregamentos').findOneAndUpdate(
      { motoristaId },
      {
        $setOnInsert: {
          motoristaId,
          destino:    data.destino,
          facility:   data.facility,
          motorista:  data.motorista,
          status:     'aguardando',
          timestamps: { aguardando: agoraISO },
          dataCriacao: agora,
          numero: `CAR-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        },
        $set: { dataAtualizacao: agora },
      },
      { upsert: true, returnDocument: 'after' }
    );

    return NextResponse.json(
      { success: true, data: serializeDocument(doc) },
      { status: doc?.dataCriacao?.getTime() === agora.getTime() ? 201 : 200 }
    );
  } catch (error: any) {
    console.error('[POST /api/carregamento]', error);
    return NextResponse.json({ error: 'Erro ao criar carregamento' }, { status: 500 });
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

    updateData.dataAtualizacao = new Date();

    const result = await db.collection('carregamentos').updateOne(
      { motoristaId },
      { $set: updateData, $setOnInsert: { dataCriacao: new Date() } },
      { upsert: true }
    );

    const doc = await db.collection('carregamentos').findOne({ motoristaId });

    return NextResponse.json({ success: true, data: serializeDocument(doc) });
  } catch (error: any) {
    console.error('[PUT /api/carregamento]', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}