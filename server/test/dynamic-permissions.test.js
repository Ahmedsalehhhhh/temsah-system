import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import jwt from 'jsonwebtoken'
import User from '../src/models/User.js'
import PermissionPolicy from '../src/models/PermissionPolicy.js'
import WorkTask from '../src/models/WorkTask.js'
import Attendance from '../src/models/Attendance.js'
import Settings from '../src/models/Settings.js'
import {PAGES,EDITABLE_ROLES,defaultPermissions} from '../src/lib/permissionDefaults.js'
import {can,requirePermission} from '../src/lib/permissions.js'
import {permissionSnapshot,seedPermissions} from '../src/lib/permissionStore.js'
import permissions from '../src/routes/permissions.js'
import tasks from '../src/routes/tasks.js'
import attendance from '../src/routes/attendance.js'
import settings from '../src/routes/settings.js'
const admin='111111111111111111111111',employee='222222222222222222222222',other='333333333333333333333333',taskId='444444444444444444444444'
async function harness(t){
  const store=new Map(EDITABLE_ROLES.map(role=>['role:'+role,{entries:defaultPermissions(role)}]))
  let actor={_id:admin,role:'ADMIN'}
  const users={[admin]:{_id:admin,role:'ADMIN'},[employee]:{_id:employee,role:'EMPLOYEE'},[other]:{_id:other,role:'SUPER_ADMIN'}}
  t.mock.method(PermissionPolicy,'findById',id=>({lean:async()=>structuredClone(store.get(id)||null)}))
  t.mock.method(PermissionPolicy,'updateOne',async(filter,update)=>{
    const previous=store.get(filter._id)
    const doc=previous || {entries:{}}
    if(update.$setOnInsert&&!previous)doc.entries=structuredClone(update.$setOnInsert.entries)
    for(const [key,value] of Object.entries(update.$set||{}))doc.entries[key.slice(8)]=value
    for(const key of Object.keys(update.$unset||{}))delete doc.entries[key.slice(8)]
    store.set(filter._id,doc)
    return {acknowledged:true}
  })
  process.env.JWT_SECRET='dynamic-test-only'
  t.mock.method(User,'findById',id=>({select:async()=>String(id)===String(actor._id)?actor:users[String(id)]}))
  const app=express();app.use(express.json());app.use('/permissions',permissions);app.use('/tasks',tasks);app.use('/attendance',attendance);app.use('/settings',settings)
  app.use((e,req,res,next)=>res.status(e.status||500).json({message:e.message}))
  const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)))
  return {store,setActor(value){actor=value},request:(path,method='GET',body)=>fetch('http://127.0.0.1:'+server.address().port+path,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+jwt.sign({sub:actor._id},process.env.JWT_SECRET)},body:body===undefined?undefined:JSON.stringify(body)})}
}

