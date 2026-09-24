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

function isTikTokSupportConversation(message, history = [], hasImage = false) {
  if (hasImage) return true
  const normalize = value => String(value || '').toLowerCase()
    .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/[ً-ْـ]/g, '')
  const supportTerms = /(تيك\s?توك|tiktok|لايف|live|بث|ستريمر|مبدع|creator|حساب|اكونت|فيديو|محتوى|مشاهدات|صفحه لك|for you|وصول|هدايا|دايموند|diamond|ارباح|تربح|حظر|بان|اتقفل|مقفول|تقييد|مخالف|اشعار|استئناف|appeal|طعن|تعليقات|متابعين|لايكات|سبام|انتحال|integrity|اصاله|اصالة|سياسه|سياسة المنصه|بلاغ)/
  const current = normalize(message)
  if (supportTerms.test(current)) return true
  const looksLikeFollowUp = current.split(/\s+/).length <= 15
    && /^(طب|طيب|تمام|وبعدين|اعمل|نعمل|ازاي|ليه|يعني|ده|دي|دول|كده|بعد|ممكن|هو|هي|ولو|طب لو)|اعمل ايه|الخطوه الجايه|اكمل ازاي/.test(current)
  if (!looksLikeFollowUp) return false
  const recentUserContext = history.filter(item => item.role === 'user').slice(-4).map(item => normalize(item.content)).join(' ')
  return supportTerms.test(recentUserContext)
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
    const history = cleanHistory(req.body?.history)
    const supportCase = isTikTokSupportConversation(query, history, Boolean(image))
    const supportQuery = supportCase
      ? [...history.filter(item => item.role === 'user').slice(-4).map(item => item.content), query].join('\n')
      : query
    const matchedSources = supportCase ? [...new Set(relevantKnowledge(supportQuery, 5).flatMap(item => item.sources))].slice(0, 4) : []
    if (!process.env.OPENAI_API_KEY) {
      if (!supportCase) {
        return res.json({
          answer: 'المحادثة الذكية غير متاحة حاليًا. اطلب من الإدارة مراجعة إعداد OpenAI، أو اسألني عن مشكلة TikTok وسأستخدم قاعدة المعرفة المتاحة.',
          sources: [], mode: 'knowledge', needsEscalation: false, supportCase: false,
        })
      }
      const fallback = fallbackAnswer(query)
      return res.json({
        ...fallback,
        mode: 'knowledge',
        supportCase: true,
      })
    }

    const userText = supportCase
      ? `${query}\n\nقاعدة المعرفة ذات الصلة بمشكلة TikTok الحالية:\n${knowledgePrompt(supportQuery)}`
      : query
    const userContent = [{ type: 'input_text', text: userText }]
    if (image) userContent.push({ type: 'input_image', image_url: image })
    const model = process.env.OPENAI_MODEL || 'gpt-5-mini'
    const requestBody = {
      model,
      instructions: assistantInstructions,
      input: [...history, { role: 'user', content: userContent }],
      max_output_tokens: 1400,
      text: { verbosity: 'low' },
      store: false,
      safety_identifier: createHash('sha256').update(String(req.user._id)).digest('hex'),
    }
    if (model.startsWith('gpt-5')) requestBody.reasoning = { effort: 'low' }
    let apiResponse
    let answer = ''
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 35_000)
      try {
        apiResponse = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        })
        if (!apiResponse.ok) break
        const data = await apiResponse.json()
        answer = outputText(data)
        if (answer) break
        if (attempt === 1) throw new Error('Empty assistant response')
      } catch (error) {
        if (error?.name === 'AbortError' || attempt === 1) throw error
        console.warn('Support assistant connection retry:', error?.name || 'Error')
      } finally { clearTimeout(timer) }
    }

    if (!apiResponse.ok) {
      const detail = await apiResponse.text()
      console.error('Support assistant API error:', apiResponse.status, detail.slice(0, 500))
      if (!supportCase) {
        return res.json({ answer: 'حصل عطل مؤقت في المحادثة الذكية. جرّب تبعت رسالتك مرة تانية بعد لحظات.', sources: [], mode: 'knowledge', supportCase: false, needsEscalation: false })
      }
      const fallback = fallbackAnswer(query)
      return res.json({ ...fallback, mode: 'knowledge', supportCase })
    }
    res.json({ answer, sources: matchedSources, mode: 'ai', needsEscalation: false, supportCase })
  } catch (error) {
    if (error?.name === 'AbortError') {
      const history = cleanHistory(req.body?.history)
      const supportCase = isTikTokSupportConversation(req.body?.message, history, Boolean(req.body?.image))
      if (!supportCase) {
        return res.json({ answer: 'الرد اتأخر المرة دي. جرّب تبعت رسالتك تاني.', sources: [], mode: 'knowledge', supportCase: false, needsEscalation: false })
      }
      const fallback = fallbackAnswer(req.body?.message)
      return res.json({ ...fallback, mode: 'knowledge', supportCase: true })
    }
    if (error?.status && error.status < 500) return next(error)
    console.error('Support assistant request failed:', error?.name || 'Error', error?.message || '')
    const history = cleanHistory(req.body?.history)
    const supportCase = isTikTokSupportConversation(req.body?.message, history, Boolean(req.body?.image))
    if (!supportCase) {
      return res.json({
        answer: 'حصل عطل مؤقت في المحادثة الذكية. ابعت رسالتك تاني بعد لحظات.',
        sources: [], mode: 'knowledge', supportCase: false, needsEscalation: false,
      })
    }
    const fallback = fallbackAnswer(req.body?.message)
    return res.json({ ...fallback, mode: 'knowledge', supportCase: true })
  }
})

export default router
