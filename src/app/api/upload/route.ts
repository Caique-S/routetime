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
  // ... (código POST inalterado, igual ao fornecido)
  // Mantenha o código POST exatamente como você já tem.
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
    const date = searchParams.get('date');
    const facility = searchParams.get('facility'); // NOVO

    console.log(`Parâmetros: limit=${limit}, page=${page}, date=${date}, facility=${facility}`);

    let query: any = {};

    // Filtro por data
    if (date) {
      const start = new Date(date + 'T00:00:00.000Z');
      const end = new Date(date + 'T23:59:59.999Z');
      query.uploadDate = { $gte: start, $lte: end };
    }

    // Filtro por facility (busca no array data por um item com campo Facility ou facility)
    if (facility) {
      query['data'] = {
        $elemMatch: {
          $or: [
            { Facility: facility },
            { facility: facility }
          ]
        }
      };
    }

    const skip = (page - 1) * limit;

    console.log('Buscando uploads da coleção...');
    const uploads = await db.collection('uploads_atribuicao')
      .find(query)
      .sort({ uploadDate: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    console.log(`✓ Encontrados ${uploads.length} uploads`);

    const total = await db.collection('uploads_atribuicao').countDocuments(query);
    console.log(`✓ Total de documentos: ${total}`);

    const serializedUploads = uploads.map(upload => ({
      ...upload,
      _id: upload._id.toString(),
      data: Array.isArray(upload.data) ? upload.data : [],
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