test('role edits and employee overrides apply on the very next request; clearing inherits; SUPER_ADMIN cannot be restricted',async t=>{
  const h=await harness(t)
  t.mock.method(Settings,'findById',async()=>({egpConversionRate:50,save:async()=>{}}))
  assert.equal((await h.request('/permissions/roles/EMPLOYEE/settings','PUT',{level:'VIEW_ONLY'})).status,200)
  h.setActor({_id:employee,role:'EMPLOYEE'})
  assert.equal((await h.request('/settings')).status,200)
  assert.equal((await h.request('/settings','PATCH',{egpConversionRate:51})).status,403)
  assert.equal((await h.request('/permissions')).status,403)
  assert.equal((await h.request('/permissions/roles/ADMIN/settings','PUT',{level:'FULL_EDIT'})).status,403)
  h.setActor({_id:admin,role:'ADMIN'})
  assert.equal((await h.request('/permissions/employees/'+employee+'/settings','PUT',{level:'FULL_EDIT'})).status,200)
  h.setActor({_id:employee,role:'EMPLOYEE'})
  assert.equal((await h.request('/settings','PATCH',{egpConversionRate:51})).status,200)
  h.setActor({_id:admin,role:'ADMIN'})
  assert.equal((await h.request('/permissions/employees/'+employee+'/settings','PUT',{level:'NO_ACCESS'})).status,200)
  h.setActor({_id:employee,role:'EMPLOYEE'})
  assert.equal((await h.request('/settings')).status,403)
  h.setActor({_id:admin,role:'ADMIN'})
  assert.equal((await h.request('/permissions/employees/'+employee+'/settings','PUT',{level:null})).status,200)
  h.setActor({_id:employee,role:'EMPLOYEE'})
  assert.equal((await h.request('/settings')).status,200)
  h.setActor({_id:admin,role:'ADMIN'})
  assert.equal((await h.request('/permissions/roles/SUPER_ADMIN/settings','PUT',{level:'NO_ACCESS'})).status,400)
  assert.equal((await h.request('/permissions/employees/'+other+'/settings','PUT',{level:'NO_ACCESS'})).status,403)
  assert.equal((await h.request('/permissions/roles/EMPLOYEE/not-a-page','PUT',{level:'FULL_EDIT'})).status,400)
  assert.equal((await h.request('/permissions/roles/EMPLOYEE/settings','PUT',{level:'INVALID'})).status,400)
  await seedPermissions()
  assert.equal(h.store.get('role:EMPLOYEE').entries.settings,'VIEW_ONLY','seeding never overwrites saved edits')
  for(const page of PAGES) assert.equal(can({_id:other,role:'SUPER_ADMIN',permissions:{[page]:'NO_ACCESS'}},page,'write'),true)
})

test('every page enforces view versus mutation and override precedence independently',async t=>{
  const h=await harness(t)
  for(const page of PAGES){
    h.store.set('user:'+employee,{entries:{[page]:'VIEW_ONLY'}})
    const user={_id:employee,role:'EMPLOYEE',permissions:(await permissionSnapshot({_id:employee,role:'EMPLOYEE'})).effective}
    assert.equal(can(user,page),true,page)
    assert.equal(can(user,page,'write'),false,page)
    for(const method of ['POST','PUT','PATCH','DELETE']){
      let status,passed=false
      requirePermission(page)({user,method},{status(s){status=s;return this},json(){}},()=>passed=true)
      assert.equal(status,403,page+':'+method);assert.equal(passed,false)
    }
    h.store.set('user:'+employee,{entries:{[page]:'NO_ACCESS'}})
    user.permissions=(await permissionSnapshot(user)).effective
    assert.equal(can(user,page),false,page)
  }
})

test('task assignment requires active employee; mine is isolated and read-only; Tasks access is independent',async t=>{
  const h=await harness(t),rows=[]
  t.mock.method(User,'exists',async q=>String(q._id)===employee)
  t.mock.method(WorkTask,'create',async data=>{const row={_id:taskId,...data};rows.push(row);return row})
  t.mock.method(WorkTask,'find',q=>({sort(){return this},skip(){return this},limit(){return this},populate:async()=>rows.filter(r=>!q.assignedTo||String(r.assignedTo)===String(q.assignedTo))}))
  t.mock.method(WorkTask,'countDocuments',async q=>rows.filter(r=>!q.assignedTo||String(r.assignedTo)===String(q.assignedTo)).length)
  assert.equal((await h.request('/tasks','POST',{text:'Assign this'})).status,400)
  assert.equal((await h.request('/tasks','POST',{text:'Assign this',assignedTo:other})).status,400)
  assert.equal((await h.request('/tasks','POST',{text:'Assign this',assignedTo:employee})).status,201)
  assert.equal(String(rows[0].assignedTo),employee)
  h.setActor({_id:employee,role:'EMPLOYEE'})
  let res=await h.request('/tasks/mine');assert.equal(res.status,200);assert.equal((await res.json()).rows.length,1)
  assert.equal((await h.request('/tasks/mine?assignedTo='+other)).status,400)
  assert.equal((await h.request('/tasks')).status,403)
  assert.equal((await h.request('/tasks/'+taskId,'PATCH',{text:'Changed'})).status,403)
  assert.equal((await h.request('/tasks/'+taskId,'DELETE')).status,403)
  h.setActor({_id:other,role:'EMPLOYEE'})
  res=await h.request('/tasks/mine');assert.equal((await res.json()).rows.length,0)
  h.store.set('user:'+other,{entries:{tasks:'VIEW_ONLY'}})
  assert.equal((await h.request('/tasks')).status,200)
  assert.equal((await h.request('/tasks','POST',{text:'No write',assignedTo:employee})).status,403)
  assert.equal((await h.request('/attendance/dashboard')).status,403)
})

