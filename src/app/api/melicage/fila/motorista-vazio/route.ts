import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cpf, nome, chave_identificacao, latitude, longitude } = body;

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
      uploadDate: {$gte: inicioDia, $lte: fimDia}
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
        const nomeCSV = item['Nome do motorista 1'];
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

        if(destinoCodigo !== 'Aguardando atribuição'){
          const destinosCollection = db.collection('melicages_xpts')
          const destinoDoc = await destinosCollection.findOne({codigo: destinoCodigo})

          if(destinoDoc && destinoDoc.cidade){
            destinoCidade = destinoDoc.cidade
          }else{
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