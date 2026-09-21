import './config/env.js'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { pathToFileURL } from 'node:url'
import User from './models/User.js'
import { connectDB, connectionDiagnostic } from './config/db.js'
import { environmentStatus } from './config/env.js'
export function readTrackerAccounts(env) {
  const slots = [['SAIF','saif','Saif'],['ACCOUNTANT_1','accountant1','Accountant 1'],['ACCOUNTANT_2','accountant2','Accountant 2'],['ACCOUNTANT_3','accountant3','Accountant 3']]
  const accounts = slots.map(([key,identity,name]) => {
    const email = env['GAME_TRACKER_'+key+'_EMAIL']?.trim().toLowerCase()
    const password = env['GAME_TRACKER_'+key+'_PASSWORD']
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error('Configure a valid GAME_TRACKER_'+key+'_EMAIL')
    if (!password || password.length < 12 || Buffer.byteLength(password,'utf8') > 72) throw new Error('Configure GAME_TRACKER_'+key+'_PASSWORD (12+ characters, maximum 72 UTF-8 bytes)')
    return {identity,name,email,password}
  })
  if (new Set(accounts.map(a=>a.email)).size !== 4) throw new Error('The four email addresses must be distinct')
  if (new Set(accounts.map(a=>a.password)).size !== 4) throw new Error('Use a different initial password for each account')
  return accounts
}
export async function setupTrackerAccounts(env = process.env) {
  console.log('Environment:', environmentStatus)
  let accounts
  try { accounts = readTrackerAccounts(env) } catch (error) {
    console.error('ERROR validation:', error.message)
    for (const slot of ['saif','accountant1','accountant2','accountant3']) console.log('SKIPPED '+slot+': validation failed before any write')
    throw error
  }
  try {
    await connectDB()
    await User.init()
  } catch (error) {
    for (const account of accounts) console.error('ERROR '+account.identity+': database initialization failed; no accounts written')
    throw error
  }
  // Check every identity and email before any write; never claim an unrelated account.
  for (const account of accounts) {
    const existing = await User.findOne({$or:[{email:account.email},{gameTrackerIdentity:account.identity}]})
    if (existing && (existing.email !== account.email || existing.gameTrackerIdentity !== account.identity)) {
      console.error('ERROR '+account.identity+': email or identity conflicts with an existing user')
      for (const other of accounts.filter(a=>a!==account)) console.log('SKIPPED '+other.identity+': preflight conflict; no accounts written')
      throw new Error('An email or Game Tracker slot is already assigned; no existing account will be overwritten')
    }
  }
  for (const account of accounts) {
    try {
    const passwordHash = await bcrypt.hash(account.password,12)
    const result = await User.updateOne({gameTrackerIdentity:account.identity},{$setOnInsert:{name:account.name,email:account.email,passwordHash,role:'ACCOUNTANT',gameTrackerIdentity:account.identity,game_tracker_access:true,game_tracker_create:true}},{upsert:true,runValidators:true})
    console.log((result?.upsertedCount ? 'CREATED ' : 'SKIPPED ')+account.identity+' ('+account.email+'): '+(result?.upsertedCount ? 'account inserted' : 'existing account and password preserved'))
    } catch (error) {
      console.error('ERROR '+account.identity+': account write failed', connectionDiagnostic(error))
      for (const remaining of accounts.slice(accounts.indexOf(account)+1)) console.log('SKIPPED '+remaining.identity+': earlier write failed')
      throw error
    }
  }
  console.log('Game Tracker accounts ready. Existing accounts and passwords were preserved.')
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  setupTrackerAccounts().catch(error => { console.error('Game Tracker setup failed:', connectionDiagnostic(error)); process.exitCode=1 }).finally(()=>mongoose.disconnect())
}
