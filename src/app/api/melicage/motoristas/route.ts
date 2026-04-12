import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/app/lib/mongodb";
import { dbFirestore, FIRESTORE_COLLECTION } from "@/app/lib/firebaseAdmin";

const TZ = "America/Sao_Paulo";
/* 
export async function GET(request: NextRequest) {
  console.log("[API] GET /motoristas");
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo"); // "gaiolas", "vazio" ou null

    const db = await getDatabase();
    const collection = db.collection("melicages_motoristas");

    // Se tipo foi informado, filtra; senão busca todos (comportamento atual)
    const query = tipo ? { tipo } : {};

    const motoristas = await collection
      .find(query)
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
   */

export async function GET(request: NextRequest) {
  console.log("[API] GET /motoristas");
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo");
    const dataParam = searchParams.get("data"); // YYYY-MM-DD

    const db = await getDatabase();
    const collection = db.collection("melicages_motoristas");

    // Monta o filtro
    const filter: any = {};
    if (tipo) filter.tipo = tipo;

    if (dataParam) {
      const [year, month, day] = dataParam.split('-').map(Number);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        // Início do dia em Brasília (UTC-3) = UTC 03:00
        const start = new Date(Date.UTC(year, month - 1, day, 3, 0, 0, 0));
        // Fim do dia em Brasília = UTC 02:59:59.999 do dia seguinte
        const end = new Date(Date.UTC(year, month - 1, day + 1, 2, 59, 59, 999));
        filter.timestampChegada = { $gte: start, $lte: end };
      }
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


export async function POST(request: NextRequest) {
  console.log("[API] POST /motoristas");
  try {
    const db = await getDatabase();
    const { cpf, retorno, destino, status: statusBody } = await request.json();

    if (!cpf) {
      return NextResponse.json(
        { success: false, erro: "CPF é obrigatório" },
        { status: 400 },
      );
    }

    const cadastro = await db
      .collection("melicages_motoristas_cadastro")
      .findOne({ cpf });

    if (!cadastro) {
      return NextResponse.json(
        { success: false, erro: "CPF não encontrado no cadastro" },
        { status: 404 },
      );
    }

    const ativo = await db.collection("melicages_motoristas").findOne({
      cpf,
      status: { $in: ["em_fila", "descarregando"] },
    });

    if (ativo) {
      return NextResponse.json(
        { success: false, erro: "Motorista já está na fila ou descarregando" },
        { status: 409 },
      );
    }

    const agora = new Date();
    const dataChegada = agora.toLocaleDateString("pt-BR", { timeZone: TZ });
    const horaChegada = agora.toLocaleTimeString("pt-BR", { timeZone: TZ });

    const motoristaBase = {
      cpf:                 cadastro.cpf,
      nome:                cadastro.nome,
      chave_identificacao: cadastro.chave_identificacao,
      destino:             destino || cadastro.destino_xpt || "",
      retorno:             retorno || "",
      status:              statusBody || "em_fila",
      tipo:                'gaiolas',
      dataChegada,
      horaChegada,
      timestampChegada:           agora,
      tempoFila:                  0,
      tempoDescarga:              0,
      timestampInicioDescarga:    null,
      timestampFimDescarga:       null,
      doca:                       null,
      docaNotifiedAt:             null,
      gaiolas:                    null,
      palets:                     null,
      mangas:                     null,
    };


    const result = await db
      .collection("melicages_motoristas")
      .insertOne(motoristaBase);

    const novoId = result.insertedId.toString();

    const firestoreData: Record<string, any> = {
      id:                       novoId,
      cpf:                      motoristaBase.cpf,
      nome:                     motoristaBase.nome,
      chave_identificacao:      motoristaBase.chave_identificacao,
      destino:                  motoristaBase.destino,
      retorno:                  motoristaBase.retorno,
      status:                   motoristaBase.status,
      tipo:                    'gaiolas',
      dataChegada:              motoristaBase.dataChegada,
      horaChegada:              motoristaBase.horaChegada,
      timestampChegada:         agora.toISOString(),
      tempoFila:                0,
      tempoDescarga:            0,
      timestampInicioDescarga:  null,
      timestampFimDescarga:     null,
      doca:                     null,
      docaNotifiedAt:           null,
      gaiolas:                  null,
      palets:                   null,
      mangas:                   null,
    };

    await dbFirestore
      .collection(FIRESTORE_COLLECTION)
      .doc(novoId)
      .set(firestoreData);

    console.log(`[API] Motorista registrado — id: ${novoId}, status: ${motoristaBase.status}`);

    return NextResponse.json(
      { success: true, data: firestoreData },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("[API] POST /motoristas error:", error);
    return NextResponse.json(
      { success: false, erro: "Erro interno" },
      { status: 500 },
    );
  }
}