import {Router} from 'express'
import mongoose from 'mongoose'
import {requireAuth} from '../middleware/auth.js'
import {requirePermission,isAdminOrAbove} from '../lib/permissions.js'
import {objectId,fail} from '../lib/attendance.js'
import Period from '../models/Period.js'
import Withdrawal from '../models/SalaryWithdrawal.js'
import {salaryLedger} from '../lib/salaryLedger.js'
const router=Router(),run=fn=>async(req,res,next)=>{try{await fn(req,res)}catch(e){next(e)}};
router.use(requireAuth,requirePermission('salaries'));
router.get('/:period',run(async(req,res)=>{const period=objectId(req.params.period);if(!await Period.findById(period))throw fail(404,'الفترة غير موجودة');res.json(await salaryLedger(period))}));
async function lockPeriod(period,session){const p=await Period.findOneAndUpdate({_id:period,status:'open'},{$inc:{payrollRevision:1}},{session,new:true});if(!p)throw fail(409,'الفترة غير موجودة أو مقفولة')}
router.post('/:period/withdrawals',run(async(req,res)=>{
 const period=objectId(req.params.period),{source,amount,note='',requestId}=req.body;
 if(typeof amount!=='number'||!Number.isFinite(amount)||amount<=0||amount>1e9||Math.abs(amount*100-Math.round(amount*100))>0.00001)throw fail(400,'اكتب مبلغ سحب صحيح بحد أقصى منزلتين عشريتين');
 if(typeof source!=='string'||! /^(employee|recruiter):[a-f\d]{24}$/i.test(source)||typeof requestId!=='string'||! /^[a-z\d-]{16,80}$/i.test(requestId)||typeof note!=='string'||note.length>500)throw fail(400,'بيانات السحب غير صالحة');
 let result;await mongoose.connection.transaction(async session=>{
  await lockPeriod(period,session);const existing=await Withdrawal.findOne({period,requestId}).session(session);if(existing){if(existing.source!==source||existing.amountMinor!==Math.round(amount*100)||existing.note!==note)throw fail(409,'طلب السحب مستخدم ببيانات مختلفة');result=existing;return}
  const row=(await salaryLedger(period,session)).find(r=>r.sources.includes(source));if(!row)throw fail(404,'الموظف غير موجود');if(Math.round(amount*100)>Math.round(row.remaining*100))throw fail(409,'مبلغ السحب أكبر من المتبقي');
  [result]=await Withdrawal.create([{period,source,name:row.name,amountMinor:Math.round(amount*100),note,requestId,createdBy:req.user._id}],{session});
 });res.status(201).json(result)
}));
router.post('/:period/withdrawals/:id/void',run(async(req,res)=>{if(!isAdminOrAbove(req.user.role))throw fail(403,'إلغاء السحب للأدمن فقط');const period=objectId(req.params.period),id=objectId(req.params.id);await mongoose.connection.transaction(async session=>{await lockPeriod(period,session);const result=await Withdrawal.findOneAndUpdate({_id:id,period,voidedAt:null},{$set:{voidedAt:new Date(),voidedBy:req.user._id}},{session,new:true});if(!result)throw fail(404,'السحب غير موجود أو ملغي بالفعل')});res.json({ok:true})}));
export default router
