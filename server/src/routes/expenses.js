import {storeMedia,readMedia} from '../lib/privateMedia.js'
import {companyScope} from '../lib/recordScope.js'
import { requirePermission } from '../lib/permissions.js'
import { Router, json } from 'express'
import Company from '../models/Company.js'
import Expense from '../models/Expense.js'
import { requireAuth } from '../middleware/auth.js'
import { assertPeriodOpen } from './_guards.js'
import { validId, expenseInput, expenseView } from '../lib/expenses.js'
const router = Router()
router.use(requireAuth, requirePermission('finance'))
router.use(json({ limit: '5mb' }))
const DEFAULT_CATEGORIES = ['رواتب','إيجار','إعلانات وتسويق','أجهزة ومعدات','اشتراكات','انتقالات','مرافق','صيانة','ضيافة','غير مصنف']
async function scope(req, write = false) {
  const company = validId(req.query.companyId)
  const period = validId(req.query.periodId)
  if (!await Company.exists({ _id: company, ...companyScope(req.user) })) throw Object.assign(new Error('الشركة غير موجودة'), { status: 404 })
  if (write) await assertPeriodOpen(period)
  return { company, period }
}
router.get('/', async (req,res,next) => {
  try {
    const filter = await scope(req)
    const rows = await Expense.find(filter).sort({ date: -1, createdAt: -1 })
    res.json({ expenses: rows.map(expenseView), total: rows.reduce((sum,r) => sum+r.amountMinor,0)/100 })
  } catch(e) { next(e) }
})
router.get('/summary', async (req,res,next) => {
  try {
    const period = validId(req.query.periodId)
    const companies = await Company.find(companyScope(req.user)).select('_id name').lean()
    const ids = companies.map(row => row._id)
    const rows = ids.length ? await Expense.find({ period, company: { $in: ids } }).select('company category amountMinor').lean() : []
    const byCategory = new Map(), byCompany = new Map()
    let totalMinor = 0
    for (const row of rows) {
      const category = row.category || 'غير مصنف'
      totalMinor += row.amountMinor
      byCategory.set(category, (byCategory.get(category) || 0) + row.amountMinor)
      byCompany.set(String(row.company), (byCompany.get(String(row.company)) || 0) + row.amountMinor)
    }
    const categories = [...new Set([...DEFAULT_CATEGORIES, ...byCategory.keys()])]
    res.json({ total: totalMinor / 100, categories,
      byCategory: [...byCategory].map(([category,amount]) => ({ category, amount: amount / 100 })).sort((a,b) => b.amount-a.amount),
      byCompany: companies.map(company => ({ companyId:String(company._id), company:company.name, amount:(byCompany.get(String(company._id))||0)/100 })).sort((a,b)=>b.amount-a.amount) })
  } catch(e) { next(e) }
})
router.post('/', async (req,res,next) => {
  try {
    const filter = await scope(req,true)
    const input=expenseInput(req.body);if(input.receipt)input.receipt=await storeMedia(input.receipt);const row = await Expense.create({ ...filter, ...input, createdBy: req.user._id })
    res.status(201).json(expenseView(row))
  } catch(e) { next(e) }
})
router.patch('/:id', async (req,res,next) => {
  try {
    const filter = { ...await scope(req,true), _id: validId(req.params.id) }
    const input=expenseInput(req.body);if(input.receipt)input.receipt=await storeMedia(input.receipt);const row = await Expense.findOneAndUpdate(filter, { $set: input }, { new: true, runValidators: true })
    if (!row) return res.status(404).json({ message: 'المصروف غير موجود في الشركة والفترة المختارتين' })
    res.json(expenseView(row))
  } catch(e) { next(e) }
})
router.delete('/:id', async (req,res,next) => {
  try {
    const row = await Expense.findOneAndDelete({ ...await scope(req,true), _id: validId(req.params.id) })
    if (!row) return res.status(404).json({ message: 'المصروف غير موجود' })
    res.status(204).end()
  } catch(e) { next(e) }
})
router.get('/:id/receipt', async (req,res,next) => {
  try {
    const row = await Expense.findOne({ ...await scope(req), _id: validId(req.params.id) }).select('+receipt.data')
    if (!row?.receipt?.data && !row?.receipt?.publicId) return res.status(404).json({ message: 'لا يوجد إيصال' })
    res.set({ 'Content-Type': row.receipt.mime, 'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff', 'Content-Disposition': 'inline',
      'Content-Security-Policy': "sandbox; default-src 'none'" })
    res.send(await readMedia(row.receipt))
  } catch(e) { next(e) }
})
export default router
