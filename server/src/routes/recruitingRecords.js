import { requirePermission } from '../lib/permissions.js'
import { Router } from 'express'
import RecruitingRecord from '../models/RecruitingRecord.js'
import { requireAuth } from '../middleware/auth.js'
import { assertPeriodOpen } from './_guards.js'

const router = Router()
router.use(requireAuth, requirePermission('finance'))

router.get('/payroll/:periodId',async(req,res,next)=>{try{res.json(await RecruitingRecord.find({period:req.params.periodId}).populate('recruiter','name'))}catch(e){next(e)}})
router.get('/:periodId', async (req, res, next) => {
  try {
    res.json(await RecruitingRecord.find({ period: req.params.periodId }).populate('recruiter', 'name'))
  } catch (err) { next(err) }
})

router.post('/:periodId', async (req, res, next) => {
  try {
    await assertPeriodOpen(req.params.periodId)
    const { recruiter, user, tier, score, days, hours } = req.body
    if (!recruiter || !user || !tier) {
      return res.status(400).json({ message: 'الريكروتر واسم المستخدم والـ Tier مطلوبين' })
    }
    if (![1,2,3,4,5].includes(Number(tier)) || [score ?? 0, days ?? 0, hours ?? 0].some(v => !Number.isFinite(Number(v)) || Number(v) < 0) || Number(days) > 31 || Number(hours) > 744) return res.status(400).json({message:'راجع الفئة والأيام والساعات والـ Score'})
    const record = await RecruitingRecord.create({
      period: req.params.periodId, recruiter, user, tier, score, days, hours,
    })
    res.status(201).json(record)
  } catch (err) { next(err) }
})

router.delete('/:periodId/:recordId', async (req, res, next) => {
  try {
    await assertPeriodOpen(req.params.periodId)
    const deleted = await RecruitingRecord.findOneAndDelete({_id:req.params.recordId,period:req.params.periodId})
    if (!deleted) return res.status(404).json({message:'السجل غير موجود في هذه الفترة'})
    res.status(204).end()
  } catch (err) { next(err) }
})

export default router
