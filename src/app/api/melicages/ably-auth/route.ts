import { NextRequest, NextResponse } from 'next/server';
import { getAblyClient } from '@/app/lib/ably';

export async function GET(req: NextRequest) {
  try {
    const client = getAblyClient(); // ✅ Lazy: só criado aqui
    const tokenParams = { clientId: 'melicages' }; 
    const tokenRequest = await client.auth.createTokenRequest(tokenParams);
    return NextResponse.json(tokenRequest);
  } catch (error: any) {
    console.error('Erro ao gerar token Ably:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}