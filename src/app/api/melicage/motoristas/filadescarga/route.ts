import { getDatabase } from "@/app/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  console.log("[API] GET /motoristas");
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo");                 // "gaiolas", "vazio" ou null
    const dataParam = searchParams.get("data");            // mantido para compatibilidade
    const dataInicio = searchParams.get("dataInicio");     // YYYY-MM-DD
    const dataFim = searchParams.get("dataFim");           // YYYY-MM-DD

    const db = await getDatabase();
    const collection = db.collection("melicages_motoristas");

    // Monta o filtro
    const filter: any = {};
    if (tipo) filter.tipo = tipo;

    // Função para criar intervalo UTC-3 a partir de data YYYY-MM-DD
    const criarIntervaloDia = (dataStr: string) => {
      const [year, month, day] = dataStr.split('-').map(Number);
      // Início do dia em Brasília = UTC 03:00
      const start = new Date(Date.UTC(year, month - 1, day, 3, 0, 0, 0));
      // Fim do dia em Brasília = UTC 02:59:59.999 do dia seguinte
      const end = new Date(Date.UTC(year, month - 1, day + 1, 2, 59, 59, 999));
      return { start, end };
    };

    if (dataInicio && dataFim) {
      const inicio = criarIntervaloDia(dataInicio).start;
      const fim = criarIntervaloDia(dataFim).end;
      filter.timestampChegada = { $gte: inicio, $lte: fim };
    } else if (dataParam) {
      // Compatibilidade com o parâmetro antigo 'data'
      const { start, end } = criarIntervaloDia(dataParam);
      filter.timestampChegada = { $gte: start, $lte: end };
    }

    const motoristas = await collection
      .find(filter)
      .sort({ timestampChegada: -1 })
      .toArray();

    const data = motoristas.map(({ _id, ...rest }) => ({
      id: _id.toString(),
      ...rest,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[API] GET /motoristas error:", error);
    return NextResponse.json(
      { success: false, erro: "Erro interno" },
      { status: 500 }
    );
  }
}