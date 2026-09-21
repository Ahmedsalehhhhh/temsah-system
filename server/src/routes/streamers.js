import { requirePermission } from '../lib/permissions.js'
import { Router, raw, json } from 'express'
import {validateImportRows} from '../lib/importRows.js'
import mongoose from 'mongoose'
import Settings from '../models/Settings.js'
import { previewWorkbook, validateNames } from '../lib/streamerImport.js'
import Streamer from '../models/Streamer.js'
import StreamerPerformance from '../models/StreamerPerformance.js'
import { requireAuth } from '../middleware/auth.js'
import { assertPeriodOpen } from './_guards.js'

const requireFinanceWrite = requirePermission('finance', 'write')
const router = Router()
router.use(requireAuth, requirePermission('finance'))

router.post('/import/preview', requireFinanceWrite, raw({ type: 'application/octet-stream', limit: '5mb' }), async (req, res, next) => {
  try { res.json(await previewWorkbook(req.body)) } catch (err) { next(err) }
})

router.post('/import', requireFinanceWrite,json({limit:'3mb'}),async(req,res,next)=>{try{
 await assertPeriodOpen(req.body.periodId)
 if(req.body.updateExisting!==undefined&&typeof req.body.updateExisting!=='boolean')return res.status(400).json({message:'اختيار التحديث غير صالح'});
 const parsed=validateImportRows(req.body.rows||req.body.names?.map(name=>({name}))),cfg=await Settings.findById('global')
 let added=0,updated=0,skipped=parsed.duplicates
 await mongoose.connection.transaction(async session=>{
  added=0;updated=0;skipped=parsed.duplicates
  for(const item of parsed.rows){
   let person=await Streamer.findOne({name:item.name}).session(session)
   if(person&&!req.body.updateExisting){skipped++;continue}
   if(!person){[person]=await Streamer.create([{name:item.name,rate:item.rate??cfg?.streamerRules?.defaultRate??0.5,active:true}],{session});added++}
   else {updated++;if(item.rate!==undefined){person.rate=item.rate;await person.save({session})}}
   const monthly=Object.fromEntries(Object.entries(item).filter(([k])=>!['name','rate'].includes(k)))
   if(Object.keys(monthly).length)await StreamerPerformance.updateOne({period:req.body.periodId,streamer:person._id},{$set:monthly},{upsert:true,runValidators:true,session})
  }
 })
 res.json({added,updated,skipped,streamers:await Streamer.find().sort({name:1})})
}catch(e){next(e)}})

// Read-only data for Name & Rates without granting access to the Streamers page.
router.get('/name-rates', async(req,res,next)=>{try{res.json(await Streamer.find({source:'name-rates'}).sort({name:1}))}catch(e){next(e)}})
router.get('/performance/name-rates/:periodId', async(req,res,next)=>{try{
  const rows=await Streamer.find({source:'name-rates'}).select('_id')
  res.json(await StreamerPerformance.find({period:req.params.periodId,streamer:{$in:rows.map(r=>r._id)}}))
}catch(e){next(e)}})
// --- Master data: streamers ---
router.get('/', async (req, res, next) => {
  try {
    res.json(await Streamer.find().sort({ name: 1 }))
  } catch (err) { next(err) }
})

