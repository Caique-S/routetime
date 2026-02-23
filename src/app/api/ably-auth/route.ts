import { NextRequest, NextResponse } from 'next/server';
import Ably from 'ably';

const ably = new Ably.Rest(process.env.ABLY_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { clientId } = await request.json();
    if (!clientId) {
      return NextResponse.json({ error: 'clientId é obrigatório' }, { status: 400 });
    }

    // Gera um token com tempo de expiração (1 hora)
    const tokenParams = { clientId, ttl: 3600000 }; // 1 hora em ms
    const tokenRequest = await ably.auth.createTokenRequest(tokenParams);
    return NextResponse.json(tokenRequest);
  } catch (error: any) {
    console.error('[API] /ably-auth error:', error);
    return NextResponse.json({ error: 'Erro ao gerar token' }, { status: 500 });
  }
}