import {ownScope} from '../lib/recordScope.js'
import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermission } from '../lib/permissions.js'
import FollowUp from '../models/FollowUp.js'
import { fields, fail, objectId, text } from '../lib/attendance.js'

const router = Router()
const route = fn => async (req, res, next) => { try { await fn(req, res) } catch (err) { next(err) } }
router.use(requireAuth, requirePermission('management'), (req, res, next) => { res.set('Cache-Control', 'private, no-store'); next() })

function category(value) {
  if (!['Management', 'Recruiters'].includes(value)) throw fail(400, 'نوع المتابعة غير صالح')
  return value
}

router.get('/', route(async (req, res) => {
  fields(req.query, ['category', 'status'])
  const query = { ...ownScope(req.user,'follow-ups','createdBy'), category: category(req.query.category || 'Management') }
  if (req.query.status) {
    if (!['Pending', 'Completed'].includes(req.query.status)) throw fail(400, 'حالة غير صالحة')
    query.status = req.query.status
  }
  const rows = await FollowUp.find(query).sort({ updatedAt: -1, _id: -1 })
    .populate('createdBy updates.by', 'name fullName')
  res.json(rows)
}))

router.post('/', route(async (req, res) => {
  fields(req.body, ['category', 'title', 'details', 'nextStep', 'dueDate'])
  const dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null
  if (dueDate && Number.isNaN(dueDate.getTime())) throw fail(400, 'موعد المتابعة غير صالح')
  const row = await FollowUp.create({
    category: category(req.body.category), title: text(req.body.title, 200),
    details: String(req.body.details || '').trim(), nextStep: String(req.body.nextStep || '').trim(),
    dueDate, createdBy: req.user._id,
  })
  res.status(201).json(row)
}))

router.post('/:id/updates', route(async (req, res) => {
  fields(req.body, ['text'])
  const updateText = text(req.body.text)
  const row = await FollowUp.findOneAndUpdate(
    { _id: objectId(req.params.id), ...ownScope(req.user,'follow-ups','createdBy',true), status: 'Pending' },
    { $push: { updates: { text: updateText, by: req.user._id, at: new Date() } } },
    { new: true, runValidators: true }
  ).populate('createdBy updates.by', 'name fullName')
  if (!row) throw fail(409, 'المتابعة مكتملة أو غير موجودة')
  res.json(row)
}))

router.patch('/:id/status', route(async (req, res) => {
  fields(req.body, ['status'])
  if (!['Pending', 'Completed'].includes(req.body.status)) throw fail(400, 'حالة غير صالحة')
  const row = await FollowUp.findOneAndUpdate({_id:objectId(req.params.id),...ownScope(req.user,'follow-ups','createdBy',true)}, {
    $set: { status: req.body.status, completedAt: req.body.status === 'Completed' ? new Date() : null },
  }, { new: true, runValidators: true }).populate('createdBy updates.by', 'name fullName')
  if (!row) throw fail(404, 'المتابعة غير موجودة')
  res.json(row)
}))

router.delete('/:id',route(async(req,res)=>{if(!['ADMIN','SUPER_ADMIN'].includes(req.user.role))throw fail(403,'الحذف للإدارة فقط');const row=await FollowUp.findByIdAndDelete(objectId(req.params.id));if(!row)throw fail(404,'المتابعة غير موجودة');res.json({deleted:true})}))
router.patch('/:id',route(async(req,res)=>{fields(req.body,['title','details','nextStep','dueDate']);const update={};for(const k of ['title','details','nextStep'])if(req.body[k]!==undefined)update[k]=text(req.body[k],k==='title'?200:4000);if(req.body.dueDate!==undefined){update.dueDate=req.body.dueDate?new Date(req.body.dueDate):null;if(update.dueDate&&Number.isNaN(update.dueDate.getTime()))throw fail(400,'تاريخ غير صالح')}const row=await FollowUp.findOneAndUpdate({_id:objectId(req.params.id),...ownScope(req.user,'follow-ups','createdBy',true)},{$set:update},{new:true,runValidators:true});if(!row)throw fail(404,'المتابعة غير موجودة');res.json(row)}))
export default router
