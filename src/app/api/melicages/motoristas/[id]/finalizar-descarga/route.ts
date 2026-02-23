import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/app/lib/mongodb";
import { ObjectId } from "mongodb";
import { getSocketServer } from "@/app/lib/socket";
import ably from "@/app/lib/ably";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  console.log("[API] PUT /motoristas/[id]/finalizar-descarga");
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

    if (motorista.status !== "descarregando") {
      return NextResponse.json(
        { success: false, erro: "Motorista não está descarregando" },
        { status: 400 },
      );
    }

    const { gaiolas, palets, mangas } = await request.json();

    if (gaiolas === undefined || palets === undefined || mangas === undefined) {
      return NextResponse.json(
        {
          success: false,
          erro: "Campos obrigatórios: gaiolas, palets, mangas",
        },
        { status: 400 },
      );
    }

    const gaiolasNum = parseInt(gaiolas, 10);
    const paletsNum = parseInt(palets, 10);
    const mangasNum = parseInt(mangas, 10);

    if (isNaN(gaiolasNum) || isNaN(paletsNum) || isNaN(mangasNum)) {
      return NextResponse.json(
        { success: false, erro: "Valores devem ser números inteiros" },
        { status: 400 },
      );
    }

    const agora = new Date();
    const tempoDescarga = Math.floor(
      (agora.getTime() -
        new Date(motorista.timestampInicioDescarga).getTime()) /
        1000,
    );

    await db.collection("melicages_motoristas").updateOne(
      { _id: objectId },
      {
        $set: {
          status: "descarregado",
          timestampFimDescarga: agora,
          tempoDescarga,
          gaiolas: gaiolasNum,
          palets: paletsNum,
          mangas: mangasNum,
        },
      },
    );

    // Após atualizar status:
    const filaChannel = ably.channels.get("fila");
    await filaChannel.publish("atualizacao-fila", {});

    const atualizado = await db
      .collection("melicages_motoristas")
      .findOne({ _id: objectId });
    const { _id, ...rest } = atualizado!;

    return NextResponse.json({
      success: true,
      message: "Descarga finalizada",
      data: { ...rest, id: _id.toString() },
    });
  } catch (error: any) {
    console.error(
      "[API] PUT /motoristas/[id]/finalizar-descarga error:",
      error,
    );
    return NextResponse.json(
      { success: false, erro: "Erro interno" },
      { status: 500 },
    );
  }
}
