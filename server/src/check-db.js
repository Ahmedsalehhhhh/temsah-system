import './config/env.js'
import mongoose from 'mongoose'
import { environmentStatus } from './config/env.js'
import { connectDB, connectionDiagnostic } from './config/db.js'

console.log('Connection diagnostic:', {
  node: process.version,
  mongoose: mongoose.version,
  ...environmentStatus,
})
try {
  await connectDB()
  await mongoose.connection.db.command({ ping: 1 })
  console.log('MongoDB ping succeeded')
} catch (error) {
  console.error('MongoDB check failed:', connectionDiagnostic(error))
  if (error.code === 'MONGO_URI_MISSING') console.error('Create server/.env with the real connection settings locally. Do not paste credentials into chat.')
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}