test('checkout accepts a fresh note or an already-saved report and closes atomically',async t=>{
  const h=await harness(t)
  let writes=0,open=true
  t.mock.method(Attendance,'findOneAndUpdate',async(query,update)=>{
    assert.equal(query.userId,employee);assert.equal(query.isOpen,true)
    assert.deepEqual(query['updates.999'],{$exists:false})
    if(!open)return null
    open=false;writes++
    if(query['updates.0']){
      assert.deepEqual(query['updates.0'],{$exists:true})
      assert.equal(update.$push,undefined)
    }else{
      assert.equal(update.$push.updates.text,'Last thing done')
      assert.equal(update.$push.updates.checkout,true)
      assert.equal(+update.$push.updates.createdAt,+update.$set.checkOut)
    }
    assert.equal(update.$set.isOpen,false)
    return {_id:taskId,userId:employee,checkIn:new Date(Date.now()-1000),checkOut:update.$set.checkOut,updates:[{text:'Earlier update'},...(update.$push?[update.$push.updates]:[])],__v:1}
  })
  for(const role of [...EDITABLE_ROLES,'SUPER_ADMIN']){
    h.setActor({_id:employee,role});open=true
    const before=writes
    for(const body of [{text:'x',status:'Invalid'},{updateId:taskId}])assert.equal((await h.request('/attendance/check-out','POST',body)).status,400,role)
    assert.equal(writes,before,'invalid requests never touch the shift')
    assert.equal((await h.request('/attendance/check-out','POST',{})).status,200,role)
    assert.equal((await h.request('/attendance/check-out','POST',{})).status,409,role)
    assert.equal(writes,before+1,'duplicate checkout cannot append twice')
    open=true
    assert.equal((await h.request('/attendance/check-out','POST',{text:' Last thing done ',status:'Completed'})).status,200,role)
    assert.equal(writes,before+2)
  }
})


test('frontend policy uses effective levels, matches the page catalog, and protects permissions management',async()=>{
  const {createRequire}=await import('node:module')
  const {readFileSync}=await import('node:fs')
  const vm=await import('node:vm')
  const ts=createRequire(new URL('../../client/package.json',import.meta.url))('typescript')
  const exports={}
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../../client/src/app/core/permissions.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports})
  assert.deepEqual(Array.from(exports.PAGES),PAGES)
  for(const role of [...EDITABLE_ROLES,'SUPER_ADMIN'])for(const page of PAGES)for(const level of ['NO_ACCESS','VIEW_ONLY','FULL_EDIT']){
    const permissions={[page]:level}
    for(const action of ['read','write'])assert.equal(exports.can(role,page,action,permissions),can({role,permissions},page,action),role+':'+page+':'+level+':'+action)
  }
  assert.equal(exports.can('EMPLOYEE','permissions','write',{permissions:'FULL_EDIT'}),false)
  assert.equal(exports.can('ADMIN','permissions','write',{}),true)
  assert.equal(exports.can('SUPER_ADMIN','permissions','write',{}),true)
})
