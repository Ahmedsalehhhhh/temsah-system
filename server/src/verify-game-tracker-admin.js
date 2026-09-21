import { isAdminOrAbove } from './lib/permissions.js'
﻿import './config/env.js'
import assert from 'node:assert/strict'
const base = `http://localhost:${process.env.PORT || 5000}/api`
async function request(path,method,body,token){
 const res=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)})
 const data=await res.json();return {status:res.status,data}
}
async function login(email,password){const r=await request('/auth/login','POST',{email,password});assert.equal(r.status,200);return r.data}
const admin=await login(process.env.TRACKER_TEST_ADMIN_EMAIL,process.env.TRACKER_TEST_ADMIN_PASSWORD)
console.log('Admin login HTTP 200:',JSON.stringify(admin.user))
assert.ok(isAdminOrAbove(admin.user.role));assert.equal(admin.user.game_tracker_access,true);assert.equal(admin.user.game_tracker_create,true)
const me=await request('/auth/me','GET',undefined,admin.token);assert.equal(me.status,200);assert.equal(me.data.user.game_tracker_access,true);assert.equal(me.data.user.game_tracker_create,true);console.log('Session refresh HTTP 200: both permission flags true')
let id
try{
 const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF9sAAAAASUVORK5CYII='
 const body={date:'2026-09-12',user:'Admin permission verification',email:'admin-check@test.local',product:'Temporary admin test',cost:1,price:2,state:'Pending',website:'test.local',paymentMethod:'Cash',photoForPayment:{name:'test.png',base64:png}}
 const created=await request('/game-tracker','POST',body,admin.token);console.log('Create:',JSON.stringify(created));assert.equal(created.status,201);id=created.data.id
 for(const key of ['ACCOUNTANT_1','ACCOUNTANT_2','ACCOUNTANT_3','SAIF']){
  const user=await login(process.env[`GAME_TRACKER_${key}_EMAIL`],process.env[`GAME_TRACKER_${key}_PASSWORD`])
  for(const method of ['PATCH','DELETE']){const result=await request('/game-tracker/'+id,method,method==='PATCH'?{product:'Forbidden edit'}:undefined,user.token);console.log(key+' '+method+':',JSON.stringify(result));assert.equal(result.status,403)}
 }
 for(const patch of [{createdBy:admin.user.id},{cost:-1},{photoForPayment:{name:'bad.png',base64:'AAAA'}}]){const r=await request('/game-tracker/'+id,'PATCH',patch,admin.token);assert.equal(r.status,400)}
 console.log('Invalid fields, negative cost, and invalid image PATCH: HTTP 400')
 const updated=await request('/game-tracker/'+id,'PATCH',{product:'Temporary admin test edited',price:3},admin.token);console.log('Edit:',JSON.stringify(updated));assert.equal(updated.status,200);assert.equal(updated.data.price,3);assert.equal(updated.data.product,'Temporary admin test edited')
 const photo=await fetch(base+'/game-tracker/'+id+'/photos/photoForPayment',{headers:{Authorization:'Bearer '+admin.token}});assert.equal(photo.status,200);assert.equal(Buffer.from(await photo.arrayBuffer()).toString('base64'),png);console.log('Photo preserved: HTTP 200, bytes unchanged')
 const listing=await request('/game-tracker?search=admin-check%40test.local','GET',undefined,admin.token);assert.ok(listing.data.records.some(r=>r.id===id&&r.price===3));console.log('Database read-back: edited record found')
 const removed=await request('/game-tracker/'+id,'DELETE',undefined,admin.token);console.log('Delete:',JSON.stringify(removed));assert.equal(removed.status,200)
 const again=await request('/game-tracker/'+id,'DELETE',undefined,admin.token);assert.equal(again.status,404);console.log('Delete read-back: HTTP 404');id=null
}finally{if(id){const cleanup=await request('/game-tracker/'+id,'DELETE',undefined,admin.token);console.log('Test cleanup:',cleanup.status)}}
