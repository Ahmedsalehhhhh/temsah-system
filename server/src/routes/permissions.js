import {Router} from 'express'
import {requireAuth, requireAdmin} from '../middleware/auth.js'
import {PAGES, LEVELS, EDITABLE_ROLES} from '../lib/permissionDefaults.js'
import {permissionSnapshot} from '../lib/permissionStore.js'
import PermissionPolicy from '../models/PermissionPolicy.js'
import User from '../models/User.js'
import {fields, fail, objectId, accountView} from '../lib/attendance.js'
import {normalizeRole, canManageAccount} from '../lib/permissions.js'
const router=Router(), route=fn=>async(req,res,next)=>{try{await fn(req,res)}catch(e){next(e)}}
router.use(requireAuth, (req,res,next)=>{res.set('Cache-Control','private, no-store');next()})
router.get('/me', (req,res)=>res.json({permissions:req.user.permissions}))
router.use(requireAdmin)
router.get('/',route(async(req,res)=>{
  const roles={}
  for(const role of EDITABLE_ROLES) roles[role]=(await permissionSnapshot({_id:'role-default',role})).defaults
  const employees=await User.find().sort({name:1}).select('name fullName email role status')
  res.json({pages:PAGES,levels:LEVELS,roles,employees:employees.map(accountView)})
}))
router.put('/roles/:role/:page',route(async(req,res)=>{
  fields(req.body,['level'])
  if(!EDITABLE_ROLES.includes(req.params.role)||!PAGES.includes(req.params.page)||!LEVELS.includes(req.body.level))throw fail(400,'Invalid role, page or access level')
  await PermissionPolicy.updateOne({_id:'role:'+req.params.role},{$set:{['entries.'+req.params.page]:req.body.level}},{upsert:true,runValidators:true})
  res.json({saved:true})
}))
async function target(req){
  const user=await User.findById(objectId(req.params.id)).select('name fullName email role status')
  if(!user)throw fail(404,'Employee not found')
  return user
}
router.get('/employees/:id',route(async(req,res)=>{
  const user=await target(req)
  res.json({...await permissionSnapshot(user),editable:normalizeRole(user.role)!=='SUPER_ADMIN' && canManageAccount(req.user,user)})
}))
router.put('/employees/:id/:page',route(async(req,res)=>{
  fields(req.body,['level'])
  const user=await target(req),page=req.params.page,level=req.body.level
  if(normalizeRole(user.role)==='SUPER_ADMIN'||!canManageAccount(req.user,user))throw fail(403,'Cannot change permissions for this account')
  if(!PAGES.includes(page)||(level!==null&&!LEVELS.includes(level)))throw fail(400,'Invalid page or access level')
  await PermissionPolicy.updateOne({_id:'user:'+user._id},level===null?{$unset:{['entries.'+page]:1}}:{$set:{['entries.'+page]:level}},{upsert:true,runValidators:true})
  res.json({...await permissionSnapshot(user),editable:true})
}))
export default router
