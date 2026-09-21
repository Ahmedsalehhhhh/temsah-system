import SalaryWithdrawal from '../models/SalaryWithdrawal.js'
import { requirePermission } from '../lib/permissions.js'
import {personInput,identities} from '../lib/personInput.js'
import { Router } from 'express'
import Recruiter from '../models/Recruiter.js'
import RecruitingRecord from '../models/RecruitingRecord.js'
import RecruiterAdjustment from '../models/RecruiterAdjustment.js'
import { requireAuth } from '../middleware/auth.js'
import { assertPeriodOpen } from './_guards.js'

const requireFinanceWrite = requirePermission('finance', 'write')
const router = Router()
router.use(requireAuth, requirePermission('finance'))

router.get('/identity-options',requireFinanceWrite,identities)
router.get('/lookup',async(req,res,next)=>{try{res.json(await Recruiter.find().sort({name:1}).select('name'))}catch(e){next(e)}})
router.get('/', async (req, res, next) => {
  try {
    res.json(await Recruiter.find().sort({ name: 1 }))
  } catch (err) { next(err) }
})

router.post('/', requireFinanceWrite, async (req, res, next) => {
  try {
    const person = await personInput(req.body); const name=person.name
    if (!name) return res.status(400).json({ message: 'اسم الريكروتر مطلوب' })
    res.status(201).json(await Recruiter.create(person))
  } catch (err) { next(err) }
})

router.delete('/:id', requireFinanceWrite, async (req, res, next) => {
  try {
    if(await SalaryWithdrawal.exists({source:'recruiter:'+req.params.id}))return res.status(409).json({message:'لهذا الشخص سجل سحوبات؛ احتفظ بحسابه للحفاظ على السجل المالي'})
    await Recruiter.findByIdAndDelete(req.params.id)
    await RecruitingRecord.deleteMany({ recruiter: req.params.id })
    await RecruiterAdjustment.deleteMany({ recruiter: req.params.id })
    res.status(204).end()
  } catch (err) { next(err) }
})

router.put('/adjustments/:periodId/:recruiterId', async (req, res, next) => {
  try {
    await assertPeriodOpen(req.params.periodId)
    const { bonus, bonusReason, deduction, deductionReason } = req.body
    const adj = await RecruiterAdjustment.findOneAndUpdate(
      { period: req.params.periodId, recruiter: req.params.recruiterId },
      { $set: { bonus, bonusReason, deduction, deductionReason } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )
    res.json(adj)
  } catch (err) { next(err) }
})

router.get('/adjustments/:periodId', async (req, res, next) => {
  try {
    res.json(await RecruiterAdjustment.find({ period: req.params.periodId }))
  } catch (err) { next(err) }
})

export default router
