import {canViewAll,ownScope} from '../lib/recordScope.js'
import { can, requirePermission } from '../lib/permissions.js'
import {Router} from 'express'
import Attendance from '../models/Attendance.js'
import User from '../models/User.js'
import {assertPeriodOpen} from './_guards.js'
import Period from '../models/Period.js'
import {requireAuth} from '../middleware/auth.js'
import {attendanceTimezone,workDate,dayBounds,fail,fields,text,dateValue,objectId,attendanceView,accountView,timestamp} from '../lib/attendance.js'
const requireAttendanceManagement = requirePermission('operations')
const router=Router()
router.use(requireAuth,(req,res,next)=>{res.set('Cache-Control','private, no-store');next()})
const route=fn=>async(req,res,next)=>{try{await fn(req,res)}catch(e){if(e.code===11000)return res.status(409).json({message:'يوجد حضور لهذا اليوم أو وردية مفتوحة بالفعل'});if(e.status)return res.status(e.status).json({message:e.message});next(e)}}
router.get('/employees',(req,res,next)=>can(req.user,'attendance-and-work') || can(req.user,'tasks') ? next() : res.status(403).json({message:'Access denied'}),route(async(req,res)=>{const users=await User.find(req.query.active==='true'?{status:{$ne:'INACTIVE'}}:{}).sort({name:1}).select('name fullName email role status');res.json(users.map(accountView))}))
router.get('/today',requirePermission('attendance-own'),route(async(req,res)=>{
 const now=new Date(),date=workDate(now)
 const row=await Attendance.findOne({userId:req.user._id,$or:[{isOpen:true},{workDate:date}]}).sort({isOpen:-1})
 res.json({serverNow:now,timeZone:attendanceTimezone,date,attendance:attendanceView(row,now),updates:row?.updates||[]})
}))
router.post('/check-in',requirePermission('attendance-own'),route(async(req,res)=>{
 fields(req.body,['periodId']);const periodId=req.body.periodId||(await Period.findOne({status:'open'}).sort({createdAt:-1}).select('_id'))?._id;if(!periodId)throw fail(400,'An open payroll period is required');await assertPeriodOpen(periodId)
 const now=new Date();const row=await Attendance.create({userId:req.user._id,periodId:objectId(periodId),workDate:workDate(now),checkIn:now,isOpen:true})
 res.status(201).json(attendanceView(row,now))
}))
router.post('/check-out',requirePermission('attendance-own'),route(async(req,res)=>{
 fields(req.body,['text','status'])
 const content=typeof req.body.text==='string'&&req.body.text.trim()?text(req.body.text,4000):''
 if(content&&!['Completed','In Progress','Blocked'].includes(req.body.status))throw fail(400,'حالة غير صالحة')
 const now=new Date()
 // A fresh draft is saved with checkout; an already-saved report also unlocks checkout without duplication.
 const query={userId:req.user._id,isOpen:true,'updates.999':{$exists:false},...(content?{}:{'updates.0':{$exists:true}})}
 const change={$set:{checkOut:now,isOpen:false},$inc:{__v:1},...(content?{$push:{updates:{text:content,status:req.body.status,createdAt:now,checkout:true}}}:{})}
 const row=await Attendance.findOneAndUpdate(query,change,{new:true,runValidators:true})
 if(!row)throw fail(409,'اكتب تقرير اليوم أولًا أو تأكد أن الوردية ما زالت مفتوحة')
 res.json(attendanceView(row,now))
}))
router.post('/updates',requirePermission('attendance-own'),route(async(req,res)=>{
 fields(req.body,['text','status']);const content=text(req.body.text,4000)
 if(!['Completed','In Progress','Blocked'].includes(req.body.status))throw fail(400,'حالة غير صالحة')
 const now=new Date();const update={text:content,status:req.body.status,createdAt:now}
 const row=await Attendance.findOneAndUpdate({userId:req.user._id,$or:[{isOpen:true},{workDate:workDate(now)}],'updates.999':{$exists:false}},{$push:{updates:update},$inc:{__v:1}},{new:true,runValidators:true,sort:{isOpen:-1}})
 if(!row)throw fail(409,'سجّل الحضور أولًا؛ الحد الأقصى 1000 تحديث يوميًا')
 res.status(201).json(row.updates[row.updates.length-1])
}))
router.get('/dashboard',requireAttendanceManagement,(req,res,next)=>canViewAll(req.user,'attendance-and-work')?next():res.status(403).json({message:'ليس لديك صلاحية مشاهدة الجميع'}),route(async(req,res)=>{
 fields(req.query,['date','search','employee','status'])
 const now=new Date(),date=dateValue(req.query.date||workDate(now));const query={}
 if(req.query.employee)query._id=objectId(req.query.employee)
 const users=await User.find(query).sort({name:1}).select('-passwordHash').lean()
 const {start,end}=dayBounds(date)
 const records=await Attendance.find({userId:{$in:users.map(u=>u._id)},$or:[{workDate:date},{checkIn:{$lt:end},$or:[{checkOut:{$gt:start}},{isOpen:true}]}]}).sort({workDate:1}).lean()
 const map=new Map(records.map(r=>[String(r.userId),r]))
 let rows=users.filter(u=>(u.status||'ACTIVE')==='ACTIVE'||map.has(String(u._id))).map(u=>({employee:accountView(u),...(attendanceView(map.get(String(u._id)),now)||{id:null,userId:String(u._id),date,checkIn:null,checkOut:null,status:'Not Started',workedSeconds:0,workUpdates:0})}))
 const summary={totalEmployees:rows.length,workingNow:rows.filter(r=>r.status==='Working').length,finishedToday:rows.filter(r=>r.status==='Finished').length,notStarted:rows.filter(r=>r.status==='Not Started').length,totalSeconds:records.reduce((sum,r)=>sum+Math.max(0,Math.floor((Math.min(+(r.checkOut||now),+end)-Math.max(+r.checkIn,+start))/1000)),0)}
 if(req.query.search){const search=text(req.query.search).toLowerCase();rows=rows.filter(r=>(r.employee.fullName+' '+r.employee.email).toLowerCase().includes(search))}
 if(req.query.status){if(!['Working','Finished','Not Started'].includes(req.query.status))throw fail(400,'حالة غير صالحة');rows=rows.filter(r=>r.status===req.query.status)}
 res.json({date,timeZone:attendanceTimezone,serverNow:now,summary,rows})
}))
router.get('/history',(req,res,next)=>can(req.user,'attendance-own') || can(req.user,'attendance-and-work') ? next() : res.status(403).json({message:'Access denied'}),route(async(req,res)=>{
 fields(req.query,['from','to','employee','status','page','scope'])
 const query={};if(req.query.scope==='own'){query.userId=req.user._id;if(req.query.employee)throw fail(403,'Own attendance only')}else if(!canViewAll(req.user, 'attendance-and-work')){if(req.query.employee)throw fail(403,'يمكنك عرض سجلك فقط');query.userId=req.user._id}else if(req.query.employee)query.userId=objectId(req.query.employee)
 if(req.query.from||req.query.to){query.workDate={};if(req.query.from)query.workDate.$gte=dateValue(req.query.from);if(req.query.to)query.workDate.$lte=dateValue(req.query.to);if(req.query.from&&req.query.to&&req.query.from>req.query.to)throw fail(400,'نطاق تاريخ غير صالح')}
 if(req.query.status){if(!['Working','Finished'].includes(req.query.status))throw fail(400,'حالة غير صالحة');query.isOpen=req.query.status==='Working'}
 const page=Number(req.query.page||1);if(!Number.isInteger(page)||page<1||page>100000)throw fail(400,'صفحة غير صالحة')
 const [records,total]=await Promise.all([Attendance.find(query).sort({workDate:-1,_id:-1}).skip((page-1)*30).limit(30).populate('userId','name fullName email role status'),Attendance.countDocuments(query)])
 const now=new Date();res.json({serverNow:now,timeZone:attendanceTimezone,total,page,limit:30,rows:records.map(r=>({...attendanceView({...r.toObject(),userId:r.userId?._id},now),employee:r.userId?accountView(r.userId):null}))})
}))
router.get('/:id',(req,res,next)=>can(req.user,'attendance-own') || can(req.user,'attendance-and-work') ? next() : res.status(403).json({message:'Access denied'}),route(async(req,res)=>{
 const query={_id:objectId(req.params.id)};if(!canViewAll(req.user, 'attendance-and-work'))query.userId=req.user._id
 const row=await Attendance.findOne(query).populate('userId','name fullName email role status')
 if(!row)throw fail(404,'السجل غير موجود')
 res.json({...attendanceView({...row.toObject(),userId:row.userId?._id}),employee:row.userId?accountView(row.userId):null,updates:row.updates,audits:can(req.user, 'operations')?row.audits:[],timeZone:attendanceTimezone})
}))
router.patch('/:id/correction',requireAttendanceManagement,(req,res,next)=>['ADMIN','SUPER_ADMIN'].includes(req.user.role)?next():res.status(403).json({message:'التعديل للإدارة فقط'}),route(async(req,res)=>{
 fields(req.body,['checkIn','checkOut','reason','revision']);const reason=text(req.body.reason,1000)
 if(!Number.isInteger(req.body.revision)||req.body.revision<0)throw fail(400,'نسخة السجل مطلوبة')
 const row=await Attendance.findById(objectId(req.params.id));if(!row)throw fail(404,'السجل غير موجود')
 const checkIn=timestamp(req.body.checkIn),checkOut=req.body.checkOut===null?null:timestamp(req.body.checkOut),now=new Date()
 if(workDate(checkIn)!==row.workDate||checkIn>now||(checkOut&&(checkOut<checkIn||checkOut>now)))throw fail(400,'الأوقات غير صالحة أو خارج يوم العمل أو في المستقبل')
 const overlap=await Attendance.exists({_id:{$ne:row._id},userId:row.userId,checkIn:{$lt:checkOut||new Date('9999-01-01')},$or:[{checkOut:null},{checkOut:{$gt:checkIn}}]})
 if(overlap)throw fail(409,'الوقت يتداخل مع وردية أخرى')
 const updated=await Attendance.findOneAndUpdate({_id:row._id,__v:req.body.revision},{$set:{checkIn,checkOut,isOpen:!checkOut},$inc:{__v:1},$push:{audits:{changedBy:req.user._id,changedByName:req.user.fullName||req.user.name,changedAt:now,reason,oldValue:{checkIn:row.checkIn,checkOut:row.checkOut},newValue:{checkIn,checkOut}}}},{new:true,runValidators:true})
 if(!updated)throw fail(409,'تم تغيير السجل؛ أعد تحميله قبل التصحيح')
 res.json({...attendanceView(updated),audits:updated.audits})
}))
export default router
