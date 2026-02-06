import { MongoClient, MongoClientOptions } from 'mongodb'

if (!process.env.MONGODB_URI) {
  throw new Error('Por favor, adicione MONGODB_URI no .env.local')
}

const uri = process.env.MONGODB_URI

// ✅ OTIMIZADO para múltiplos usuários
const options: MongoClientOptions = {
  // Pool otimizado para Serverless (Netlify/Vercel)
  maxPoolSize: 50,           // Aumentado para 50 conexões
  minPoolSize: 5,            // Mantém 5 conexões ativas
  maxIdleTimeMS: 10000,      // Fecha conexões ociosas após 10s
  waitQueueTimeoutMS: 10000, // Timeout de espera na fila: 10s
  
  // Timeouts otimizados
  connectTimeoutMS: 5000,    // 5 segundos para conectar
  socketTimeoutMS: 30000,    // 30 segundos para operações
  serverSelectionTimeoutMS: 5000,
  
  // Configurações de retry
  retryWrites: true,
  retryReads: true,
  
  // Compressão (reduz tráfego)
  compressors: ['snappy', 'zlib']
}

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

let client: MongoClient
let clientPromise: Promise<MongoClient>

// Conexão única para toda a aplicação (mais eficiente)
if (!global._mongoClientPromise) {
  client = new MongoClient(uri, options)
  global._mongoClientPromise = client.connect()
    .then(client => {
      console.log('✅ MongoDB conectado com sucesso')
      return client
    })
    .catch(err => {
      console.error('❌ Falha na conexão MongoDB:', err)
      throw err
    })
}

clientPromise = global._mongoClientPromise

// Função helper segura
export async function getDatabase(dbName?: string) {
  try {
    const client = await clientPromise
    const db = client.db(dbName || process.env.MONGODB_DB_NAME || 'brj_transportes')
    return db
  } catch (error) {
    console.error('Erro ao obter database:', error)
    throw error
  }
}

// Método para verificar status do pool (útil para debug)
export async function getConnectionStats() {
  try {
    const client = await clientPromise
    const server = await client.db().admin().serverStatus()
    return {
      connections: server.connections,
      poolSize: options.maxPoolSize,
      available: server.connections?.available || 0
    }
  } catch (error) {
    console.error('Erro ao obter stats:', error)
    return null
  }
}

export default clientPromise