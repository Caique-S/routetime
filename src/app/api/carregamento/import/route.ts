import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/lib/mongodb';

const CAMPOS_DATA = ['dataCriacao', 'dataAtualizacao', 'timestamp', 'dataEnvio'] as const;

export async function POST(request: NextRequest) {
  try {
    const db = await getDatabase();
    const { carregamentos } = await request.json();

    if (!Array.isArray(carregamentos) || carregamentos.length === 0) {
      return NextResponse.json(
        { error: 'Envie um array válido de carregamentos.' },
        { status: 400 }
      );
    }

    const documentos = carregamentos.map((item: Record<string, any>) => {
      const doc = { ...item };
      delete doc._id;

      for (const campo of CAMPOS_DATA) {
        if (typeof doc[campo] === 'string') {
          doc[campo] = new Date(doc[campo]);
        }
      }

      return doc;
    });

    const result = await db.collection('carregamentos').insertMany(documentos);

    return NextResponse.json({
      success:  true,
      message:  `${result.insertedCount} carregamentos importados com sucesso.`,
      insertedIds: result.insertedIds,
    });
  } catch (error: any) {
    console.error('[POST /api/carregamento/import]', error);
    return NextResponse.json(
      { error: 'Erro interno ao importar carregamentos.', details: error.message },
      { status: 500 }
    );
  }
}