// --- Name & Rates is the source of truth for these linked streamer entries ---
router.post('/name-rates', requireFinanceWrite, async (req, res, next) => {
  try {
    const { name, rate, periodId, bonus = 0, bonusReason = '', deduction = 0, deductionReason = '' } = req.body
    if (!name?.trim()) return res.status(400).json({ message: 'Name is required' })
    if (!periodId) return res.status(400).json({ message: 'An open period is required' })
    await assertPeriodOpen(periodId)
    const settings = await Settings.findById('global')
    const streamer = await Streamer.create({
      name: name.trim(), rate: rate ?? settings?.streamerRules?.defaultRate ?? 0.5, source: 'name-rates',
    })
    await StreamerPerformance.findOneAndUpdate(
      { period: periodId, streamer: streamer._id },
      { $set: { bonus, bonusReason, deduction, deductionReason } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )
    res.status(201).json(streamer)
  } catch (err) { next(err) }
})

router.patch('/:id/name-rates', requireFinanceWrite, async (req, res, next) => {
  try {
    const streamer = await Streamer.findOneAndUpdate(
      { _id: req.params.id, source: 'name-rates' },
      { $set: { rate: req.body.rate } }, { new: true }
    )
    if (!streamer) return res.status(404).json({ message: 'Synced streamer not found' })
    res.json(streamer)
  } catch (err) { next(err) }
})

router.put('/performance/name-rates/:periodId/:streamerId', requireFinanceWrite, async (req, res, next) => {
  try {
    await assertPeriodOpen(req.params.periodId)
    const streamer = await Streamer.findOne({ _id: req.params.streamerId, source: 'name-rates' })
    if (!streamer) return res.status(404).json({ message: 'Synced streamer not found' })
    const { bonus, bonusReason, deduction, deductionReason } = req.body
    const perf = await StreamerPerformance.findOneAndUpdate(
      { period: req.params.periodId, streamer: streamer._id },
      { $set: { bonus, bonusReason, deduction, deductionReason } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )
    res.json(perf)
  } catch (err) { next(err) }
})

router.post('/', requireFinanceWrite, async (req, res, next) => {
  try {
    const { name, rate, writeAccess } = req.body
    if (writeAccess) return res.status(403).json({ message: 'Create login accounts through employee-accounts' })
    if (!name) return res.status(400).json({ message: 'اسم الستريمر مطلوب' })
    const settings = await Settings.findById('global')
    const streamer = await Streamer.create({ name, rate: rate ?? settings?.streamerRules?.defaultRate ?? 0.5 })
    res.status(201).json({ ...streamer.toObject(), writeAccess: Boolean(writeAccess) })
  } catch (err) { next(err) }
})

router.patch('/:id', requireFinanceWrite, async (req, res, next) => {
  try {
    const existing = await Streamer.findById(req.params.id)
    if (existing?.source === 'name-rates' && Object.prototype.hasOwnProperty.call(req.body, 'rate')) {
      return res.status(403).json({ message: 'Rate for synced streamers is managed in Name & Rates' })
    }
    const streamer = await Streamer.findByIdAndUpdate(req.params.id, {$set:Object.fromEntries(Object.entries(req.body).filter(([k])=>['name','rate','active'].includes(k)))}, { new: true,runValidators:true })
    if (!streamer) return res.status(404).json({ message: 'الستريمر غير موجود' })
    res.json(streamer)
  } catch (err) { next(err) }
})

router.post('/bulk-delete', requireFinanceWrite, async (req, res, next) => {
  try {
    const { ids, periodId, confirmed } = req.body
    if (confirmed !== true || !Array.isArray(ids) || !ids.length || ids.length > 10000 ||
        ids.some(id => typeof id !== 'string' || !/^[a-f0-9]{24}$/i.test(id))) {
      return res.status(400).json({ message: 'حدد أسماء صحيحة وأكد الحذف (حتى 10000 اسم)' })
    }
    await assertPeriodOpen(periodId)
    const uniqueIds = [...new Set(ids)]
    let deletedCount = 0
    await mongoose.connection.transaction(async (session) => {
      const filter = { _id: { $in: uniqueIds } }
      await StreamerPerformance.deleteMany({ streamer: { $in: uniqueIds } }, { session })
      const result = await Streamer.deleteMany(filter, { session })
      deletedCount = result.deletedCount
    })
    res.json({ deletedCount, deletedIds: uniqueIds })
  } catch (err) { next(err) }
})

router.delete('/:id', requireFinanceWrite, async (req, res, next) => {
  try {
    await Streamer.findByIdAndDelete(req.params.id)
    await StreamerPerformance.deleteMany({ streamer: req.params.id })
    res.status(204).end()
  } catch (err) { next(err) }
})

// --- Monthly data: performance per period ---
router.get('/performance/:periodId', async (req, res, next) => {
  try {
    res.json(await StreamerPerformance.find({ period: req.params.periodId }))
  } catch (err) { next(err) }
})

router.put('/performance/:periodId/:streamerId', async (req, res, next) => {
  try {
    await assertPeriodOpen(req.params.periodId)
    const streamer = await Streamer.findById(req.params.streamerId)
    const adjustmentFields = ['bonus', 'bonusReason', 'deduction', 'deductionReason']
    if (streamer?.source === 'name-rates' && adjustmentFields.some((key) => Object.prototype.hasOwnProperty.call(req.body, key))) {
      return res.status(403).json({ message: 'Bonus and deduction for synced streamers are managed in Name & Rates' })
    }
    const allowedFields = ['score', 'days', 'hours', 'status', 'bonus', 'bonusReason', 'deduction', 'deductionReason']
    const updates = Object.fromEntries(allowedFields
      .filter((key) => Object.prototype.hasOwnProperty.call(req.body, key))
      .map((key) => [key, req.body[key]]))
    const perf = await StreamerPerformance.findOneAndUpdate(
      { period: req.params.periodId, streamer: req.params.streamerId },
      { $set: updates },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )
    res.json(perf)
  } catch (err) { next(err) }
})

export default router
