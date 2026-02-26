import { MongoClient, MongoClientOptions } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Por favor, adicione MONGODB_URI no .env.local');
}

const uri = process.env.MONGODB_URI;

const options: MongoClientOptions = {
  maxPoolSize: 50,
  minPoolSize: 5,
  maxIdleTimeMS: 10000,
  waitQueueTimeoutMS: 10000,
  connectTimeoutMS: 5000,
  socketTimeoutMS: 30000,
  serverSelectionTimeoutMS: 5000,
  retryWrites: true,
  retryReads: true,
  compressors: ['snappy', 'zlib']
};

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let client: MongoClient;

async function getClient() {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect()
      .then(client => {
        console.log('✅ MongoDB conectado com sucesso');
        return client;
      })
      .catch(err => {
        console.error('❌ Falha na conexão MongoDB:', err);
        throw err;
      });
  }
  return global._mongoClientPromise;
}

export async function getDatabase(dbName?: string) {
  const client = await getClient();
  const db = client.db(dbName || process.env.MONGODB_DB_NAME || 'brj_transportes');
  return db;
}

export async function getConnectionStats() {
  try {
    const client = await getClient();
    const server = await client.db().admin().serverStatus();
    return {
      connections: server.connections,
      poolSize: options.maxPoolSize,
      available: server.connections?.available || 0
    };
  } catch (error) {
    console.error('Erro ao obter stats:', error);
    return null;
  }
}

export default getClient;