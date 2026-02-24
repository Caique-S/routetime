import { NextRequest, NextResponse } from 'next/server';
import Ably from 'ably';

export async function GET(req: NextRequest) {
  try {
    const client = new Ably.Rest(process.env.ABLY_API_KEY!);
    const tokenParams = { clientId: 'melicages' }; // ou extrair do header de autorização
    const tokenRequest = await client.auth.createTokenRequest(tokenParams);
    return NextResponse.json(tokenRequest);
  } catch (error: any) {
    console.error('Erro ao gerar token Ably:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}