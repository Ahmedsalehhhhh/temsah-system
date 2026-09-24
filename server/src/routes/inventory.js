import mongoose from 'mongoose'
import {Router} from 'express'
import {requireAuth} from '../middleware/auth.js'
import {requirePermission} from '../lib/permissions.js'
import {fail,fields,objectId,text,accountView} from '../lib/attendance.js'
import InventoryItem from '../models/InventoryItem.js'
import InventoryDelivery from '../models/InventoryDelivery.js'
import User from '../models/User.js'

const router=Router()
const route=fn=>async(req,res,next)=>{try{await fn(req,res)}catch(error){if(error.code===11000)return res.status(409).json({message:'الصنف موجود بالفعل'});if(error.status)return res.status(error.status).json({message:error.message});next(error)}}
router.use(requireAuth,requirePermission('inventory'),(_req,res,next)=>{res.set('Cache-Control','private, no-store');next()})

export const quantity=value=>{const number=Number(value);if(!Number.isInteger(number)||number<0||number>1000000)throw fail(400,'الكمية غير صالحة');return number}
const nameValue=value=>text(value,160)
export const nameKey=value=>nameValue(value).toLocaleLowerCase('ar')

router.get('/employees',route(async(_req,res)=>{
 const users=await User.find({status:{$ne:'INACTIVE'}}).sort({name:1}).select('name fullName email role status')
 res.json(users.map(accountView))
}))

router.get('/items',route(async(req,res)=>{
 fields(req.query,['search','active']);const query={}
 if(req.query.active==='true')query.active=true
 if(req.query.search){const search=text(req.query.search,160).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');query.$or=[{name:{$regex:search,$options:'i'}},{category:{$regex:search,$options:'i'}}]}
 const rows=await InventoryItem.find(query).sort({active:-1,name:1}).lean()
 res.json({rows,summary:{items:rows.filter(x=>x.active).length,total:rows.reduce((sum,x)=>sum+x.quantityTotal,0),available:rows.reduce((sum,x)=>sum+x.quantityAvailable,0),delivered:rows.reduce((sum,x)=>sum+x.quantityTotal-x.quantityAvailable,0)}})
}))

router.post('/items',route(async(req,res)=>{
 fields(req.body,['name','category','quantity','notes']);const total=quantity(req.body.quantity)
 if(total<1)throw fail(400,'أدخل كمية أكبر من صفر')
 const row=await InventoryItem.create({name:nameValue(req.body.name),nameKey:nameKey(req.body.name),category:String(req.body.category||'').trim(),quantityTotal:total,quantityAvailable:total,notes:String(req.body.notes||'').trim(),createdBy:req.user._id})
 res.status(201).json(row)
}))

router.patch('/items/:id',route(async(req,res)=>{
 fields(req.body,['name','category','quantity','notes','active','revision']);if(!Number.isInteger(req.body.revision)||req.body.revision<0)throw fail(400,'أعد تحميل الصنف وحاول مرة أخرى')
 const current=await InventoryItem.findById(objectId(req.params.id));if(!current)throw fail(404,'الصنف غير موجود')
 const changes={}
 if(req.body.name!==undefined){changes.name=nameValue(req.body.name);changes.nameKey=nameKey(req.body.name)}
 if(req.body.category!==undefined)changes.category=String(req.body.category||'').trim()
 if(req.body.notes!==undefined)changes.notes=String(req.body.notes||'').trim()
 if(req.body.active!==undefined){if(typeof req.body.active!=='boolean')throw fail(400,'حالة الصنف غير صالحة');changes.active=req.body.active}
 if(req.body.quantity!==undefined){const total=quantity(req.body.quantity),assigned=current.quantityTotal-current.quantityAvailable;if(total<assigned)throw fail(409,`لا يمكن تقليل الكمية عن ${assigned} لأنها مسلّمة حاليًا`);changes.quantityTotal=total;changes.quantityAvailable=total-assigned}
 const row=await InventoryItem.findOneAndUpdate({_id:current._id,__v:req.body.revision},{$set:changes,$inc:{__v:1}},{new:true,runValidators:true});if(!row)throw fail(409,'تم تعديل الصنف؛ أعد تحميل الصفحة')
 res.json(row)
}))

router.get('/deliveries',route(async(req,res)=>{
 fields(req.query,['status']);const query={};if(req.query.status){if(!['DELIVERED','RETURNED'].includes(req.query.status))throw fail(400,'حالة غير صالحة');query.status=req.query.status}
 const rows=await InventoryDelivery.find(query).sort({deliveredAt:-1,_id:-1}).limit(1000).populate('userId','name fullName email status').populate('createdBy returnedBy','name fullName')
 res.json(rows)
}))

router.post('/deliveries',route(async(req,res)=>{
 fields(req.body,['userId','itemId','quantity','notes']);const count=quantity(req.body.quantity);if(count<1)throw fail(400,'أدخل كمية أكبر من صفر')
 const user=await User.findOne({_id:objectId(req.body.userId),status:{$ne:'INACTIVE'}}).select('_id');if(!user)throw fail(404,'الموظف غير موجود أو غير نشط')
 const session=await mongoose.startSession();let delivery
 try{await session.withTransaction(async()=>{const item=await InventoryItem.findOneAndUpdate({_id:objectId(req.body.itemId),active:true,quantityAvailable:{$gte:count}},{$inc:{quantityAvailable:-count}},{new:true,runValidators:true,session});if(!item)throw fail(409,'الكمية المطلوبة غير متاحة');[delivery]=await InventoryDelivery.create([{userId:user._id,itemId:item._id,itemName:item.name,quantity:count,notes:String(req.body.notes||'').trim(),createdBy:req.user._id}],{session})})}finally{await session.endSession()}
 await delivery.populate('userId','name fullName email status');res.status(201).json(delivery)
}))

router.patch('/deliveries/:id/return',route(async(req,res)=>{
 fields(req.body,[]);const session=await mongoose.startSession();let delivery
 try{await session.withTransaction(async()=>{delivery=await InventoryDelivery.findOneAndUpdate({_id:objectId(req.params.id),status:'DELIVERED'},{$set:{status:'RETURNED',returnedAt:new Date(),returnedBy:req.user._id}},{new:true,runValidators:true,session});if(!delivery)throw fail(409,'التسليم مسترجع بالفعل أو غير موجود');const item=await InventoryItem.findByIdAndUpdate(delivery.itemId,{$inc:{quantityAvailable:delivery.quantity}},{new:true,runValidators:true,session});if(!item)throw fail(409,'الصنف الأصلي غير موجود')})}finally{await session.endSession()}
 await delivery.populate('userId','name fullName email status');res.json(delivery)
}))

export default router
