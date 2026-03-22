// import { NextRequest, NextResponse } from "next/server";
// import { getDatabase } from "@/app/lib/mongodb";
// import { dbFirestore, FIRESTORE_COLLECTION } from "@/app/lib/antigofirebaseadmin";

// const TZ = "America/Sao_Paulo";

// export async function GET() {
//   console.log("[API] GET /motoristas");
//   try {
//     const db = await getDatabase();
//     const motoristas = await db
//       .collection("melicages_motoristas")
//       .find({})
//       .sort({ timestampChegada: -1 })
//       .toArray();

//     const data = motoristas.map(({ _id, ...rest }) => ({
//       id: _id.toString(),
//       ...rest,
//     }));

//     return NextResponse.json({ success: true, data });
//   } catch (error: any) {
//     console.error("[API] GET /motoristas error:", error);
//     return NextResponse.json(
//       { success: false, erro: "Erro interno" },
//       { status: 500 },
//     );
//   }
// }

// export async function POST(request: NextRequest) {
//   console.log("[API] POST /motoristas");
//   try {
//     const db = await getDatabase();
//     const { cpf, retorno, destino, status: statusBody } = await request.json();

    
//     if (!cpf) {
//       return NextResponse.json(
//         { success: false, erro: "CPF é obrigatório" },
//         { status: 400 },
//       );
//     }
    
//     const cadastro = await db
//     .collection("melicages_motoristas_cadastro")
//     .findOne({ cpf });
    
//     if (!cadastro) {
//       return NextResponse.json(
//         { success: false, erro: "CPF não encontrado no cadastro" },
//         { status: 404 },
//       );
//     }
    
//     const ativo = await db.collection("melicages_motoristas").findOne({
//       cpf,
//       status: { $in: ["em_fila", "descarregando"] },
//     });
    
//     if (ativo) {
//       return NextResponse.json(
//         { success: false, erro: "Motorista já está na fila ou descarregando" },
//         { status: 409 },
//       );
//     }
    
//     const agora = new Date();
    
//     const dataChegada = agora.toLocaleDateString("pt-BR", { timeZone: TZ });
//     const horaChegada = agora.toLocaleTimeString("pt-BR", { timeZone: TZ });
    
//     console.log('Body recebido no BackEnd:  ' + { cpf: cpf, retorno: retorno, destino: destino, status: statusBody });

//     const motorista = {
//       cpf: cadastro.cpf,
//       nome: cadastro.nome,
//       chave_identificacao: cadastro.chave_identificacao,
//       destino: destino || cadastro.destino_xpt || "",
//       retorno: retorno || "",
//       status: statusBody || "em_fila",
//       dataChegada,   
//       horaChegada,   
//       timestampChegada: agora, 
//       tempoFila: 0,
//       tempoDescarga: 0,
//       timestampInicioDescarga: null,
//       timestampFimDescarga: null,
//       doca: null,
//       docaNotifiedAt: null,
//       gaiolas: null,
//       palets: null,
//       mangas: null,
//     };

//     const result = await db
//       .collection("melicages_motoristas")
//       .insertOne(motorista);

//     const novoId = result.insertedId.toString();
//     const novoMotorista = { ...motorista, id: novoId };

//     const firestoreData = {
//       ...novoMotorista,
//       timestampChegada: agora.toISOString(),
//       timestampInicioDescarga: null,
//       timestampFimDescarga: null,
//       docaNotifiedAt: null,
//     };

//     await dbFirestore
//       .collection(FIRESTORE_COLLECTION)
//       .doc(novoId)
//       .set(firestoreData);

//     console.log(`[API] Motorista registrado — id: ${novoId}, status: ${motorista.status}`);

//     return NextResponse.json(
//       { success: true, data: novoMotorista },
//       { status: 201 },
//     );
//   } catch (error: any) {
//     console.error("[API] POST /motoristas error:", error);
//     return NextResponse.json(
//       { success: false, erro: "Erro interno" },
//       { status: 500 },
//     );
//   }
// }