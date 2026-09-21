import { environmentStatus } from './config/env.js'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import User from './models/User.js'
import { connectDB, connectionDiagnostic } from './config/db.js'

console.log('Environment:', environmentStatus)

try {
  await connectDB()
  console.log('Database:', mongoose.connection.name, 'Collection:', User.collection.name)

  for (const key of ['SAIF', 'ACCOUNTANT_1', 'ACCOUNTANT_2', 'ACCOUNTANT_3']) {
    const email = process.env[`GAME_TRACKER_${key}_EMAIL`]?.trim().toLowerCase()
    const password = process.env[`GAME_TRACKER_${key}_PASSWORD`]
    if (!email || !password) { console.log(`${key}: SKIPPED; email or password missing`); continue }
    const user = await User.findOne({ email })
    const matches = user && typeof user.passwordHash === 'string' ? await bcrypt.compare(password, user.passwordHash) : false
    console.log(`${key}:`, { email, exists: Boolean(user), identity: user?.gameTrackerIdentity, passwordMatchesEnv: matches })
    try {
      const response = await fetch(`http://localhost:${process.env.PORT || 5000}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }), signal: AbortSignal.timeout(5000),
      })
      console.log(`${key}: running API login HTTP ${response.status}`)
      await response.body?.cancel()
    } catch { console.log(`${key}: running API unavailable; HTTP login unverified`) }
  }
} catch (error) {
  console.error('Game Tracker diagnostic failed:', connectionDiagnostic(error))
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}
