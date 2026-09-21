import User from '../models/User.js'
import {companyScope} from '../lib/recordScope.js'
import { requirePermission } from '../lib/permissions.js'
import { Router } from 'express'
import Company from '../models/Company.js'
import mongoose from 'mongoose'
import Expense from '../models/Expense.js'
import { requireAuth } from '../middleware/auth.js'
import { companyName, validId } from '../lib/expenses.js'
const router = Router()
router.use(requireAuth, requirePermission('expenses'))
router.get('/', async (req,res,next) => {
  try { res.json(await Company.find(companyScope(req.user)).sort({ createdAt: 1 })) } catch(e) { next(e) }
})
router.use((req,res,next)=>req.method==='GET'||['ADMIN','SUPER_ADMIN'].includes(req.user.role)?next():res.status(403).json({message:'إدارة الشركات للأدمن فقط'}))
router.get('/access-options',async(req,res,next)=>{try{if(!['ADMIN','SUPER_ADMIN'].includes(req.user.role))return res.sendStatus(403);res.json(await User.find({}).select('name fullName email').sort({email:1}).lean())}catch(e){next(e)}})
router.post('/', async (req,res,next) => {
  try { res.status(201).json(await Company.create(companyName(req.body.name))) } catch(e) { next(e) }
})
router.patch('/:id', async (req,res,next) => {
  try {
    const row=await Company.findByIdAndUpdate(validId(req.params.id),{$set:companyName(req.body?.name)},{new:true,runValidators:true})
    if(!row)return res.status(404).json({message:'الشركة غير موجودة'})
    res.json(row)
  } catch(e) { next(e) }
})
router.delete('/:id', async (req,res,next) => {
  let session
  try {
    const id=validId(req.params.id)
    if(req.body?.confirm!==true)return res.status(400).json({message:'تأكيد حذف الشركة ومصروفاتها مطلوب'})
    session=await mongoose.startSession()
    await session.withTransaction(async()=>{
      const row=await Company.findOneAndDelete({_id:id},{session})
      if(!row)throw Object.assign(new Error('الشركة غير موجودة'),{status:404})
      await Expense.deleteMany({company:id},{session})
    })
    res.status(204).end()
  } catch(e) { next(e) }
  finally { if(session)await session.endSession() }
})
router.put('/:id/access',async(req,res,next)=>{try{const readers=req.body.employeeIds;if(!Array.isArray(readers)||readers.length>500)throw Object.assign(new Error('اختيار غير صالح'),{status:400});const ids=[...new Set(readers.map(validId))];if(await User.countDocuments({_id:{$in:ids}})!==ids.length)throw Object.assign(new Error('موظف غير موجود'),{status:400});const row=await Company.findByIdAndUpdate(validId(req.params.id),{$set:{expenseReaders:ids}},{new:true,runValidators:true});if(!row)return res.status(404).json({message:'الشركة غير موجودة'});res.json(row)}catch(e){next(e)}})
export default router
