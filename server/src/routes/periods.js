import { requirePermission } from '../lib/permissions.js'
import { Router } from 'express'
import Period from '../models/Period.js'
import Streamer from '../models/Streamer.js'
import StreamerPerformance from '../models/StreamerPerformance.js'
import { requireAuth } from '../middleware/auth.js'

const requireFinanceWrite = requirePermission('finance', 'write')
const router = Router()
router.use(requireAuth, requirePermission('finance'))

router.get('/', async (req, res, next) => {
  try {
    res.json(await Period.find().sort({ createdAt: 1 }))
  } catch (err) {
    next(err)
  }
})

router.post('/', requireFinanceWrite, async (req, res, next) => {
  try {
    const { label } = req.body
    if (!label) return res.status(400).json({ message: 'اسم الفترة مطلوب' })
    const period = await Period.create({ label })
    res.status(201).json(period)
  } catch (err) {
    next(err)
  }
})

router.patch('/:id/close', requireFinanceWrite, async (req, res, next) => {
  try {
    // A rate is master data, so preserve its closing value on every period row.
    const performances = await StreamerPerformance.find({ period: req.params.id, rateSnapshot: null }).select('_id streamer')
    if (performances.length) {
      const streamers = await Streamer.find({ _id: { $in: performances.map((row) => row.streamer) } }).select('_id rate')
      const rates = new Map(streamers.map((row) => [String(row._id), row.rate]))
      await StreamerPerformance.bulkWrite(performances.map((row) => ({
        updateOne: { filter: { _id: row._id }, update: { $set: { rateSnapshot: rates.get(String(row.streamer)) ?? 0 } } },
      })))
    }
    const period = await Period.findByIdAndUpdate(
      req.params.id,
      { status: 'closed', closedAt: new Date() },
      { new: true }
    )
    if (!period) return res.status(404).json({ message: 'الفترة غير موجودة' })
    res.json(period)
  } catch (err) {
    next(err)
  }
})

router.patch('/:id/reopen', requireFinanceWrite, async (req, res, next) => {
  try {
    const period = await Period.findByIdAndUpdate(
      req.params.id,
      { status: 'open', closedAt: null },
      { new: true }
    )
    if (!period) return res.status(404).json({ message: 'الفترة غير موجودة' })
    res.json(period)
  } catch (err) {
    next(err)
  }
})

router.patch('/:id/exchange-rate',requireFinanceWrite,async(req,res,next)=>{try{const value=Number(req.body.egpConversionRate);if(!Number.isFinite(value)||value<=0||value>1000000)return res.status(400).json({message:'سعر الدولار غير صالح'});const period=await Period.findOneAndUpdate({_id:req.params.id,status:'open'},{$set:{egpConversionRate:value}},{new:true,runValidators:true});if(!period)return res.status(409).json({message:'الفترة غير موجودة أو مقفولة'});res.json(period)}catch(e){next(e)}})
export default router
