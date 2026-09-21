import { getDefaultAdminCredentials } from './config/env.js'
import { connectDB, connectionDiagnostic } from './config/db.js'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import User from './models/User.js'

try {
  const { email, password } = getDefaultAdminCredentials()
  await connectDB()
  const existing = await User.findOne({ email })
  if (existing) {
    console.log('Account already exists; no changes made.')
  } else {
    await User.create({
      name: 'Admin', email,
      passwordHash: await bcrypt.hash(password, 10),
      role: 'ADMIN', status: 'ACTIVE',
    })
    console.log('Admin account created from server/.env credentials.')
  }
} catch (error) {
  console.error('Admin setup failed:', connectionDiagnostic(error))
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}
