import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'papaparse';
import clientPromise from '../../lib/mongodb';

// Interface local se não estiver importando corretamente
interface CSVUpload {
  fileName: string;
  fileSize: number;
  uploadDate: Date;
  data: any[];
  status: 'pendente' | 'processado' | 'erro';
  totalRecords: number;
  processedRecords: number;
  filterColumn?: string;
  filterValue?: string;
  metadata?: {
    headers: string[];
    delimiter: string;
    encoding: string;
  };
}

export async function POST(request: NextRequest) {
  console.log('=== INICIANDO PROCESSAMENTO DE UPLOAD ===');

  try {
    console.log('1. Conectando ao MongoDB...');
    const client = await clientPromise;
    console.log('✓ Conexão com MongoDB estabelecida');

    // Especificar o nome do banco de dados
    const db = client.db('brj_transportes'); // ← Adicione o nome do seu banco aqui
    console.log(`✓ Banco de dados selecionado: ${db.databaseName}`);

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const filterColumn = formData.get('filterColumn') as string;
    const filterValue = formData.get('filterValue') as string;

    console.log('2. Dados recebidos:', {
      fileName: file?.name,
      fileSize: file?.size,
      filterColumn,
      filterValue
    });

    if (!file) {
      console.error('✗ Nenhum arquivo enviado');
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      );
    }

    // Verificar se é um arquivo CSV
    if (!file.name.toLowerCase().endsWith('.csv')) {
      console.error('✗ Arquivo não é CSV:', file.name);
      return NextResponse.json(
        { error: 'Apenas arquivos CSV são permitidos' },
        { status: 400 }
      );
    }

    // Verificar tamanho do arquivo
    if (file.size > 10 * 1024 * 1024) {
      console.error('✗ Arquivo muito grande:', file.size);
      return NextResponse.json(
        { error: 'Arquivo muito grande. Máximo 10MB' },
        { status: 400 }
      );
    }

    console.log('3. Lendo arquivo CSV...');
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileContent = fileBuffer.toString('utf-8');
    console.log(`✓ Tamanho do conteúdo: ${fileContent.length} caracteres`);

    // Parse do CSV
    console.log('4. Parseando CSV com papaparse...');
    const results = parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      delimiter: ',',
      transform: (value: string, field: string) => {
        // Limpar espaços em branco
        if (typeof value === 'string') {
          value = value.trim();
        }

        // Converter valores numéricos
        if (value && value !== '' && !isNaN(parseFloat(value)) && isFinite(Number(value))) {
          const num = parseFloat(value);
          return Number.isInteger(num) ? parseInt(value, 10) : num;
        }

        // Converter booleanos
        if (value && (value.toLowerCase() === 'true' || value.toLowerCase() === 'false')) {
          return value.toLowerCase() === 'true';
        }

        return value;
      },
    });

    console.log('✓ Parse concluído:', {
      linhas: results.data.length,
      cabecalhos: results.meta.fields,
      erros: results.errors.length
    });

    if (results.errors.length > 0) {
      console.error('✗ Erros no parse:', results.errors);
      return NextResponse.json(
        {
          error: 'Erro ao processar CSV',
          details: results.errors.map(err => ({
            row: err.row,
            message: err.message,
            code: err.code
          }))
        },
        { status: 400 }
      );
    }

    // Validar que temos dados
    if (!results.data || results.data.length === 0) {
      console.error('✗ CSV vazio ou sem dados');
      return NextResponse.json(
        { error: 'CSV vazio ou sem dados válidos' },
        { status: 400 }
      );
    }

    // Filtrar dados se especificado
    let dadosProcessados = results.data;
    console.log('5. Aplicando filtros...');

    if (filterColumn && filterValue) {
      console.log(`Filtro: ${filterColumn} = "${filterValue}"`);
      dadosProcessados = results.data.filter((row: any) => {
        const rowValue = row[filterColumn];
        if (rowValue === undefined || rowValue === null) return false;

        // Comparação flexível (permite tipos diferentes)
        return rowValue.toString().toLowerCase() === filterValue.toString().toLowerCase();
      });
      console.log(`✓ Resultados filtrados: ${dadosProcessados.length} de ${results.data.length} registros`);
    } else {
      console.log('✓ Nenhum filtro aplicado, usando todos os registros');
    }

    // Preparar documento para inserir no MongoDB
    console.log('6. Preparando documento para MongoDB...');
    const uploadDocument = {
      fileName: file.name,
      fileSize: file.size,
      uploadDate: new Date(),
      data: dadosProcessados,
      status: 'processado',
      totalRecords: results.data.length,
      processedRecords: dadosProcessados.length,
      ...(filterColumn && { filterColumn }),
      ...(filterValue && { filterValue }),
      metadata: {
        headers: results.meta.fields || [],
        delimiter: results.meta.delimiter,
        encoding: 'utf-8',
        lineBreak: results.meta.linebreak || '\\n'
      }
    };

    console.log('7. Inserindo na coleção "upload de Atribuição"...');

    // Verificar se a coleção existe, se não, criar
    const collections = await db.listCollections({ name: 'uploads_atribuicao' }).toArray();
    if (collections.length === 0) {
      console.log('✓ Criando coleção "uploads_atribuicao"...');
      await db.createCollection('uploads_atribuicao');
    }

    // Inserir documento
    const result = await db.collection('uploads_atribuicao').insertOne(uploadDocument);

    console.log('✓ Documento inserido com sucesso!', {
      id: result.insertedId,
      fileName: uploadDocument.fileName,
      totalRecords: uploadDocument.totalRecords,
      processedRecords: uploadDocument.processedRecords
    });

    return NextResponse.json({
      success: true,
      message: 'Arquivo processado com sucesso',
      data: {
        id: result.insertedId,
        fileName: uploadDocument.fileName,
        totalRecords: uploadDocument.totalRecords,
        processedRecords: uploadDocument.processedRecords,
        uploadDate: uploadDocument.uploadDate,
        filterColumn: filterColumn || null,
        filterValue: filterValue || null
      },
    });

  } catch (error: any) {
    console.error('✗ ERRO NO PROCESSAMENTO:', error);
    console.error('Stack trace:', error.stack);

    // Log detalhado do erro
    if (error.name === 'MongoServerError') {
      console.error('Código do erro MongoDB:', error.code);
      console.error('Mensagem completa:', error.message);

      // Erro de duplicação de chave
      if (error.code === 11000) {
        return NextResponse.json(
          { error: 'Documento duplicado' },
          { status: 409 }
        );
      }

      // Outros erros do MongoDB
      return NextResponse.json(
        { error: `Erro do MongoDB: ${error.message}` },
        { status: 503 }
      );
    }

    // Erro de validação
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: `Erro de validação: ${error.message}` },
        { status: 400 }
      );
    }

    // Erro genérico
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('=== API UPLOAD GET: Iniciando ===');

    const client = await clientPromise;
    const db = client.db('brj_transportes');

    console.log('✓ Conectado ao banco de dados');

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');

    // Calcular paginação
    const skip = (page - 1) * limit;

    console.log(`Parâmetros: limit=${limit}, page=${page}, skip=${skip}`);

    // Buscar uploads
    console.log('Buscando uploads da coleção...');
    const uploads = await db.collection('uploads_atribuicao')
      .find({})
      .sort({ uploadDate: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    console.log(`✓ Encontrados ${uploads.length} uploads`);

    // Contar total de documentos
    const total = await db.collection('uploads_atribuicao').countDocuments();
    console.log(`✓ Total de documentos: ${total}`);

    // Converter ObjectId para string para serialização
    const serializedUploads = uploads.map(upload => ({
      ...upload,
      _id: upload._id.toString(),
      // Garantir que 'data' seja um array
      data: Array.isArray(upload.data) ? upload.data : [],
      // Garantir que tenha os campos esperados
      fileName: upload.fileName || 'Sem nome',
      totalRecords: upload.totalRecords || 0,
      uploadDate: upload.uploadDate || new Date(),
    }));

    const responseData = {
      success: true,
      data: serializedUploads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };

    console.log('✓ Retornando dados com sucesso');

    return NextResponse.json(responseData, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error: any) {
    console.error('✗ ERRO NO GET /api/upload:', error);

    // Retornar erro formatado como JSON
    return NextResponse.json({
      success: false,
      error: 'Erro ao buscar uploads',
      message: error.message,
      timestamp: new Date().toISOString()
    }, {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
