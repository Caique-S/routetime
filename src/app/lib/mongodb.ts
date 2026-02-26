import { MongoClient, MongoClientOptions } from 'mongodb'

if (!process.env.MONGODB_URI) {
  throw new Error('Por favor, adicione MONGODB_URI no .env.local')
}

const uri = process.env.MONGODB_URI
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
}

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

export async function getClient(): Promise<MongoClient> {
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, options)
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
  return global._mongoClientPromise
}

export async function getDatabase(dbName?: string) {
  const client = await getClient()
  return client.db(dbName || process.env.MONGODB_DB_NAME || 'brj_transportes')
}

export async function getConnectionStats() {
  try {
    const client = await getClient()
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









// import { MongoClient, MongoClientOptions } from 'mongodb'

// if (!process.env.MONGODB_URI) {
//   throw new Error('Por favor, adicione MONGODB_URI no .env.local')
// }

// const uri = process.env.MONGODB_URI

// const options: MongoClientOptions = {

//   maxPoolSize: 50,           
//   minPoolSize: 5,            
//   maxIdleTimeMS: 10000,      
//   waitQueueTimeoutMS: 10000, 
  
//   connectTimeoutMS: 5000,    
//   socketTimeoutMS: 30000,    
//   serverSelectionTimeoutMS: 5000,
  
//   retryWrites: true,
//   retryReads: true,
  
//   compressors: ['snappy', 'zlib']
// }

// declare global {
//   var _mongoClientPromise: Promise<MongoClient> | undefined
// }

// let client: MongoClient
// let clientPromise: Promise<MongoClient>

// if (!global._mongoClientPromise) {
//   client = new MongoClient(uri, options)
//   global._mongoClientPromise = client.connect()
//     .then(client => {
//       console.log('✅ MongoDB conectado com sucesso')
//       return client
//     })
//     .catch(err => {
//       console.error('❌ Falha na conexão MongoDB:', err)
//       throw err
//     })
// }

// clientPromise = global._mongoClientPromise

// // Função helper segura
// export async function getDatabase(dbName?: string) {
//   try {
//     const client = await clientPromise
//     const db = client.db(dbName || process.env.MONGODB_DB_NAME || 'brj_transportes')
//     return db
//   } catch (error) {
//     console.error('Erro ao obter database:', error)
//     throw error
//   }
// }

// // Método para verificar status do pool (útil para debug)
// export async function getConnectionStats() {
//   try {
//     const client = await clientPromise
//     const server = await client.db().admin().serverStatus()
//     return {
//       connections: server.connections,
//       poolSize: options.maxPoolSize,
//       available: server.connections?.available || 0
//     }
//   } catch (error) {
//     console.error('Erro ao obter stats:', error)
//     return null
//   }
// }

// export default clientPromise