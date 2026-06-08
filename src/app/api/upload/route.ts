import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'papaparse';
import { getDatabase } from '@/app/lib/mongodb';
import { criarIntervaloDia } from '@/app/lib/utils/dateUtils';
import { criarCarregamentosFromCSV } from '@/app/lib/models/carregamento'; 

interface CSVUpload {
  fileName:         string;
  fileSize:         number;
  uploadDate:       Date;
  data:             Record<string, unknown>[];
  status:           'pendente' | 'processado' | 'erro';
  totalRecords:     number;
  processedRecords: number;
  filterColumn?:    string;
  filterValue?:     string;
  metadata?: {
    headers:   string[];
    delimiter: string;
    encoding:  string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData     = await request.formData();
    const file         = formData.get('file') as File | null;
    const filterColumn = formData.get('filterColumn') as string | null;
    const filterValue  = formData.get('filterValue')  as string | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json({ success: false, error: 'Apenas arquivos CSV são permitidos' }, { status: 400 });
    }

    const fileContent = await file.text();

    const parseResult = parse(fileContent, {
      header:          true,
      skipEmptyLines:  true,
      transformHeader: (h) => h.trim(),
    });

    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Erro ao processar CSV', details: parseResult.errors },
        { status: 400 }
      );
    }

    const allData      = parseResult.data as Record<string, unknown>[];
    const filteredData = (filterColumn && filterValue)
      ? allData.filter((row) => {
          const cell = row[filterColumn];
          return cell !== undefined && String(cell).trim() === String(filterValue).trim();
        })
      : allData;

    const uploadDocument: CSVUpload = {
      fileName:         file.name,
      fileSize:         file.size,
      uploadDate:       new Date(),
      data:             filteredData,
      status:           'processado',
      totalRecords:     allData.length,
      processedRecords: filteredData.length,
      filterColumn:     filterColumn ?? undefined,
      filterValue:      filterValue  ?? undefined,
      metadata: {
        headers:   parseResult.meta.fields ?? [],
        delimiter: parseResult.meta.delimiter ?? ',',
        encoding:  'utf-8',
      },
    };

    const db = await getDatabase();
    const insertResult = await db.collection('uploads_atribuicao').insertOne(uploadDocument);

    const facilityFallback = filterValue ?? '';

    const bulkOps = filteredData
      .filter((row) => row['Nome do motorista 1'] && row['Destino'])
      .map((row) => {
        
        const carregamento = criarCarregamentosFromCSV(row, facilityFallback);

        const { dataEnvio, ...dadosParaInserir } = carregamento;

        return {
          updateOne: {
            filter: { motoristaId: carregamento.motoristaId },
            update: {
              $setOnInsert: { ...dadosParaInserir, dataCriacao: new Date(), },
              $set: { dataEnvio: new Date() },
            },
            upsert: true,
          },
        };
      });

    let carregamentosResult = { criados: 0, existentes: 0 };
    if (bulkOps.length > 0) {
      const bulk = await db.collection('carregamentos').bulkWrite(bulkOps, { ordered: false });
      carregamentosResult = {
        criados:     bulk.upsertedCount,
        existentes: bulk.matchedCount,
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        id:               insertResult.insertedId,
        fileName:         file.name,
        totalRecords:     allData.length,
        processedRecords: filteredData.length,
        carregamentos:    carregamentosResult,
      },
    });
  } catch (error: any) {
    console.error('[POST /api/upload]', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno no servidor', message: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const { searchParams } = new URL(request.url);

    const limit    = parseInt(searchParams.get('limit')  ?? '10');
    const page     = parseInt(searchParams.get('page')   ?? '1');
    const date     = searchParams.get('date');
    const facility = searchParams.get('facility');

    const query: Record<string, unknown> = {};

    if (date) {
      const { start, end } = criarIntervaloDia(date);
      query.uploadDate = { $gte: start, $lte: end };
    }

    if (facility) {
      query['data'] = {
        $elemMatch: {
          $or: [{ facility }, { Facility: facility }],
        },
      };
    }

    const skip = (page - 1) * limit;

    const [uploads, total] = await Promise.all([
      db.collection('uploads_atribuicao')
        .find(query)
        .sort({ uploadDate: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection('uploads_atribuicao').countDocuments(query),
    ]);

    const data = uploads.map((upload) => ({
      ...upload,
      _id:      upload._id.toString(),
      data:     Array.isArray(upload.data) ? upload.data : [],
      fileName: upload.fileName  ?? 'Sem nome',
      totalRecords: upload.totalRecords ?? 0,
      uploadDate:   upload.uploadDate   ?? new Date(),
    }));

    return NextResponse.json(
      {
        success: true,
        data,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
      { headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } }
    );
  } catch (error: any) {
    console.error('[GET /api/upload]', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar uploads', message: error.message },
      { status: 500 }
    );
  }
}