import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/app/lib/mongodb";
import { ObjectId } from "mongodb";
import ably from "@/app/lib/ably";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  console.log("[API] PUT /motoristas/[id]/iniciar-descarga");
  try {
    const { id } = await params;
    if (!id || id.trim() === "") {
      return NextResponse.json(
        { success: false, erro: "ID não fornecido" },
        { status: 400 },
      );
    }

    const cleanId = id.trim();
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(cleanId);
    } catch {
      return NextResponse.json(
        { success: false, erro: "ID inválido" },
        { status: 400 },
      );
    }

    const db = await getDatabase();
    const motorista = await db
      .collection("melicages_motoristas")
      .findOne({ _id: objectId });

    if (!motorista) {
      return NextResponse.json(
        { success: false, erro: "Motorista não encontrado" },
        { status: 404 },
      );
    }

    if (motorista.status !== "aguardando") {
      return NextResponse.json(
        { success: false, erro: "Motorista não está aguardando" },
        { status: 400 },
      );
    }

    const { doca } = await request.json();
    if (!doca || typeof doca !== "number") {
      return NextResponse.json(
        { success: false, erro: "Campo 'doca' obrigatório e deve ser número" },
        { status: 400 },
      );
    }

    const agora = new Date();
    const tempoFila = Math.floor(
      (agora.getTime() - new Date(motorista.timestampChegada).getTime()) / 1000,
    );

    await db.collection("melicages_motoristas").updateOne(
      { _id: objectId },
      {
        $set: {
          status: "descarregando",
          timestampInicioDescarga: agora,
          tempoFila,
          doca: doca,
          docaNotifiedAt: motorista.docaNotifiedAt || agora,
        },
      },
    );

    // Emite atualização da fila
    const filaChannel = ably.channels.get("fila");
    await filaChannel.publish("atualizacao-fila", {});

    const atualizado = await db
      .collection("melicages_motoristas")
      .findOne({ _id: objectId });
    const { _id, ...rest } = atualizado!;

    return NextResponse.json({
      success: true,
      message: "Descarga iniciada",
      data: { ...rest, id: _id.toString() },
    });
  } catch (error: any) {
    console.error("[API] PUT /motoristas/[id]/iniciar-descarga error:", error);
    return NextResponse.json(
      { success: false, erro: "Erro interno" },
      { status: 500 },
    );
  }
}
