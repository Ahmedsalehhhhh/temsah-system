import {storeMedia,readMedia} from '../lib/privateMedia.js'
import { requirePermission, can } from '../lib/permissions.js'
import { Router, json } from 'express'
import { requireAuth } from '../middleware/auth.js'
import GameTrackerRecord from '../models/GameTrackerRecord.js'
import { requireTrackerAccess, requireTrackerCreate, trackerInput, trackerQuery, trackerView } from '../lib/gameTracker.js'
import { assertPeriodOpen } from './_guards.js'
const requireFinanceWrite = requirePermission('finance', 'write')
const router = Router()
router.use(requireAuth, requirePermission('finance'))
router.use(requireTrackerAccess)
// Deny non-admin mutation attempts before parsing request bodies.
router.use((req,res,next) => {
  if (['PATCH','DELETE'].includes(req.method) && !can(req.user, 'game-tracker', 'write')) return res.status(403).json({message:'Admin required'})
  if (!['GET','POST','HEAD','PATCH','DELETE'].includes(req.method)) return res.set('Allow','GET, HEAD, POST, PATCH, DELETE').status(405).json({message:'Method not allowed'})
  next()
})
router.patch('/:id', requireFinanceWrite, json({limit:'13mb'}), async(req,res,next) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.status(400).json({message:'Invalid record ID'})
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) || !Object.keys(req.body).length) return res.status(400).json({message:'Provide fields to update'})
    const row = await GameTrackerRecord.findById(req.params.id)
    if (!row) return res.status(404).json({message:'Record not found'})
    const {id,created_at,photoForPayment,photoFromUs,purchaseProof,...base} = trackerView(row)
    const fields = trackerInput({...base,...req.body})
    for (const kind of ['photoForPayment','photoFromUs','purchaseProof']) if (!Object.hasOwn(req.body,kind)) delete fields[kind]
    for(const k of ['photoForPayment','photoFromUs','purchaseProof'])if(fields[k])fields[k]=await storeMedia(fields[k]);
    const updated = await GameTrackerRecord.adminUpdate(req.user,req.params.id,fields)
    if (!updated) return res.status(404).json({message:'Record not found'})
    res.json(trackerView(updated))
  } catch(e) { next(e) }
})
router.delete('/:id', requireFinanceWrite, async(req,res,next) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.status(400).json({message:'Invalid record ID'})
    const deleted = await GameTrackerRecord.adminDelete(req.user,req.params.id)
    if (!deleted) return res.status(404).json({message:'Record not found'})
    res.json({id:req.params.id,deleted:true})
  } catch(e) { next(e) }
})
router.get('/', async(req,res,next) => {
  try {
    const {filter,page,limit} = trackerQuery(req.query)
    const [rows,total] = await Promise.all([GameTrackerRecord.find(filter).sort({created_at:-1,_id:-1}).skip((page-1)*limit).limit(limit),GameTrackerRecord.countDocuments(filter)])
    res.set('Cache-Control','private, no-store').json({records:rows.map(trackerView),total,page,limit})
  } catch(e) { next(e) }
})
router.post('/', requireTrackerCreate, json({limit:'13mb'}), async(req,res,next) => {
  try {
    if (!req.body.periodId) return res.status(400).json({message:'Payroll period is required'})
    await assertPeriodOpen(req.body.periodId)
    const { periodId, ...input } = req.body
    const fields=trackerInput(input);for(const k of ['photoForPayment','photoFromUs','purchaseProof'])if(fields[k])fields[k]=await storeMedia(fields[k]);const row = await GameTrackerRecord.create({...fields,periodId,createdBy:req.user._id})
    res.status(201).json(trackerView(row))
  } catch(e) { next(e) }
})
router.get('/:id/photos/:kind', async(req,res,next) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id) || !['photoForPayment','photoFromUs','purchaseProof'].includes(req.params.kind)) return res.status(400).json({message:'معرّف صورة غير صالح'})
    const row = await GameTrackerRecord.findById(req.params.id).select('+'+req.params.kind+'.data')
    const photo = row?.[req.params.kind]
    if (!photo?.data && !photo?.publicId) return res.status(404).json({message:'الصورة غير موجودة'})
    res.set({'Content-Type':photo.mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'inline','Content-Security-Policy':"sandbox; default-src 'none'"}).send(await readMedia(photo))
  } catch(e) { next(e) }
})
export default router
