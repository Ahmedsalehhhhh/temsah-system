import './permission-fixture.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import jwt from 'jsonwebtoken'
import User from '../src/models/User.js'
import WorkTask from '../src/models/WorkTask.js'
import Problem from '../src/models/Problem.js'
import Period from '../src/models/Period.js'
import taskRouter from '../src/routes/tasks.js'
import managementRouter,{daysOpen} from '../src/routes/management.js'
import {uploadTaskImage} from '../src/lib/taskUpload.js'
import {trackerInput,trackerView} from '../src/lib/gameTracker.js'
const owner='111111111111111111111111',other='222222222222222222222222',id='333333333333333333333333',periodId='444444444444444444444444'
const image={name:'test.png',base64:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF9sAAAAASUVORK5CYII='}
test('operations-only tasks, manager/admin writes, content validation and problem permissions',async t=>{
 process.env.JWT_SECRET='work-management-test-only'
 let actor={_id:owner,role:'MANAGEMENT'},tasks=[],problems=[],lastQuery
 t.mock.method(User,'findById',()=>({select:async()=>actor}))
 t.mock.method(User,'exists',async()=>true)
 t.mock.method(Period,'findById',async()=>({status:'open'}))
 t.mock.method(WorkTask,'create',async data=>{const row={_id:id,...data,save:async()=>{}};tasks.push(row);return row})
 t.mock.method(WorkTask,'findOne',async q=>tasks.find(r=>r._id===q._id&&(!q.userId||r.userId===q.userId)))
 t.mock.method(WorkTask,'findOneAndDelete',async q=>{const row=tasks.find(r=>r._id===q._id&&(!q.userId||r.userId===q.userId));if(row)tasks=tasks.filter(r=>r!==row);return row})
 t.mock.method(WorkTask,'find',q=>{lastQuery=q;return {sort(){return this},skip(){return this},limit(){return this},populate:async()=>tasks.filter(r=>!q.userId||r.userId===q.userId)}})
 t.mock.method(WorkTask,'countDocuments',async q=>tasks.filter(r=>!q.userId||r.userId===q.userId).length)
 t.mock.method(Problem,'create',async data=>{problems.push(data);return data})
 t.mock.method(Problem,'findOneAndUpdate',async(q,change)=>({...problems[0],...change.$set}))
 const app=express();app.use('/tasks',taskRouter);app.use(express.json());app.use('/management',managementRouter);app.use((e,req,res,next)=>res.status(e.status||500).json({message:e.message}))
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)))
 const request=(path,method='GET',body)=>fetch('http://127.0.0.1:'+server.address().port+path,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+jwt.sign({sub:actor._id},process.env.JWT_SECRET)},body:body===undefined?undefined:JSON.stringify(body)})
 for(const body of [{},{text:' '},{text:'x',userId:other},{text:'x',status:'Blocked'}])assert.equal((await request('/tasks','POST',body)).status,400)
 assert.equal((await request('/tasks','POST',{text:'My work',status:'Pending',assignedTo:other})).status,201)
 assert.equal((await request('/tasks/'+id,'PATCH',{status:'Completed'})).status,200)
 assert.equal(tasks[0].status,'Completed')
 assert.equal((await request('/tasks/'+id,'PATCH',{text:'',image:null})).status,400)
 actor={_id:other,role:'employee'}
 assert.equal((await request('/tasks')).status,403)
 assert.equal((await request('/tasks/'+id,'PATCH',{text:'hijack'})).status,403)
 assert.equal((await request('/tasks/'+id,'DELETE')).status,403)
 assert.equal((await request('/management','POST',{problem:'x'})).status,403)
 actor={_id:other,role:'admin'}
 assert.equal((await (await request('/tasks')).json()).total,1);assert.deepEqual(lastQuery,{})
 assert.equal((await request('/tasks/'+id,'PATCH',{text:'admin overwrite'})).status,200)

 for(const state of ['Resolved','Open'])assert.equal((await request('/management/'+id,'PATCH',{state})).status,200)
 assert.equal((await request('/management','POST',{problem:'Admin problem',periodId})).status,201)
 for(const role of ['MANAGEMENT','ADMIN','SUPER_ADMIN']){actor={_id:other,role};assert.equal((await request('/management','POST',{problem:'Investigate payment',periodId})).status,201);assert.equal((await request('/management/'+id,'PATCH',{state:'Resolved'})).status,200);assert.equal((await request('/management/'+id,'PATCH',{state:'Open'})).status,200)}
 actor={_id:owner,role:'SUPER_ADMIN'};assert.equal((await request('/tasks/'+id,'DELETE')).status,200)
 const originalFetch=globalThis.fetch
 for(const [k,v] of Object.entries({CLOUDINARY_CLOUD_NAME:'test',CLOUDINARY_API_KEY:'test-key',CLOUDINARY_API_SECRET:'test-secret'})){const old=process.env[k];process.env[k]=v;t.after(()=>old===undefined?delete process.env[k]:process.env[k]=old)}
 t.mock.method(globalThis,'fetch',async(url,options)=>String(url).startsWith('https://api.cloudinary.com/')?{ok:true,json:async()=>({secure_url:'https://res.cloudinary.com/test/image/upload/image.png',public_id:'image'})}:originalFetch(url,options))
 assert.equal((await request('/tasks','POST',{image,status:'Pending',assignedTo:other})).status,201)
 assert.equal(tasks[0].text,'');assert.ok(tasks[0].image.url)
 assert.equal((await request('/tasks/'+id,'PATCH',{image:null})).status,400)
 assert.equal((await request('/tasks/'+id,'PATCH',{text:'Both',image})).status,200)
 assert.equal(tasks[0].text,'Both');assert.ok(tasks[0].image.url)
})
test('open age uses Cairo calendar days and freezes at resolution',()=>{
 const openedAt=new Date('2026-09-13T20:59:00Z')
 assert.equal(daysOpen({openedAt},new Date('2026-09-13T21:01:00Z')),1)
 assert.equal(daysOpen({openedAt,resolvedAt:new Date('2026-09-14T21:01:00Z')},new Date('2026-09-30')),2)
})
test('Cloudinary upload validates images, signs server-side and handles provider errors',async t=>{
 for(const [k,v] of Object.entries({CLOUDINARY_CLOUD_NAME:'test',CLOUDINARY_API_KEY:'test-key',CLOUDINARY_API_SECRET:'test-secret'})){const old=process.env[k];process.env[k]=v;t.after(()=>old===undefined?delete process.env[k]:process.env[k]=old)}
 t.mock.method(globalThis,'fetch',async(url,options)=>{assert.equal(url,'https://api.cloudinary.com/v1_1/test/image/upload');assert.equal(options.body.get('folder'),'golden-streamers/tasks');assert.match(options.body.get('signature'),/^[a-f0-9]{40}$/);return {ok:true,json:async()=>({secure_url:'https://res.cloudinary.com/test/image/upload/task.png',public_id:'task'})}})
 assert.equal((await uploadTaskImage(image)).publicId,'task')
 await assert.rejects(uploadTaskImage({name:'x',base64:'AAAA'}),{status:400})
 globalThis.fetch=async()=>({ok:false});await assert.rejects(uploadTaskImage(image),{status:502})
 delete process.env.CLOUDINARY_API_SECRET;await assert.rejects(uploadTaskImage(image),{status:503})
})
test('tracker preserves legacy photo meanings and validates new payment fields',()=>{
 const input={date:'2026-09-14',user:'Test',email:'test@example.test',product:'Game',cost:10,price:20,state:'Pending',website:'Store',paymentMethod:'Cash',photoForPayment:image,photoFromUs:image,purchaseProof:image,customerPaymentMethod:'Instapay',transferredToCompany:true}
 const stored=trackerInput(input),view=trackerView({_id:id,...stored})
 assert.equal(view.customerPaymentMethod,'Instapay');assert.equal(view.transferredToCompany,true)
 for(const k of ['purchaseProof','photoForPayment','photoFromUs'])assert.equal(view[k].name,'test.png')
 assert.throws(()=>trackerInput({...input,transferredToCompany:'yes'}),{status:400})
 assert.throws(()=>trackerInput({...input,customerPaymentMethod:'invalid'}),{status:400})
})
