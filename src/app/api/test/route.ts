import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ message: 'Status da API:' ,
        "String de Conexão": process.env.MONGODB_URI ? 'Definida ' : 'Não definida',
        "Banco de Dados": process.env.MONGODB_DB ? ` Ativo = ${process.env.MONGODB_DB}` : 'Não definida',
  })
}