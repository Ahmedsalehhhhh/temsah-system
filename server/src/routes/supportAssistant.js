import { createHash } from 'node:crypto'
import { Router, json } from 'express'
import { rateLimit } from 'express-rate-limit'
import { requireAuth } from '../middleware/auth.js'
import { assistantInstructions, fallbackAnswer, knowledgePrompt, relevantKnowledge } from '../lib/tiktokKnowledge.js'

const router = Router()
const allowedRoles = new Set(['ADMIN', 'SUPER_ADMIN', 'MANAGEMENT', 'ACCOUNTANT', 'EMPLOYEE'])

router.use(
  rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'طلبات كثيرة؛ انتظر دقيقة وحاول مرة أخرى' } }),
  requireAuth,
  json({ limit: '5mb' }),
  (req, res, next) => {
    if (!allowedRoles.has(req.user?.role)) return res.status(403).json({ message: 'المساعد متاح لموظفي الوكالة فقط' })
    res.set('Cache-Control', 'private, no-store')
    next()
  },
)

function cleanHistory(value) {
  if (!Array.isArray(value)) return []
  return value.slice(-8).map(item => ({
    role: item?.role === 'assistant' ? 'assistant' : 'user',
    content: String(item?.content || '').trim().slice(0, 4000),
  })).filter(item => item.content)
}

function parseImage(value) {
  if (!value) return null
  const image = String(value)
  if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image)) {
    const error = new Error('الصورة يجب أن تكون PNG أو JPG أو WEBP')
    error.status = 400
    throw error
  }
  if (Buffer.byteLength(image, 'utf8') > 4_500_000) {
    const error = new Error('حجم الصورة أكبر من المسموح')
    error.status = 400
    throw error
  }
  return image
}

function outputText(response) {
  if (typeof response?.output_text === 'string' && response.output_text.trim()) return response.output_text.trim()
  return (response?.output || []).flatMap(item => item?.content || [])
    .filter(item => item?.type === 'output_text' && item.text).map(item => item.text).join('\n').trim()
}

router.get('/status', (req, res) => {
  res.json({ aiEnabled: Boolean(process.env.OPENAI_API_KEY), model: process.env.OPENAI_MODEL || 'gpt-5-mini' })
})

router.post('/chat', async (req, res, next) => {
  try {
    const message = String(req.body?.message || '').trim().slice(0, 4000)
    const image = parseImage(req.body?.image)
    if (!message && !image) return res.status(400).json({ message: 'اكتب السؤال أو أرفق صورة' })

    const query = message || 'حلل إشعار TikTok المرفق وحدد نوع المشكلة والخطوات الآمنة التالية'
    const matchedSources = [...new Set(relevantKnowledge(query, 5).flatMap(item => item.sources))].slice(0, 4)
    if (!process.env.OPENAI_API_KEY) {
      const fallback = fallbackAnswer(query)
      return res.json({
        ...fallback,
        mode: 'knowledge',
        notice: image && !message ? 'قراءة الصورة تحتاج تفعيل الذكاء الاصطناعي؛ اكتب نص الإشعار الظاهر في الصورة.' : undefined,
      })
    }

    const history = cleanHistory(req.body?.history)
    const userContent = [{ type: 'input_text', text: `${query}\n\nقاعدة المعرفة ذات الصلة:\n${knowledgePrompt(query)}` }]
    if (image) userContent.push({ type: 'input_image', image_url: image })
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 30_000)
    let apiResponse
    try {
      apiResponse = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-5-mini',
          instructions: assistantInstructions,
          input: [...history, { role: 'user', content: userContent }],
          max_output_tokens: 900,
          store: false,
          safety_identifier: createHash('sha256').update(String(req.user._id)).digest('hex'),
        }),
        signal: controller.signal,
      })
    } finally { clearTimeout(timer) }

    if (!apiResponse.ok) {
      const detail = await apiResponse.text()
      console.error('Support assistant API error:', apiResponse.status, detail.slice(0, 500))
      const fallback = fallbackAnswer(query)
      return res.json({ ...fallback, mode: 'knowledge', notice: 'تعذر تشغيل الذكاء الاصطناعي؛ تم استخدام قاعدة المعرفة.' })
    }
    const data = await apiResponse.json()
    const answer = outputText(data)
    if (!answer) throw new Error('Empty assistant response')
    res.json({ answer, sources: matchedSources, mode: 'ai', needsEscalation: false })
  } catch (error) {
    if (error?.name === 'AbortError') {
      const fallback = fallbackAnswer(req.body?.message)
      return res.json({ ...fallback, mode: 'knowledge', notice: 'استغرق الرد وقتًا طويلًا؛ تم استخدام قاعدة المعرفة.' })
    }
    next(error)
  }
})

export default router
