import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/app/lib/mongodb";
import { ObjectId } from "mongodb";
import { dbFirestore, FIRESTORE_COLLECTION } from "@/app/lib/firebaseAdmin";

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

    if (motorista.status !== "em_fila") {
      return NextResponse.json(
        { success: false, erro: ` Motorista não está em fila (status atual: ${motorista.status})` },
        { status: 400 },
      );
    }

    const { doca } = await request.json();

    if (!doca || typeof doca !== "string") {
      return NextResponse.json(
        { success: false, erro: "Campo 'doca' obrigatório e deve ser string" },
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
          doca,
          docaNotifiedAt: motorista.docaNotifiedAt || agora,
        },
      },
    );

    const atualizado = await db
      .collection("melicages_motoristas")
      .findOne({ _id: objectId });
    const { _id, ...rest } = atualizado!;

    const firestoreData = {
      status: "descarregando",
      timestampInicioDescarga: agora.toISOString(),
      tempoFila,                          
      doca,
      docaNotifiedAt: motorista.docaNotifiedAt
        ? new Date(motorista.docaNotifiedAt).toISOString()
        : agora.toISOString(),
      updatedAt: agora.toISOString(),
    };

    await dbFirestore
      .collection(FIRESTORE_COLLECTION)
      .doc(cleanId)
      .set(firestoreData, { merge: true });

    console.log(`[API] Descarga iniciada — id: ${cleanId}, doca: ${doca}, tempoFila: ${tempoFila}s`);

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