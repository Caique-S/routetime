import { NextResponse } from 'next/server';
import { getDatabase } from '@/app/lib/mongodb';

export async function GET() {
  try {
    const db = await getDatabase();
    // Busca todos os destinos (XPTS) cadastrados
    const xpts = await db.collection('melicages_xpts').find({}).toArray();
    const destinos = xpts.map(x => ({
      codigo: x.codigo,
      cidade: x.cidade,
      latitude: x.latitude,
      longitude: x.longitude,
      raio: x.raio,
    }));

    // Parâmetros de alarme (pode vir de uma collection de configuração)
    const config = {
      destinos,
      tempoRespostaAlarme: 300, // segundos (5 minutos)
      urlBase: process.env.NEXT_PUBLIC_BASE_URL || '',
    };

    return NextResponse.json({ success: true, data: config });
  } catch (error: any) {
    console.error('[API] GET /config error:', error);
    return NextResponse.json(
      { success: false, erro: 'Erro interno ao carregar configurações' },
      { status: 500 }
    );
  }
}