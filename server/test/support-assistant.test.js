import './permission-fixture.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import jwt from 'jsonwebtoken'
import User from '../src/models/User.js'
import supportAssistantRouter from '../src/routes/supportAssistant.js'
import { fallbackAnswer, relevantKnowledge } from '../src/lib/tiktokKnowledge.js'

test('assistant understands different Arabic phrasings without exact saved questions', () => {
  const live = relevantKnowledge('الستريمر البث بتاعه اتوقف ومش عارف يفتحه')
  assert.equal(live[0]?.id, 'live-access')

  const reach = relevantKnowledge('المشاهدات وقعت والفيديو مش داخل صفحة لك')
  assert.equal(reach[0]?.id, 'recommendation')
})

test('fallback gives safe actionable guidance and official sources', () => {
  const result = fallbackAnswer('الحساب عليه Integrity بسبب شراء لايكات وعايزين نفك الحظر')
  assert.match(result.answer, /Integrity|التفاعل|التحايل/)
  assert.ok(result.sources.every(source => source.startsWith('https://')))
  assert.match(result.answer, /لا تقترح VPN/i)
})

test('unknown cases request details instead of inventing an answer', () => {
  const result = fallbackAnswer('xyzq unknown')
  assert.equal(result.needsEscalation, true)
  assert.match(result.answer, /محتاج تفاصيل/)
})

test('assistant HTTP route is private and works without an AI key', async t => {
  process.env.JWT_SECRET = 'support-assistant-test-only'
  const oldKey = process.env.OPENAI_API_KEY
  delete process.env.OPENAI_API_KEY
  t.after(() => oldKey === undefined ? delete process.env.OPENAI_API_KEY : process.env.OPENAI_API_KEY = oldKey)
  const actor = { _id: '111111111111111111111111', role: 'EMPLOYEE', status: 'ACTIVE', tokenVersion: 0 }
  t.mock.method(User, 'findById', () => ({ select: async () => actor }))
  const app = express()
  app.use('/assistant', supportAssistantRouter)
  app.use((error, req, res, next) => res.status(error.status || 500).json({ message: error.message }))
  const server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  t.after(() => new Promise(resolve => server.close(resolve)))
  const url = 'http://127.0.0.1:' + server.address().port + '/assistant/chat'
  assert.equal((await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'اللايف اتقفل' }) })).status, 401)
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt.sign({ sub: actor._id }, process.env.JWT_SECRET) },
    body: JSON.stringify({ message: 'اللايف اتقفل ومحتاج أعرف سبب التقييد' }),
  })
  assert.equal(response.status, 200)
  const data = await response.json()
  assert.equal(data.mode, 'knowledge')
  assert.match(data.answer, /LIVE|البث/)
})

test('AI mode sends only authenticated, grounded requests and returns official sources', async t => {
  process.env.JWT_SECRET = 'support-assistant-ai-test-only'
  process.env.OPENAI_API_KEY = 'test-key-not-real'
  process.env.OPENAI_MODEL = 'test-model'
  t.after(() => { delete process.env.OPENAI_API_KEY; delete process.env.OPENAI_MODEL })
  const actor = { _id: '222222222222222222222222', role: 'MANAGEMENT', status: 'ACTIVE', tokenVersion: 0 }
  t.mock.method(User, 'findById', () => ({ select: async () => actor }))
  const originalFetch = globalThis.fetch
  let openAiBody
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (String(url) === 'https://api.openai.com/v1/responses') {
      openAiBody = JSON.parse(options.body)
      return { ok: true, json: async () => ({ output_text: 'راجع إشعار المخالفة ثم قدّم Appeal من نفس الإشعار.' }) }
    }
    return originalFetch(url, options)
  })
  const app = express()
  app.use('/assistant', supportAssistantRouter)
  app.use((error, req, res, next) => res.status(error.status || 500).json({ message: error.message }))
  const server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  t.after(() => new Promise(resolve => server.close(resolve)))
  const response = await originalFetch('http://127.0.0.1:' + server.address().port + '/assistant/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt.sign({ sub: actor._id }, process.env.JWT_SECRET) },
    body: JSON.stringify({ message: 'الفيديو غير مؤهل لصفحة لك، أعمل إيه؟' }),
  })
  assert.equal(response.status, 200)
  const data = await response.json()
  assert.equal(data.mode, 'ai')
  assert.equal(openAiBody.model, 'test-model')
  assert.equal(openAiBody.store, false)
  assert.match(openAiBody.input.at(-1).content[0].text, /قاعدة المعرفة/)
  assert.match(data.sources[0], /^https:\/\//)
  assert.match(openAiBody.safety_identifier, /^[a-f0-9]{64}$/)
})
