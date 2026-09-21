import { isAdminOrAbove } from './lib/permissions.js'
﻿import './config/env.js'
import {getDefaultAdminCredentials} from './config/env.js'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import User from './models/User.js'
import Attendance from './models/Attendance.js'
import {connectDB} from './config/db.js'
const base=`http://localhost:${process.env.PORT||5000}/api`
const prefix='attendance-test-'+crypto.randomUUID()
const password=crypto.randomBytes(20).toString('base64url')
const ids=[]
async function request(path,method='GET',body,token){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});const data=await r.json();return {status:r.status,data}}
async function expect(path,method,body,token,status){const r=await request(path,method,body,token);assert.equal(r.status,status,`${method} ${path}: ${JSON.stringify(r.data)}`);return r.data}
let admin
try{
 const {email,password:adminPassword}=getDefaultAdminCredentials()
 admin=await expect('/auth/login','POST',{email,password:adminPassword},null,200)
 assert.ok(isAdminOrAbove(admin.user.role));console.log('Admin login: HTTP 200')
 for(let i=0;i<2;i++){
  const u=await expect('/employee-accounts','POST',{fullName:`Attendance Test ${i}`,email:`${prefix}-${i}@test.local`,temporaryPassword:password,role:'EMPLOYEE'},admin.token,201);ids.push(u.id)
  assert.equal(u.status,'ACTIVE');assert.equal(u.role,'EMPLOYEE');assert.equal(u.passwordHash,undefined);assert.equal(u.temporaryPassword,undefined)
 }
 console.log('Admin creates two employees: HTTP 201; no passwords/hashes returned')
 const login=i=>expect('/auth/login','POST',{email:`${prefix}-${i}@test.local`,password},null,200)
 const one=await login(0),two=await login(1)
 const initial=await expect('/attendance/today','GET',undefined,one.token,200);assert.equal(initial.attendance,null)
 await expect('/attendance/check-in','POST',{userId:ids[1]},one.token,400)
 const attempts=await Promise.all([request('/attendance/check-in','POST',{},one.token),request('/attendance/check-in','POST',{},one.token)])
 assert.deepEqual(attempts.map(r=>r.status).sort(),[201,409]);const row=attempts.find(r=>r.status===201).data
 assert.equal(row.userId,ids[0]);assert.ok(Math.abs(Date.now()-Date.parse(row.checkIn))<15000)
 console.log('Concurrent check-in: HTTP 201 + 409; authenticated user and server time verified')
 for(const status of ['Completed','In Progress','Blocked'])await expect('/attendance/updates','POST',{text:'Verified daily output '+status,status},one.token,201)
 await expect('/attendance/updates','POST',{text:'Spoof',status:'Completed',employeeId:ids[1]},one.token,400)
 let dashboard=await expect('/attendance/dashboard?employee='+ids[0],'GET',undefined,admin.token,200)
 assert.equal(dashboard.summary.workingNow,1);assert.equal(dashboard.rows[0].workUpdates,3)
 console.log('Three work updates: HTTP 201; dashboard immediately shows Working and 3 updates')
 await expect('/attendance/'+row.id,'GET',undefined,two.token,404)
 await expect('/attendance/history?employee='+ids[0],'GET',undefined,two.token,403)
 await expect('/attendance/dashboard','GET',undefined,one.token,403)
 await expect('/employee-accounts','GET',undefined,one.token,403)
 await expect('/attendance/'+row.id+'/correction','PATCH',{},one.token,403)
 for(const path of ['/payroll/overview/test','/expenses','/settings','/employees/it','/game-tracker'])await expect(path,'GET',undefined,one.token,403)
 await expect('/auth/register','POST',{name:'Escalation',email:`${prefix}-forged@test.local`,password},one.token,403)
 console.log('Isolation: other employee detail 404; foreign history/admin/corrections/legacy modules 403; signup bypass blocked')
 const checkout=await Promise.all([request('/attendance/check-out','POST',{},one.token),request('/attendance/check-out','POST',{},one.token)])
 assert.deepEqual(checkout.map(r=>r.status).sort(),[200,409]);const finished=checkout.find(r=>r.status===200).data
 assert.equal(finished.status,'Finished');assert.equal(finished.workedSeconds,Math.floor((Date.parse(finished.checkOut)-Date.parse(finished.checkIn))/1000))
 await expect('/attendance/check-in','POST',{},one.token,409)
 console.log('Concurrent checkout: HTTP 200 + 409; duration calculated from server timestamps; repeat daily check-in 409')
 let detail=await expect('/attendance/'+row.id,'GET',undefined,admin.token,200)
 const earlier=new Date(Date.parse(detail.checkIn)-60000).toISOString()
 const patch={checkIn:earlier,checkOut:detail.checkOut,reason:'Integration test correction',revision:detail.revision}
 const corrected=await expect('/attendance/'+row.id+'/correction','PATCH',patch,admin.token,200)
 assert.equal(corrected.workedSeconds,finished.workedSeconds+60);assert.equal(corrected.audits.length,1);assert.equal(corrected.audits[0].changedBy,admin.user.id);assert.equal(corrected.audits[0].oldValue.checkIn,detail.checkIn);assert.equal(corrected.audits[0].newValue.checkIn,earlier)
 await expect('/attendance/'+row.id+'/correction','PATCH',patch,admin.token,409)
 await expect('/attendance/'+row.id+'/correction','PATCH',{...patch,revision:corrected.revision,checkOut:'2099-01-01T00:00:00Z'},admin.token,400)
 console.log('Admin correction: HTTP 200; +60 seconds, actor/time/old/new audit persisted; stale revision 409; future time 400')
 const own=await expect('/attendance/history','GET',undefined,one.token,200);assert.equal(own.total,1);assert.equal(own.rows[0].userId,ids[0]);assert.equal(own.rows[0].workedSeconds,corrected.workedSeconds)
 const other=await expect('/attendance/history','GET',undefined,two.token,200);assert.equal(other.total,0)
 dashboard=await expect('/attendance/dashboard?employee='+ids[0]+'&status=Finished','GET',undefined,admin.token,200);assert.equal(dashboard.summary.finishedToday,1);assert.equal(dashboard.summary.totalSeconds,corrected.workedSeconds)
 console.log('History and dashboard read-back: Finished, 3 updates, corrected hours; other employee history empty')
 await expect('/employee-accounts/'+ids[0],'PATCH',{fullName:'Attendance Test Edited'},admin.token,200)
 const changed=await expect('/employee-accounts/'+ids[0],'GET',undefined,admin.token,200);assert.equal(changed.fullName,'Attendance Test Edited')
 await expect('/employee-accounts/'+ids[0],'PATCH',{status:'INACTIVE'},admin.token,200)
 await expect('/attendance/today','GET',undefined,one.token,401);await expect('/auth/login','POST',{email:changed.email,password},null,401)
 await expect('/employee-accounts/'+ids[0],'PATCH',{status:'ACTIVE'},admin.token,200)
 await expect('/attendance/today','GET',undefined,one.token,401)
 const newSession=await login(0)
 const resetPassword=crypto.randomBytes(20).toString('base64url')
 await expect('/employee-accounts/'+ids[0]+'/reset-password','POST',{temporaryPassword:resetPassword},admin.token,200)
 await expect('/attendance/today','GET',undefined,newSession.token,401);await expect('/auth/login','POST',{email:changed.email,password},null,401)
 await expect('/auth/login','POST',{email:changed.email,password:resetPassword},null,200)
 console.log('Edit/view, deactivate/reactivate, password reset: passed; old sessions and old password rejected')
 await connectDB();const stored=await User.findById(ids[0]).lean();assert.ok(await bcrypt.compare(resetPassword,stored.passwordHash));assert.equal(stored.password,undefined);assert.equal(stored.temporaryPassword,undefined)
 const persisted=await Attendance.findById(row.id).lean();assert.equal(persisted.updates.length,3);assert.equal(persisted.audits.length,1)
 const indexes=await Attendance.collection.indexes();assert.ok(indexes.some(i=>i.unique&&i.key.userId&&i.key.workDate));assert.ok(indexes.some(i=>i.unique&&i.partialFilterExpression?.isOpen))
 console.log('MongoDB: bcrypt hash, updates, audit, unique daily attendance and unique open-shift indexes verified')
 console.log('PASS: complete attendance lifecycle and permission checks')
}finally{
 if(ids.length){if(mongoose.connection.readyState!==1)await connectDB();await Attendance.deleteMany({userId:{$in:ids}});await User.deleteMany({_id:{$in:ids},email:{$regex:'^'+prefix}});console.log('Removed only generated test employees and their attendance')}
 await mongoose.disconnect()
}
