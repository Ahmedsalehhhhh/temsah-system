import test from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { connectDB, connectionDiagnostic } from '../src/config/db.js'

test('missing URI fails with a useful code', async () => {
  const previous = process.env.MONGO_URI
  delete process.env.MONGO_URI
  try { await assert.rejects(connectDB(), { code: 'MONGO_URI_MISSING' }) }
  finally { if (previous !== undefined) process.env.MONGO_URI = previous }
})
test('unsupported scheme fails before network access', async () => {
  const previous = process.env.MONGO_URI
  process.env.MONGO_URI = 'https://example.invalid'
  try { await assert.rejects(connectDB(), { code: 'MONGO_URI_SCHEME' }) }
  finally { if (previous === undefined) delete process.env.MONGO_URI; else process.env.MONGO_URI = previous }
})
test('diagnostics report nested causes without leaking credentials', () => {
  const error = { name:'MongooseServerSelectionError', message:'secret-password', reason:{ type:'ReplicaSetNoPrimary', servers:new Map([['host:27017',{type:'Unknown',error:{name:'MongoNetworkError',message:'secret-password',cause:{name:'Error',code:'CERT_HAS_EXPIRED',message:'secret-password'}}}]]) } }
  const result=connectionDiagnostic(error)
  assert.equal(result.servers[0].causeCode,'CERT_HAS_EXPIRED')
  assert.equal(JSON.stringify(result).includes('secret-password'),false)
})
test('connect uses bounded timeouts and keeps certificate validation enabled', async (t) => {
  const previous=process.env.MONGO_URI
  process.env.MONGO_URI='mongodb+srv://example.invalid/test'
  t.mock.method(mongoose,'connect',async(uri,options)=>{
    assert.equal(uri,process.env.MONGO_URI)
    assert.equal(options.serverSelectionTimeoutMS,15000)
    assert.equal(options.connectTimeoutMS,10000)
    assert.equal(options.tlsAllowInvalidCertificates,undefined)
    assert.equal(options.tlsInsecure,undefined)
  })
  try { await connectDB() }
  finally { if(previous===undefined)delete process.env.MONGO_URI;else process.env.MONGO_URI=previous }
})
