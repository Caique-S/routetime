import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/mongodb';
import { dbFirestore, FIRESTORE_COLLECTION } from '../../../../lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cpf, nome, chave_identificacao, latitude, longitude } = body;

    if (!cpf || !nome || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { message: 'Campos obrigatórios: cpf, nome, latitude, longitude' },
        { status: 400 }
      );
    }

    const db = await getDatabase('brj_transportes');
    const collection = db.collection('melicages_motoristas');

    
    const ativo = await collection.findOne({
      cpf,
      status: { $in: ['aguardando_carregamento', 'carregando'] }
    });
    if (ativo) {
      return NextResponse.json(
        { message: 'Motorista já está na fila ativa.' },
        { status: 409 }
      );
    }

   
    const uploadsCollection = db.collection('uploads_atribuicao');
    const lastUpload = await uploadsCollection.find().sort({ uploadDate: -1 }).limit(1).toArray();
    let destino = 'Aguardando atribuição';
    if (lastUpload.length > 0) {
      const uploadData = lastUpload[0].data;
      
      const nomeNormalizado = nome
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
      const registroEncontrado = uploadData.find((item: any) => {
        const nomeCSV = item['Nome do motorista 1'];
        if (!nomeCSV) return false;
        const nomeCSVNormalizado = nomeCSV
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim();
        return nomeCSVNormalizado === nomeNormalizado;
      });
      if (registroEncontrado) {
        destino = registroEncontrado['Destino'] || 'Destino não especificado';
      }
    }

    const agora = new Date();
    const novoRegistro = {
      cpf,
      nome,
      chave_identificacao,
      destino,                     
      status: 'aguardando_carregamento',
      tipo: 'vazio',                
      dataChegada: agora.toLocaleDateString('pt-BR'),
      horaChegada: agora.toLocaleTimeString('pt-BR'),
      timestampChegada: agora.toISOString(),
      latitude,
      longitude,
      tempoFila: 0,
      tempoDescarga: 0,
      timestampInicioDescarga: null,
      timestampFimDescarga: null,
      doca: null,
      docaNotifiedAt: null,
      gaiolas: null,
      palets: null,
      mangas: null,
    };

    const result = await collection.insertOne(novoRegistro);
    const insertedId = result.insertedId.toString();

    try {
      await dbFirestore.collection(FIRESTORE_COLLECTION).doc(insertedId).set({
        ...novoRegistro,
        _id: insertedId,
      });
    } catch (firestoreError) {
      console.error('Erro ao escrever no Firestore:', firestoreError);
    }

    return NextResponse.json({
      message: 'Chegada registrada com sucesso',
      data: {
        id: insertedId,
        destino: novoRegistro.destino,
        timestampChegada: novoRegistro.timestampChegada,
        status: novoRegistro.status,
      },
    }, { status: 201 });

  } catch (error: any) {
    console.error('[ERRO] POST /api/melicages/fila/motorista-vazio', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor', error: error.message },
      { status: 500 }
    );
  }
}