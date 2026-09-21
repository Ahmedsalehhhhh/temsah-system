import './config/env.js'
import mongoose from 'mongoose'
import { connectDB, connectionDiagnostic } from './config/db.js'
import User from './models/User.js'

const email = 'ahmedsalehhh7788@gmail.com'
try {
  await connectDB()
  // Only the requested role field is changed; no password fields are read.
  const result = await User.updateOne({ email }, { $set: { role: 'SUPER_ADMIN' } }, { runValidators: true, timestamps: false })
  if (result.matchedCount !== 1) throw Object.assign(new Error('Target account not found'), { code: 'ACCOUNT_NOT_FOUND' })
  const user = await User.findOne({ email }).select('email role').lean()
  if (user?.role !== 'SUPER_ADMIN') throw Object.assign(new Error('Role verification failed'), { code: 'ROLE_NOT_VERIFIED' })
  console.log(JSON.stringify({ email: user.email, role: user.role, verified: true, modified: result.modifiedCount === 1 }))
} catch (error) {
  console.error('SUPER_ADMIN migration failed', connectionDiagnostic(error))
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}
