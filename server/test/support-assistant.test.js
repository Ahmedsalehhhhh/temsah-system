import './permission-fixture.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import jwt from 'jsonwebtoken'
import User from '../src/models/User.js'
import supportAssistantRouter from '../src/routes/supportAssistant.js'
import { assistantInstructions, fallbackAnswer, knowledgeArticles, relevantKnowledge } from '../src/lib/tiktokKnowledge.js'

test('assistant understands different Arabic phrasings without exact saved questions', () => {
  const live = relevantKnowledge('الستريمر البث بتاعه اتوقف ومش عارف يفتحه')
  assert.equal(live[0]?.id, 'live-access')

  const reach = relevantKnowledge('المشاهدات وقعت والفيديو مش داخل صفحة لك')
  assert.equal(reach[0]?.id, 'recommendation')
})

test('Arabic policy catalog covers every major Community Guidelines area', () => {
  const cases = [
    ['واحد هدد شخص بالقتل في البث', 'violence-crime'],
    ['الفيديو فيه كلام كراهية وعنصرية', 'hate-organizations'],
    ['في ابتزاز جنسي واستغلال لقاصر', 'abuse-trafficking'],
    ['حد بيتنمر عليه في التعليقات', 'harassment-bullying'],
    ['الشخص بيقول هقتل نفسي', 'self-harm'],
    ['الفيديو بيدرب الناس على تخسيس خطير', 'eating-body-image'],
    ['بيعمل تحدي خطر وهو سايق العربية', 'dangerous-activities'],
    ['المحتوى فيه عري وإيحاء جنسي', 'sexual-nudity'],
    ['الفيديو فيه دم وإصابة صادمة', 'graphic-content'],
    ['في تعذيب حيوان في الفيديو', 'animal-abuse'],
    ['نشر خبر كاذب عن الانتخابات', 'misinformation'],
    ['فيديو ديب فيك معمول بالذكاء الاصطناعي', 'aigc-edited-media'],
    ['اشترى متابعين ولايكات ببوت', 'fake-engagement'],
    ['الفيديو منسوخ وعليه علامة مائية', 'original-ip'],
    ['بيسوق لموقع مقامرة ورهان', 'gambling'],
    ['بيع مخدرات وفيب على الحساب', 'substances'],
    ['بيع سلاح وكتب رقم التواصل', 'weapons-regulated-trade'],
    ['بعت رابط تصيد ونصب استثماري', 'fraud-scams'],
    ['إعلان مدفوع من غير إفصاح', 'commercial'],
    ['نشر عنوان وبيانات شخصية', 'privacy-security'],
    ['اللايف اتقفل ومش عارف يفتحه', 'live-access'],
    ['الهدايا والدايموند مش ظاهرين', 'gifts-diamonds'],
    ['اتقفل إرسال الرسائل والتعليقات', 'search-links-messages'],
    ['الفيديو مش مؤهل لأرباح Creator Rewards', 'monetization'],
    ['عايز يقدم طعن على حظر الحساب', 'enforcement-appeal'],
  ]
  for (const [query, expected] of cases) assert.equal(relevantKnowledge(query)[0]?.id, expected, query)
})

