import {taskScope} from '../lib/recordScope.js'
import { requirePermission } from '../lib/permissions.js'
import {Router,json} from 'express'
import {requireAuth} from '../middleware/auth.js'
import User from '../models/User.js'
import WorkTask from '../models/WorkTask.js'
import {fields,fail,objectId} from '../lib/attendance.js'
import {uploadTaskImage} from '../lib/taskUpload.js'
export function taskInput(body) {
  fields(body,['text','status','image','assignedTo'])
  if(body.text!==undefined&&typeof body.text!=='string')throw fail(400,'نص غير صالح')
  const text=(body.text||'').trim(),status=body.status===undefined?'Pending':body.status
  if(text.length>4000||!['Pending','Completed'].includes(status))throw fail(400,'بيانات المهمة غير صالحة')
  return {text,status}
}
const router=Router(),route=fn=>async(req,res,next)=>{try{await fn(req,res)}catch(e){next(e)}}
router.use(requireAuth,json({limit:'5mb'}),(req,res,next)=>{res.set('Cache-Control','private, no-store');next()})
// Personal assignments are read-only and always scoped to the authenticated user.
router.get('/mine',route(async(req,res)=>{
  fields(req.query,['page'])
  const page=Number(req.query.page||1)
  if(!Number.isInteger(page)||page<1||page>100000)throw fail(400,'Invalid page')
  const query={assignedTo:req.user._id}
  const [rows,total]=await Promise.all([WorkTask.find(query).sort({createdAt:-1,_id:-1}).skip((page-1)*20).limit(20).populate('userId assignedTo','name fullName'),WorkTask.countDocuments(query)])
  res.json({rows,total,page})
}))
router.get('/notifications',route(async(req,res)=>{
  const rows=await WorkTask.find({assignedTo:req.user._id,assigneeReadAt:{$type:10}}).sort({createdAt:-1}).limit(20).populate('userId','name fullName')
  res.json({count:rows.length,rows})
}))
router.post('/notifications/read',route(async(req,res)=>{
  await WorkTask.updateMany({assignedTo:req.user._id,assigneeReadAt:{$type:10}},{$set:{assigneeReadAt:new Date()}})
  res.json({ok:true})
}))
router.use(requirePermission('tasks'))
router.get('/assignees',requirePermission('tasks','write'),route(async(req,res)=>res.json((await User.find({status:{$ne:'INACTIVE'}}).select('name fullName email').sort({name:1})).map(u=>({id:String(u._id),fullName:u.fullName||u.name,email:u.email})))))
async function assignee(value){
  const id=objectId(value)
  if(!await User.exists({_id:id,status:{$ne:'INACTIVE'}}))throw fail(400,'Choose an active employee')
  return id
}
router.get('/',route(async(req,res)=>{
  fields(req.query,['page'])
  const page=Number(req.query.page||1)
  if(!Number.isInteger(page)||page<1||page>100000)throw fail(400,'صفحة غير صالحة')
  const query=taskScope(req.user)
  const [rows,total]=await Promise.all([WorkTask.find(query).sort({createdAt:-1,_id:-1}).skip((page-1)*20).limit(20).populate('userId assignedTo','name fullName'),WorkTask.countDocuments(query)])
  res.json({rows,total,page})
}))
router.post('/',route(async(req,res)=>{
  const input=taskInput(req.body)
  input.assignedTo=await assignee(req.body.assignedTo)
  if(!input.text&&!req.body.image)throw fail(400,'أضف نصًا أو صورة على الأقل')
  const image=req.body.image?await uploadTaskImage(req.body.image):null
  res.status(201).json(await WorkTask.create({...input,image,userId:req.user._id,assigneeReadAt:null}))
}))
router.patch('/:id',route(async(req,res)=>{
  fields(req.body,['text','status','image','assignedTo'])
  const row=await WorkTask.findOne({_id:objectId(req.params.id),...taskScope(req.user,true)})
  if(!row)throw fail(404,'المهمة غير موجودة')
  const input=taskInput({text:row.text,status:row.status,...req.body})
  input.assignedTo=await assignee(req.body.assignedTo || row.assignedTo)
  let image=row.image
  if(Object.hasOwn(req.body,'image'))image=req.body.image?await uploadTaskImage(req.body.image):null
  if(!input.text&&!image?.url)throw fail(400,'أضف نصًا أو صورة على الأقل')
  const assigneeChanged=String(row.assignedTo||'')!==String(input.assignedTo)
  Object.assign(row,input,{image,assigneeReadAt:assigneeChanged?null:row.assigneeReadAt});await row.save();res.json(row)
}))
router.delete('/:id',route(async(req,res)=>{
  const row=await WorkTask.findOneAndDelete({_id:objectId(req.params.id),...taskScope(req.user,true)})
  if(!row)throw fail(404,'المهمة غير موجودة')
  res.json({deleted:true})
}))
export default router
