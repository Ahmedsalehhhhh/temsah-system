import mongoose from 'mongoose'

export function connectionDiagnostic(error) {
  const describe = (e) => ({
    name: e?.name,
    code: e?.code,
    causeName: e?.cause?.name,
    causeCode: e?.cause?.code,
  })
  // Do not serialize the complete error, URI, credentials, or connection options.
  return {
    ...describe(error),
    topology: error?.reason?.type,
    servers: Array.from(error?.reason?.servers ?? [], ([host, server]) => ({
      host, state: server.type, ...describe(server.error),
    })),
  }
}

export async function connectDB() {
  const uri = process.env.MONGO_URI
  if (!uri?.trim()) throw Object.assign(new Error('MONGO_URI is missing. Configure server/.env or the process environment.'), { code: 'MONGO_URI_MISSING' })
  if (!/^mongodb(?:\+srv)?:\/\//.test(uri)) {
    throw Object.assign(new Error('MONGO_URI must start with mongodb:// or mongodb+srv://.'), { code: 'MONGO_URI_SCHEME' })
  }
  mongoose.set('strictQuery', true)
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 10000,
  })
  console.log('MongoDB connected')
}
