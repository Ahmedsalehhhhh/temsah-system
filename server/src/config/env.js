import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'

export const envPath = fileURLToPath(new URL('../../.env', import.meta.url))
const inheritedUri = process.env.MONGO_URI
const result = dotenv.config({ path: envPath })
export const environmentStatus = {
  envFileFound: !result.error,
  mongoUriSource: inheritedUri ? 'process environment' : result.parsed?.MONGO_URI ? 'server/.env' : 'missing',
  mongoUriConflict: Boolean(inheritedUri && result.parsed?.MONGO_URI && inheritedUri !== result.parsed.MONGO_URI),
}
if (result.error && result.error.code !== 'ENOENT') {
  throw new Error('Unable to read server/.env: ' + (result.error.code || 'read error'))
}
if (environmentStatus.mongoUriConflict) {
  console.warn('MONGO_URI in the process environment differs from server/.env; the process value takes precedence.')
}

export function getDefaultAdminCredentials() {
  const email = process.env.DEFAULT_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.DEFAULT_ADMIN_PASSWORD

  if (!email) throw new Error('Set DEFAULT_ADMIN_EMAIL')
  if (!password) throw new Error('Set DEFAULT_ADMIN_PASSWORD')

  return { email, password }
}
