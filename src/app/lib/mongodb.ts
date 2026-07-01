import { MongoClient, MongoClientOptions } from 'mongodb';

if (!process.env.MONGODB_URI_PREVIEW) {
  throw new Error('Variável MONGODB_URI não encontrada. Adicione-a no .env.local');
}

const  uri  = process.env.MONGODB_URI

const options: MongoClientOptions = {
  maxPoolSize:                50,
  minPoolSize:                5,
  maxIdleTimeMS:              10_000,
  waitQueueTimeoutMS:         10_000,
  connectTimeoutMS:           5_000,
  socketTimeoutMS:            30_000,
  serverSelectionTimeoutMS:   5_000,
  retryWrites:                true,
  retryReads:                 true,
  compressors:                ['snappy', 'zlib'],
};

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export async function getClient(): Promise<MongoClient> {
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri!, options);
    global._mongoClientPromise = client
      .connect()
      .then((c) => {
        console.log('✅ MongoDB conectado');
        return c;
      })
      .catch((err) => {
        console.error('❌ Falha na conexão MongoDB:', err);
        global._mongoClientPromise = undefined;
        throw err;
      });
  }
  return global._mongoClientPromise;
}

export async function getDatabase(dbName?: string) {
  const client = await getClient();
  return client.db(dbName ?? process.env.MONGODB_DB_NAME ?? 'brj_transportes');
}

export async function getConnectionStats() {
  try {
    const client = await getClient();
    const server = await client.db().admin().serverStatus();
    return {
      connections: server.connections,
      poolSize:    options.maxPoolSize,
      available:   server.connections?.available ?? 0,
    };
  } catch (error) {
    console.error('Erro ao obter stats de conexão:', error);
    return null;
  }
}