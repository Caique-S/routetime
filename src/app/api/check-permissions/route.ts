import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const userAgent = request.headers.get('user-agent') || '';
  const isWebView = /wv/.test(userAgent.toLowerCase());
  
  return NextResponse.json({
    isWebView,
    userAgent,
    permissions: {
      camera: 'unknown',
      storage: 'unknown'
    },
    instructions: isWebView ? {
      camera: 'Configure permissões no aplicativo nativo',
      storage: 'Habilite acesso a arquivos nas configurações'
    } : {
      camera: 'Clique no ícone de câmera na barra de endereço',
      storage: 'Permita acesso a arquivos quando solicitado'
    }
  });
}