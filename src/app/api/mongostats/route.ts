import { NextResponse } from "next/server";
import { getClient } from "@/app/lib/mongodb";

export async function GET() {
  const ambiente = process.env.NODE_ENV;
  try {
    const client = await getClient();
    const serverStats = await client.db().admin().serverStatus();

    const body = {
      updated_at: new Date().toISOString(),
      ambient: ambiente,
      dependencies: {
        database: {
          host: serverStats.host,
          version: serverStats.version,
          localTime: serverStats.localTime,
          connections: {
            current: serverStats.connections.current,
            available: serverStats.connections.available,
            totalCreated: serverStats.connections.totalCreated,
          },
          repl: {
            availabilityZone: serverStats.repl.tags.availabilityZone,
            cacheState: serverStats.repl.tags.cacheState,
            workloadType: serverStats.repl.tags.workloadType,
            region: serverStats.repl.tags.region,
            provider: serverStats.repl.tags.provider,
          },
        },
      },
    };
    return NextResponse.json(body, { status: 200 });
  } catch (err) {
    console.error("Erro detalhado do mongo", err);
    return NextResponse.json(
      { Error: `Falha na conexão com o Banco - ${err}` },
      { status: 500 },
    );
  }
}
