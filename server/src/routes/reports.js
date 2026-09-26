import {salaryLedger} from '../lib/salaryLedger.js'
import ManagementRecord from '../models/ManagementRecord.js'
import {Router} from 'express'
import mongoose from 'mongoose'
import {requireAuth} from '../middleware/auth.js'
import {can,isAdminOrAbove} from '../lib/permissions.js'
import {taskScope,ownScope,companyScope,canViewAll} from '../lib/recordScope.js'
import {assertPeriodOpen} from './_guards.js'
import {calcStreamer,calcRecruiter,calcStaff} from '../lib/calc.js'
import Streamer from '../models/Streamer.js'
import StreamerPerformance from '../models/StreamerPerformance.js'
import Employee from '../models/Employee.js'
import StaffRow from '../models/StaffRow.js'
import Recruiter from '../models/Recruiter.js'
import RecruitingRecord from '../models/RecruitingRecord.js'
import RecruiterAdjustment from '../models/RecruiterAdjustment.js'
import Settings from '../models/Settings.js'
import Period from '../models/Period.js'
import User from '../models/User.js'
import Company from '../models/Company.js'
import Expense from '../models/Expense.js'
import Attendance from '../models/Attendance.js'
import {attendanceDayView} from '../lib/attendance.js'
import WorkTask from '../models/WorkTask.js'
import FollowUp from '../models/FollowUp.js'
import Problem from '../models/Problem.js'
import GameTrackerRecord from '../models/GameTrackerRecord.js'
const Column=mongoose.model('ReportColumn',new mongoose.Schema({table:String,label:String,type:{type:String,enum:['text','number','date']},createdBy:mongoose.Schema.Types.ObjectId},{timestamps:true}))
const valueSchema=new mongoose.Schema({table:String,period:String,row:String,column:{type:mongoose.Schema.Types.ObjectId,ref:'ReportColumn'},value:mongoose.Schema.Types.Mixed},{timestamps:true});valueSchema.index({table:1,period:1,row:1,column:1},{unique:true})
const Value=mongoose.model('ReportValue',valueSchema)
const router=Router(),route=fn=>async(req,res,next)=>{try{await fn(req,res)}catch(e){next(e)}}
const fail=(status,message)=>Object.assign(new Error(message),{status})
const pageOf=k=>({'management-log':'management-payroll','name-rates':'name-rates','follow-ups':'management',attendance:'attendance-own','recruiting-list':'recruiting-log'}[k]||k)
const valid=['management-log','streamers','name-rates','management-payroll','it','recruiters','recruiting-list','attendance','attendance-and-work','tasks','follow-ups','management','expenses','game-tracker','salaries']
router.use(requireAuth,(req,res,next)=>{res.set('Cache-Control','private, no-store');next()})
const cols=items=>items.map(([key,label])=>({key,label}))
const identity=cols([['name','الاسم'],['email','البريد الإلكتروني']])
const money=cols([['bonus','البونص'],['bonusReason','سبب البونص'],['deduction','الخصم'],['deductionReason','سبب الخصم'],['total','الإجمالي']])
const lean=async q=>{const rows=await q.limit(10001).lean();if(rows.length>10000)throw fail(413,'النتيجة تتجاوز 10000 سجل؛ اختر فترة أصغر');return rows}
const name=u=>u?.fullName||u?.name||''
export async function reportData(user,key,periodId,date){
 if(!valid.includes(key)||!can(user,pageOf(key)))throw fail(403,'ليس لديك صلاحية لهذا الجدول')
 const period=periodId&&mongoose.isValidObjectId(periodId)?await Period.findById(periodId).lean():null
 const cfg=period?.settingsSnapshot||await Settings.findById('global').lean()||new Settings().toObject()
 if(period?.egpConversionRate)cfg.egpConversionRate=period.egpConversionRate
 let rows=[],columns=[],title=key
 if(['management-log','streamers','name-rates','management-payroll','it','recruiters','recruiting-list','expenses','salaries'].includes(key)&&!period)throw fail(400,'اختر فترة رواتب صحيحة')
 if(key==='salaries'){rows=(await salaryLedger(period._id)).map(r=>({id:r.id,name:r.name,email:r.email,departments:r.components.map(c=>c.dept).join(' / '),total:r.total,withdrawn:r.withdrawn,remaining:r.remaining}));columns=[...identity,...cols([['departments','الأقسام'],['total','المستحق EGP'],['withdrawn','المسحوب EGP'],['remaining','المتبقي EGP']])];title='مرتبات الموظفين والسحوبات'
 }else if(key==='management-log'){
 const records=await lean(ManagementRecord.find({period:period?._id,...ownScope(user,'management')}).populate('employee','name email'));rows=records.map(r=>({id:String(r._id),name:r.employee?.name||'',streamer:r.streamer,tier:r.tier,score:r.score,days:r.days,hours:r.hours,amount:cfg.tierAmounts[r.tier]||0}));columns=cols([['name','الموظف'],['streamer','الستريمر'],['tier','Tier'],['score','Score'],['days','الأيام'],['hours','الساعات'],['amount','المكافأة EGP']]);title='سجل الإدارة'
 }else if(['streamers','name-rates'].includes(key)){
  const [people,performances]=await Promise.all([lean(Streamer.find(key==='name-rates'?{source:'name-rates'}:{}).sort({name:1})),lean(StreamerPerformance.find({period:period._id}))]);const by=new Map(performances.map(p=>[String(p.streamer),p]))
  rows=people.map(p=>{const perf=by.get(String(p._id))||{};return {id:String(p._id),name:p.name,...calcStreamer(perf,{...p,rate:perf.rateSnapshot??p.rate},cfg.streamerRules,cfg.egpConversionRate),bonusReason:perf.bonusReason||'',deductionReason:perf.deductionReason||'',status:perf.status||'active'}})
  columns=cols([['name','الاسم'],['score','Score'],['days','Days'],['hours','Hours'],['rate','Rate'],['totalScore','Total Score'],['cash','Cash USD'],...money.map(c=>[c.key,c.label]),['egp','الإجمالي EGP'],['status','الحالة']]);title='الاستريمرز'
 }else if(['management-payroll','it','salaries'].includes(key)){
  const people=await lean(Employee.find(key==='salaries'?{dept:'general'}:{dept:key==='it'?'it':'management'}).sort({name:1})),monthly=await lean(StaffRow.find({period:period._id}));const mgmtRecords=key==='management-payroll'?await lean(ManagementRecord.find({period:period._id})):[];const by=new Map(monthly.map(x=>[String(x.employee),x]));rows=people.map(p=>{const r=by.get(String(p._id))||{};return {id:String(p._id),name:p.name,email:p.email||'',dept:p.dept,role:p.role||p.dept,...calcStaff(r,r.baseSalary??p.baseSalary??cfg.managementItBaseSalary,key==='management-payroll'?calcRecruiter(mgmtRecords.filter(x=>String(x.employee)===String(p._id)),cfg.tierAmounts).amount:0),bonusReason:r.bonusReason||'',deductionReason:r.deductionReason||''}});columns=[...identity,...cols([['role','الدور'],['baseSalary','الأساسي'],['recruiterBonus','مكافأة Tiers']]),...money];title=key==='it'?'IT':key==='salaries'?'مرتبات الموظفين':'مرتبات الإدارة'
 }else if(key==='recruiters'){
  const [people,records,adjustments]=await Promise.all([lean(Recruiter.find().sort({name:1})),lean(RecruitingRecord.find({period:period._id})),lean(RecruiterAdjustment.find({period:period._id}))]);rows=people.map(p=>{const adj=adjustments.find(x=>String(x.recruiter)===String(p._id))||{},calc=calcRecruiter(records.filter(x=>String(x.recruiter)===String(p._id)),cfg.tierAmounts,adj);return {id:String(p._id),name:p.name,email:p.email||'',amount:calc.amount,...Object.fromEntries(Object.entries(calc.counts).map(([k,v])=>['tier'+k,v])),bonus:calc.bonus,deduction:calc.deduction,total:calc.total,bonusReason:adj.bonusReason||'',deductionReason:adj.deductionReason||''}});columns=[...identity,...cols([['tier1','T1'],['tier2','T2'],['tier3','T3'],['tier4','T4'],['tier5','T5'],['amount','العمولة']]),...money];title='الريكروترز'
 }else if(key==='recruiting-list'){
  rows=(await lean(RecruitingRecord.find({period:period._id}).populate('recruiter','name'))).map(x=>({id:String(x._id),name:x.user,recruiter:name(x.recruiter),tier:x.tier,score:x.score,days:x.days,hours:x.hours}));columns=cols([['name','الاسم'],['recruiter','الريكروتر'],['tier','Tier'],['score','Score'],['days','Days'],['hours','Hours']]);title='سجل الريكروتينج'
 }else if(['attendance','attendance-and-work'].includes(key)){
  const day=date||new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());if(!/^\d{4}-\d{2}-\d{2}$/.test(day))throw fail(400,'تاريخ غير صالح')
  const all=key==='attendance-and-work'&&canViewAll(user,key),people=await lean(User.find(all?{}:{_id:user._id}).select('name fullName email')),records=await lean(Attendance.find({workDate:day,userId:{$in:people.map(x=>x._id)}}));rows=people.map(p=>{const r=attendanceDayView(records.filter(x=>String(x.userId)===String(p._id)),new Date(),day);return {id:String(p._id),name:name(p),email:p.email,date:day,periods:(r?.shifts||[]).map(s=>`${s.checkIn?.toISOString?.()||s.checkIn} → ${s.checkOut?.toISOString?.()||s.checkOut||'مفتوحة'}`).join('\n'),hours:(r?.workedSeconds||0)/3600,status:r?(r.status==='Finished'?'انتهى':'يعمل الآن'):'لم يبدأ',updates:r?.workToday||''}});columns=[...identity,...cols([['date','التاريخ'],['periods','فترات العمل'],['hours','ساعات العمل'],['status','الحالة'],['updates','التحديثات']])];title='الحضور والانصراف'
 }else if(key==='tasks'){
  rows=(await lean(WorkTask.find(taskScope(user)).populate('assignedTo userId','name fullName'))).map(r=>({id:String(r._id),name:name(r.assignedTo),text:r.text,status:r.status,by:name(r.userId),date:r.createdAt?.toISOString()}));columns=cols([['name','الموظف'],['text','المهمة'],['status','الحالة'],['by','بواسطة'],['date','التاريخ']]);title='المهام'
 }else if(key==='follow-ups'){
  rows=(await lean(FollowUp.find(ownScope(user,'follow-ups','createdBy')).populate('createdBy','name fullName'))).map(r=>({id:String(r._id),name:r.title,category:r.category,details:r.details,nextStep:r.nextStep,status:r.status,by:name(r.createdBy),updates:(r.updates||[]).map(x=>x.text).join('\n')}));columns=cols([['name','المتابعة'],['category','القسم'],['details','التفاصيل'],['nextStep','الخطوة التالية'],['status','الحالة'],['by','المسؤول'],['updates','التحديثات']]);title='المتابعات'
 }else if(key==='management'){
  rows=(await lean(Problem.find(ownScope(user,key)).populate('userId','name fullName'))).map(r=>({id:String(r._id),name:name(r.userId),problem:r.problem,status:r.state}));columns=cols([['name','الموظف'],['problem','المشكلة'],['status','الحالة']]);title='المشاكل'
 }else if(key==='expenses'){
  const companies=await lean(Company.find(companyScope(user)));rows=(await lean(Expense.find({period:period._id,company:{$in:companies.map(x=>x._id)}}))).map(r=>({id:String(r._id),name:companies.find(x=>String(x._id)===String(r.company))?.name||'',category:r.category||'غير مصنف',amount:r.amountMinor/100,description:r.description||r.note||'',date:r.date}));columns=cols([['name','الشركة'],['category','التصنيف'],['amount','المبلغ'],['description','البيان'],['date','التاريخ']]);title='المصروفات'
 }else if(key==='game-tracker'){
  rows=(await lean(GameTrackerRecord.find(period?{periodId:period._id}:{}))).map(r=>({id:String(r._id),name:r.user,email:r.email,product:r.product,date:r.date,cost:r.costMinor/100,price:r.priceMinor/100,status:r.state,payment:r.paymentMethod}));columns=cols([['name','الاسم'],['email','الإيميل'],['product','المنتج'],['date','التاريخ'],['cost','التكلفة'],['price','السعر'],['status','الحالة'],['payment','طريقة الدفع']]);title='Game Tracker'
 }
 return {key,title,period:period?.label||date||'',columns,rows}
}
router.get('/:key',route(async(req,res)=>{
 const key=req.params.key,report=await reportData(req.user,key,req.query.period,req.query.date),columns=await Column.find({table:key}).sort({createdAt:1}).lean(),values=await Value.find({table:key,period:req.query.period||''}).lean(),by=new Map(values.map(v=>[v.row+':'+v.column,v.value]));for(const row of report.rows)for(const col of columns)row['custom_'+col._id]=by.get(row.id+':'+col._id)??''
 res.json({...report,columns:[...report.columns,...columns.map(c=>({key:'custom_'+c._id,label:c.label,type:c.type,custom:true,id:String(c._id)}))]})
}))
router.post('/:key/columns',route(async(req,res)=>{const key=req.params.key;if(!valid.includes(key)||!can(req.user,pageOf(key),'write')||!isAdminOrAbove(req.user.role))throw fail(403,'إدارة الأعمدة للأدمن فقط');const {label,type}=req.body;if(typeof label!=='string'||!label.trim()||label.length>80||!['text','number','date'].includes(type))throw fail(400,'اسم أو نوع العمود غير صالح');if(await Column.countDocuments({table:key})>=30)throw fail(400,'الحد الأقصى 30 عمودًا');res.status(201).json(await Column.create({table:key,label:label.trim(),type,createdBy:req.user._id}))}))
router.put('/:key/values',route(async(req,res)=>{const key=req.params.key;if(!isAdminOrAbove(req.user.role)||!can(req.user,pageOf(key),'write'))throw fail(403,'غير مسموح');const {period='',row,column,value}=req.body;if(period)await assertPeriodOpen(period);if(!mongoose.isValidObjectId(column))throw fail(400,'عمود غير صالح');const col=await Column.findOne({_id:column,table:key});if(!col)throw fail(404,'العمود غير موجود');const report=await reportData(req.user,key,period,req.body.date);if(!report.rows.some(r=>r.id===row))throw fail(404,'السجل غير موجود');if(typeof value!=='string'&&typeof value!=='number'||String(value).length>2000||col.type==='number'&&value!==''&&!Number.isFinite(Number(value))||col.type==='date'&&value!==''&&!/^\d{4}-\d{2}-\d{2}$/.test(String(value)))throw fail(400,'قيمة غير صالحة');await Value.updateOne({table:key,period,row,column},{$set:{value}},{upsert:true,runValidators:true});res.json({saved:true})}))
export default router
