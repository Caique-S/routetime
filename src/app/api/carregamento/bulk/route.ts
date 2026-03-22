import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../lib/mongodb';

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

    // Converte campos de data string para Date
    const documentos = carregamentos.map((item: any) => {
      // Cria uma cópia para não modificar o original
      const doc = { ...item };

      // Converte campos de data, se existirem como string
      if (typeof doc.dataCriacao === 'string') doc.dataCriacao = new Date(doc.dataCriacao);
      if (typeof doc.dataAtualizacao === 'string') doc.dataAtualizacao = new Date(doc.dataAtualizacao);
      if (typeof doc.timestamp === 'string') doc.timestamp = new Date(doc.timestamp);
      if (typeof doc.dataEnvio === 'string') doc.dataEnvio = new Date(doc.dataEnvio);

      // Remove _id se presente para evitar conflito de duplicata
      delete doc._id;

      return doc;
    });

    // Insere todos os documentos de uma vez
    const result = await db.collection('carregamentos').insertMany(documentos);

    return NextResponse.json({
      success: true,
      message: `${result.insertedCount} carregamentos importados com sucesso.`,
      insertedIds: result.insertedIds,
    });
  } catch (error: any) {
    console.error('Erro na importação em lote:', error);
    return NextResponse.json(
      { error: 'Erro interno ao importar carregamentos.', details: error.message },
      { status: 500 }
    );
  }
}