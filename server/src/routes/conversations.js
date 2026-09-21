import {Router,json} from 'express'
import mongoose from 'mongoose'
import {requireAuth} from '../middleware/auth.js'
import {taskScope} from '../lib/recordScope.js'
import WorkTask from '../models/WorkTask.js'
import {objectId,fail,text} from '../lib/attendance.js'
import {uploadTaskImage} from '../lib/taskUpload.js'
const schema=new mongoose.Schema({task:{type:mongoose.Schema.Types.ObjectId,ref:'WorkTask',required:true},sender:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},text:{type:String,maxlength:4000,default:''},image:{url:String,publicId:String}},{timestamps:true});schema.index({task:1,createdAt:-1,_id:-1})
const Message=mongoose.model('TaskMessage',schema),router=Router(),route=fn=>async(req,res,next)=>{try{await fn(req,res)}catch(e){next(e)}}
router.use(requireAuth,json({limit:'5mb'}),(req,res,next)=>{res.set('Cache-Control','private, no-store');next()})
router.get('/',route(async(req,res)=>{const page=Math.max(1,Number(req.query.page)||1);if(!Number.isInteger(page)||page>100000)throw fail(400,'صفحة غير صالحة');const query=taskScope(req.user);const [rows,total]=await Promise.all([WorkTask.find(query).sort({updatedAt:-1,_id:-1}).skip((page-1)*20).limit(20).populate('assignedTo userId','name fullName'),WorkTask.countDocuments(query)]);res.json({rows,total,page})}))
router.get('/:id',route(async(req,res)=>{const task=await WorkTask.findOne({_id:objectId(req.params.id),...taskScope(req.user)}).populate('assignedTo userId','name fullName');if(!task)throw fail(404,'المهمة غير موجودة');const page=Math.max(1,Number(req.query.page)||1);if(!Number.isInteger(page)||page>100000)throw fail(400,'صفحة غير صالحة');const [rows,total]=await Promise.all([Message.find({task:task._id}).sort({createdAt:-1,_id:-1}).skip((page-1)*40).limit(40).populate('sender','name fullName'),Message.countDocuments({task:task._id})]);await WorkTask.updateOne({_id:task._id,assignedTo:req.user._id},{$set:{assigneeReadAt:new Date()}});res.json({task,rows:rows.reverse(),total,page})}))
router.post('/:id',route(async(req,res)=>{const task=await WorkTask.findOne({_id:objectId(req.params.id),...taskScope(req.user,true)});if(!task)throw fail(404,'المهمة غير موجودة');const content=req.body.text?text(req.body.text,4000):'';if(!content&&!req.body.image)throw fail(400,'اكتب رسالة أو اختر صورة');const image=req.body.image?await uploadTaskImage(req.body.image):null;const row=await Message.create({task:task._id,sender:req.user._id,text:content,image});await WorkTask.updateOne({_id:task._id},{$set:{updatedAt:new Date(),assigneeReadAt:null}});res.status(201).json(row)}))
export default router
