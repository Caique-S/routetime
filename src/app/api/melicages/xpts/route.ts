import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/lib/mongodb';

export async function GET() {
  console.log('[API] GET /xpts');
  try {
    const db = await getDatabase();
    const xpts = await db.collection('melicages_xpts').find({}).sort({ cidade: 1 }).toArray();
    const data = xpts.map(({ _id, ...rest }) => ({ id: _id.toString(), ...rest }));
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[API] GET /xpts error:', error);
    return NextResponse.json({ success: false, erro: 'Erro interno' }, { status: 500 });
  }
}

 export async function POST(request: NextRequest) {
   console.log('[API] POST /xpts');
   try {
     const db = await getDatabase();
     const body = await request.json();
     const { cidade, codigo, latitude, longitude, raio, origin } = body;
     if (!cidade || !codigo || latitude === undefined || longitude === undefined || raio === undefined) {
       return NextResponse.json(
         { success: false, erro: 'Campos obrigatórios: cidade, codigo, latitude, longitude, raio' },
         { status: 400 }
       );
     }
     const novoXpt = {
       cidade,
       codigo,
       latitude: parseFloat(latitude),
       longitude: parseFloat(longitude),
       raio: parseInt(raio, 10),
       origin: origin || '',
       createdAt: new Date(),
       updatedAt: new Date(),
     };
     const result = await db.collection('melicages_xpts').insertOne(novoXpt);
     const data = { id: result.insertedId.toString(), ...novoXpt };
     return NextResponse.json({ success: true, data }, { status: 201 });
   } catch (error: any) {
     console.error('[API] POST /xpts error:', error);
     return NextResponse.json({ success: false, erro: 'Erro interno' }, { status: 500 });
   }
 }