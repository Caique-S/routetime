import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/mongodb';
import { criarIntervaloDia } from '@/app/lib/utils/dateUtils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cpf, nome, chave_identificacao, latitude, longitude, transportadora } = body;

    if (!cpf || !nome || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { message: ' Campos obrigatórios: cpf, nome, latitude, longitude ' },
        { status: 400 }
      );
    }

    const db = await getDatabase('brj_transportes');
    const collection = db.collection('melicages_motoristas');

    const dataHora = new Date()
    const inicioDia = new Date(dataHora)
    inicioDia.setHours(0, 0, 0, 0)

    const fimDia = new Date(dataHora)
    fimDia.setHours(23, 59, 58, 990)


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
    const lastUpload = await uploadsCollection.find({
      uploadDate: { $gte: inicioDia, $lte: fimDia }
    }).sort({ uploadDate: -1 }).limit(1).toArray();

    let destinoCodigo = 'Aguardando atribuição';
    let destinoCidade = 'Aguardando atribuição'

    if (lastUpload.length > 0) {
      const uploadData = lastUpload[0].data;

      const nomeNormalizado = nome
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, '');
      const registroEncontrado = uploadData.find((item: any) => {
        const nomeCSV = item['Nome do transportador 1'];
        if (!nomeCSV) return false;
        const nomeCSVNormalizado = nomeCSV
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/\s+/g, '');
        return nomeCSVNormalizado === nomeNormalizado;
      });
      if (registroEncontrado) {
        const codigoSemFormatacao = registroEncontrado['Destino'] || 'Destino não especificado';
        destinoCodigo = codigoSemFormatacao ? codigoSemFormatacao.toString().trim().toUpperCase() : 'Destino não encontrado'

        if (destinoCodigo !== 'Aguardando atribuição') {
          const destinosCollection = db.collection('melicages_xpts')
          const destinoDoc = await destinosCollection.findOne({ codigo: destinoCodigo })

          if (destinoDoc && destinoDoc.cidade) {
            destinoCidade = destinoDoc.cidade
          } else {
            destinoCidade = `${destinoCodigo} sem Cadastro`
          }
        }
      }
    }

    const agora = new Date();
    const novoRegistro = {
      cpf,
      nome,
      chave_identificacao,
      destino: destinoCodigo,
      cidadeDestino: destinoCidade,
      status: 'aguardando_carregamento',
      tipo: 'vazio',
      dataChegada: agora.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      horaChegada: agora.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      timestampChegada: agora,
      transportadora,
      latitude,
      longitude,
      inicioViagem: null,
    };

    const result = await collection.insertOne(novoRegistro);
    const insertedId = result.insertedId.toString();
    let posicaoFila = null;
    let totalFilaDestino = 0;

    if (destinoCodigo !== 'Aguardando atribuição') {
      const motoristasNaFrente = await collection.countDocuments({
        destino: destinoCodigo,
        status: 'aguardando_carregamento',
        timestampChegada: { $lt: novoRegistro.timestampChegada }
      });
      posicaoFila = motoristasNaFrente + 1;
      totalFilaDestino = await collection.countDocuments({
        destino: destinoCodigo,
        status: 'aguardando_carregamento'
      });
    }

    return NextResponse.json({
      message: 'Chegada registrada com sucesso',
      data: {
        id: insertedId,
        destino: novoRegistro.destino,
        cidadeDestino: novoRegistro.cidadeDestino,
        timestampChegada: novoRegistro.timestampChegada,
        dataChegada: novoRegistro.dataChegada,
        horaChegada: novoRegistro.horaChegada,
        status: novoRegistro.status,
        inicioViagem: novoRegistro.inicioViagem,
        chave_identificacao: novoRegistro.chave_identificacao,
        transportadora: novoRegistro.transportadora,
        posicaoFila,
        totalFilaDestino
      },
    }, { status: 201 });

  } catch (error: any) {
    console.error('[ERRO] POST /api/melicage/fila/motorista-vazio', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor', error: error.message },
      { status: 500 }
    );
  }
}


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cpf = searchParams.get('cpf');

    if (!cpf) {
      return NextResponse.json({ message: 'O parâmetro CPF é obrigatório.' }, { status: 400 });
    }

    const db = await getDatabase('brj_transportes');
    const collection = db.collection('melicages_motoristas');

    // 1. Busca o registro ativo do motorista na fila
    let motorista = await collection.findOne({
      cpf,
      status: { $in: ['aguardando_carregamento', 'carregando', 'liberado'] }
    });

    if (!motorista) {
      return NextResponse.json({ active: false, message: 'Motorista não está na fila ativa.' }, { status: 200 });
    }

    // 2. TRATAMENTO DO CSV ATRASADO: Se o motorista estiver sem rota, tenta buscar de novo no último CSV de hoje
    const dataHora = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const { start, end } = criarIntervaloDia(dataHora)


    const uploadsCollection = db.collection('uploads_atribuicao');
    const lastUpload = await uploadsCollection.find({
      uploadDate: { $gte: start, $lte: end }
    }).sort({ uploadDate: -1 }).limit(1).toArray();

    if (lastUpload.length > 0) {
      const uploadData = lastUpload[0].data;
      const nomeNormalizado = motorista.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '');

      const registroEncontrado = uploadData.find((item: any) => {
        const nomeCSV = item['Nome do transportador 1'];
        if (!nomeCSV) return false;
        return nomeCSV.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '') === nomeNormalizado;
      });

      // Se o operador subiu o CSV agora e encontrou o motorista:
      if (registroEncontrado) {
        const brutoCodigo = registroEncontrado['Destino'];
        const destinoCodigo = brutoCodigo ? brutoCodigo.toString().trim().toUpperCase() : 'Destino não especificado';
        let destinoCidade = 'Aguardando atribuição';

        if (destinoCodigo && destinoCodigo !== 'Aguardando atribuição') {
          const destinosCollection = db.collection('melicages_xpts');
          const destinoDoc = await destinosCollection.findOne({ codigo: destinoCodigo });
          destinoCidade = destinoDoc?.cidade || `${destinoCodigo} sem Cadastro`;
        }

        if (destinoCodigo && destinoCodigo !== motorista.destino) {
          await collection.updateOne(
            { _id: motorista._id },
            { $set: { destino: destinoCodigo, cidadeDestino: destinoCidade } }
          );

          motorista.destino = destinoCodigo;
          motorista.cidadeDestino = destinoCidade;
        }
      } else {
        if (motorista.destino !== 'Aguardando atribuição') {
          await collection.updateOne(
            { _id: motorista._id },
            { $set: { destino: 'Aguardando atribuição', cidadeDestino: 'Aguardando atribuição' } }
          );
          motorista.destino = 'Aguardando atribuição';
          motorista.cidadeDestino = 'Aguardando atribuição';
        }
      }

      let posicaoFila = null;
      let totalFilaDestino = 0;

      if (motorista.status === 'aguardando_carregamento' && motorista.destino !== 'Aguardando atribuição') {
        // Conta quantos motoristas chegaram ANTES dele para o MESMO destino
        const motoristasNaFrente = await collection.countDocuments({
          destino: motorista.destino,
          status: 'aguardando_carregamento',
          timestampChegada: { $lt: motorista.timestampChegada }
        });

        // A posição dele é o total de pessoas na frente + 1
        posicaoFila = motoristasNaFrente + 1;

        // Conta o total geral de carros para aquela rota específica
        totalFilaDestino = await collection.countDocuments({
          destino: motorista.destino,
          status: 'aguardando_carregamento'
        });
      }

      return NextResponse.json({
        success: true,
        active: true,
        data: {
          id: motorista._id.toString(),
          cpf: motorista.cpf,
          nome: motorista.nome,
          destino: motorista.destino,
          cidadeDestino: motorista.cidadeDestino,
          chave_identificacao: motorista.chave_identificacao,
          status: motorista.status,
          dataChegada: motorista.dataChegada,
          horaChegada: motorista.horaChegada,
          timestampChegada: motorista.timestampChegada,
          transportadora: motorista.transportadora,
          motoristaId: motorista.motoristaId,
          posicaoFila,
          totalFilaDestino,
          inicioViagem: motorista.inicioViagem
        }
      });
    }else{
      return NextResponse.json({
        success: false,
        active: true,
        message: "Atribuições não encontradas"
      },{status: 200})
    }
  } catch (error: any) {
    console.error('[ERRO] GET /api/melicage/fila/motorista-vazio', error);
    return NextResponse.json({ success: false, message: 'Erro interno do servidor' }, { status: 500 });
  }
}
