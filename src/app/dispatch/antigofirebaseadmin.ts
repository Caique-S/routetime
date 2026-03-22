// import * as admin from "firebase-admin";

// // ─────────────────────────────────────────────────────────────────────────────
// // Diagnóstico em desenvolvimento — ajuda a identificar o problema rapidamente
// // ─────────────────────────────────────────────────────────────────────────────
// const PROJECT_ID   = process.env.FIREBASE_PROJECT_ID;
// const CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
// const PRIVATE_KEY  = process.env.FIREBASE_PRIVATE_KEY;

// if (!PROJECT_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
//   const faltando = [
//     !PROJECT_ID   && "FIREBASE_PROJECT_ID",
//     !CLIENT_EMAIL && "FIREBASE_CLIENT_EMAIL",
//     !PRIVATE_KEY  && "FIREBASE_PRIVATE_KEY",
//   ].filter(Boolean);
//   throw new Error(
//     `[firebaseAdmin] Variáveis de ambiente faltando: ${faltando.join(", ")}\n` +
//     `Verifique o arquivo .env.local na raiz do projeto.`
//   );
// }
// const privateKey = PRIVATE_KEY.replace(/\\n/g, "\n");

// const APP_NAME = "melicages-admin";

// function getOrCreateApp(): admin.app.App {
  
//   const existing = admin.apps.find((a) => a?.name === APP_NAME);
//   if (existing) return existing;

//   return admin.initializeApp(
//     {
//       credential: admin.credential.cert({
//         projectId:   PROJECT_ID,
//         clientEmail: CLIENT_EMAIL,
//         privateKey,
//       }),
//     },
//     APP_NAME,
//   );
// }

// const app = getOrCreateApp();

// export const dbFirestore = app.firestore();
// export const FIRESTORE_COLLECTION = "motoristas_fila";