test('every policy article is Arabic, actionable, classified, and officially sourced', () => {
  assert.ok(knowledgeArticles.length >= 25)
  for (const item of knowledgeArticles) {
    assert.match(item.title, /[\u0600-\u06ff]/)
    assert.match(item.body, /[\u0600-\u06ff]/)
    assert.ok(item.classification.length > 10)
    assert.ok(item.steps.length >= 4)
    assert.ok(item.sources.length >= 1)
    assert.ok(item.sources.every(url => /^https:\/\/(www\.)?(tiktok\.com|support\.tiktok\.com)\//.test(url)))
  }
})

test('fallback gives safe actionable guidance and official sources', () => {
  const result = fallbackAnswer('الحساب عليه Integrity بسبب شراء لايكات وعايزين نفك الحظر')
  assert.match(result.answer, /Integrity|التفاعل|التحايل/)
  assert.ok(result.sources.every(source => source.startsWith('https://')))
  assert.match(result.answer, /VPN|التحايل/i)
})

test('fallback distinguishes a LIVE technical freeze from a moderation closure', () => {
  const freezing = fallbackAnswer('اللايف ساعات بيعلق وبيقطع')
  assert.match(freezing.answer, /النت|الجهاز|التطبيق/)
  assert.doesNotMatch(freezing.answer, /18|العمر/)
  const closed = fallbackAnswer('إيه اللي ممكن يخلي TikTok يقفل اللايف؟')
  assert.match(closed.answer, /مخالف|ضيف|أهلية/)
  assert.match(closed.answer, /إشعار/)
})

test('gift pricing is answered directly without an interrogation chain', () => {
  const result = fallbackAnswer('قولي أسعار هدايا TikTok كلها بالمصري على iOS')
  assert.match(result.answer, /Coins/)
  assert.match(result.answer, /سعر الـCoin|سعر ال.*Coin/)
  assert.match(result.answer, /مش رقم ثابت/)
  assert.match(result.answer, /لقطة واحدة/)
  assert.equal((result.answer.match(/؟/g) || []).length, 0)
  assert.deepEqual(result.sources, ['https://www.tiktok.com/legal/page/row/virtual-items/en'])
  assert.match(assistantInstructions, /جاوب بأفضل معلومة متاحة فورًا/)
  assert.match(assistantInstructions, /ممنوع تسأله سؤال توضيحي تاني مباشرة/)
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
  assert.match(data.answer, /LIVE|البث|اللايف/)
})

test('AI mode sends only authenticated, grounded requests and returns official sources', async t => {
  process.env.JWT_SECRET = 'support-assistant-ai-test-only'
  process.env.OPENAI_API_KEY = 'test-key-not-real'
  process.env.OPENAI_MODEL = 'gpt-5-mini'
  t.after(() => { delete process.env.OPENAI_API_KEY; delete process.env.OPENAI_MODEL })
  const actor = { _id: '222222222222222222222222', role: 'MANAGEMENT', status: 'ACTIVE', tokenVersion: 0 }
  t.mock.method(User, 'findById', () => ({ select: async () => actor }))
  const originalFetch = globalThis.fetch
  let openAiBody
  const openAiBodies = []
  let openAiCalls = 0
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (String(url) === 'https://api.openai.com/v1/responses') {
      openAiCalls++
      openAiBody = JSON.parse(options.body)
      openAiBodies.push(openAiBody)
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
  assert.equal(openAiBody.model, 'gpt-5-mini')
  assert.equal(openAiBody.store, false)
  assert.equal(openAiBody.text.verbosity, 'low')
  assert.equal(openAiBody.max_output_tokens, 1400)
  assert.equal(openAiBody.reasoning.effort, 'low')
  assert.match(openAiBody.input.at(-1).content[0].text, /قاعدة المعرفة/)
  assert.match(data.sources[0], /^https:\/\//)
  assert.match(openAiBody.safety_identifier, /^[a-f0-9]{64}$/)

  const conversationalResponse = await originalFetch('http://127.0.0.1:' + server.address().port + '/assistant/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt.sign({ sub: actor._id }, process.env.JWT_SECRET) },
    body: JSON.stringify({ message: 'ركز كدا معايا' }),
  })
  assert.equal(conversationalResponse.status, 200)
  const conversationalData = await conversationalResponse.json()
  assert.deepEqual(conversationalData.sources, [])
  assert.equal(conversationalData.mode, 'ai')
  assert.equal(conversationalData.supportCase, false)
  assert.equal(openAiCalls, 2)
  assert.doesNotMatch(openAiBodies[1].input.at(-1).content[0].text, /قاعدة المعرفة/)

  const vagueProblemResponse = await originalFetch('http://127.0.0.1:' + server.address().port + '/assistant/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt.sign({ sub: actor._id }, process.env.JWT_SECRET) },
    body: JSON.stringify({ message: 'عندي مشكله عايزك في حاجه' }),
  })
  assert.equal(vagueProblemResponse.status, 200)
  const vagueProblemData = await vagueProblemResponse.json()
  assert.equal(vagueProblemData.mode, 'ai')
  assert.equal(vagueProblemData.supportCase, false)
  assert.equal(openAiCalls, 3)

  const generalResponse = await originalFetch('http://127.0.0.1:' + server.address().port + '/assistant/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt.sign({ sub: actor._id }, process.env.JWT_SECRET) },
    body: JSON.stringify({
      message: 'اشرحلي الفرق بين الشاي والقهوة ببساطة',
      history: [{ role: 'assistant', content: 'أقدر أساعدك في TikTok أو أي موضوع عام.' }],
    }),
  })
  const generalData = await generalResponse.json()
  assert.equal(generalData.mode, 'ai')
  assert.equal(generalData.supportCase, false)
  assert.deepEqual(generalData.sources, [])
  assert.equal(openAiCalls, 4)
  assert.equal(openAiBodies[3].input.at(-1).content[0].text, 'اشرحلي الفرق بين الشاي والقهوة ببساطة')

  const topicSwitchResponse = await originalFetch('http://127.0.0.1:' + server.address().port + '/assistant/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt.sign({ sub: actor._id }, process.env.JWT_SECRET) },
    body: JSON.stringify({
      message: 'قولي عاصمة فرنسا',
      history: [{ role: 'user', content: 'اللايف اتقفل ومحتاج أقدم طعن' }],
    }),
  })
  const topicSwitchData = await topicSwitchResponse.json()
  assert.equal(topicSwitchData.supportCase, false)
  assert.deepEqual(topicSwitchData.sources, [])
  assert.equal(openAiCalls, 5)
  assert.equal(openAiBodies[4].input.at(-1).content[0].text, 'قولي عاصمة فرنسا')
})

test('AI network failure returns the TikTok knowledge answer instead of a server error', async t => {
  process.env.JWT_SECRET = 'support-assistant-network-test-only'
  process.env.OPENAI_API_KEY = 'test-key-not-real'
  t.after(() => { delete process.env.OPENAI_API_KEY })
  const actor = { _id: '333333333333333333333333', role: 'EMPLOYEE', status: 'ACTIVE', tokenVersion: 0 }
  t.mock.method(User, 'findById', () => ({ select: async () => actor }))
  const originalFetch = globalThis.fetch
  t.mock.method(globalThis, 'fetch', async url => {
    if (String(url) === 'https://api.openai.com/v1/responses') throw new TypeError('fetch failed')
    return originalFetch(url)
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
    body: JSON.stringify({ message: 'إيه اللي ممكن يخلي اللايف يتقفل؟' }),
  })
  const data = await response.json()
  assert.equal(response.status, 200)
  assert.equal(data.mode, 'knowledge')
  assert.equal(data.supportCase, true)
  assert.match(data.answer, /LIVE|البث|لايف/)
  assert.equal(data.notice, undefined)
})
