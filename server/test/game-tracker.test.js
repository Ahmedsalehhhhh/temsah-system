import {mockMedia} from './media-fixture.js'
import './permission-fixture.js'
import mongoose from 'mongoose'
import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../src/models/User.js'
import Period from '../src/models/Period.js'
import GameTrackerRecord from '../src/models/GameTrackerRecord.js'
import router from '../src/routes/gameTracker.js'
import authRouter from '../src/routes/auth.js'
import { trackerInput, trackerQuery, trackerAccess, trackerCreate } from '../src/lib/gameTracker.js'
import { readTrackerAccounts, setupTrackerAccounts } from '../src/setup-game-tracker.js'
const id='111111111111111111111111', recordId='222222222222222222222222', periodId='333333333333333333333333'
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF9sAAAAASUVORK5CYII=','base64')
const input={date:'2026-09-12',user:'Customer',email:'customer@example.test',product:'Game',cost:12.25,price:20.5,state:'Completed',website:'Shop',paymentMethod:'Instapay',photoForPayment:{name:'payment.png',base64:png.toString('base64')},photoFromUs:{name:'ours.png',base64:png.toString('base64')}}
test('Game Tracker validates fields, currency, actual image signatures, filters and safe setup',()=>{
 assert.equal(trackerInput(input).costMinor,1225)
 for(const change of [{cost:-1},{price:1.001},{cost:'12'},{date:'2026-02-30'},{state:'Invalid'},{paymentMethod:'Invalid'},{email:'bad'},{user:' '},{product:'x'.repeat(201)},{createdBy:id},{photoFromUs:{name:'fake.png',base64:Buffer.from('<script>alert(1)</script>').toString('base64')}},{photoForPayment:{name:'file.pdf',base64:Buffer.from('%PDF-1.4').toString('base64')}},{photoFromUs:{name:'big.png',base64:'A'.repeat(4*1024*1024+4)}}])assert.throws(()=>trackerInput({...input,...change}),{status:400})
 assert.equal(trackerQuery({search:'a.*'}).filter.$or[0].user.$regex,'a\\.\\*')
 for(const query of [{page:'0'},{limit:'101'},{search:{$ne:null}},{date:'2026-02-30'},{state:'bad'},{paymentMethod:{$ne:null}}])assert.throws(()=>trackerQuery(query),{status:400})
 assert.equal(trackerAccess({name:'Saif',role:'admin',permissions:{'game-tracker':'FULL_EDIT'}}),true)
 assert.equal(trackerCreate({gameTrackerIdentity:'accountant1',game_tracker_access:true,game_tracker_create:true}),false)
 assert.throws(()=>readTrackerAccounts({}),/EMAIL/)
 const env={}
 for(const [i,key] of ['SAIF','ACCOUNTANT_1','ACCOUNTANT_2','ACCOUNTANT_3'].entries()) { env['GAME_TRACKER_'+key+'_EMAIL']='user'+i+'@example.test';env['GAME_TRACKER_'+key+'_PASSWORD']='temporary-test-only-'+i }
 assert.equal(readTrackerAccounts(env).length,4)
 env.GAME_TRACKER_ACCOUNTANT_1_EMAIL=env.GAME_TRACKER_SAIF_EMAIL
 assert.throws(()=>readTrackerAccounts(env),/distinct/)
})
test('Game Tracker model rejects save changes, query updates/deletes/replacements and bulk writes',async()=>{
 const doc=GameTrackerRecord.hydrate({_id:recordId,periodId,...trackerInput(input),createdBy:id,created_at:new Date()})
 doc.product='changed'
 await assert.rejects(doc.save(),{status:405})
 await assert.rejects(doc.deleteOne(),{status:405})
 for(const operation of ['updateOne','updateMany','findOneAndUpdate','replaceOne','findOneAndReplace']) await assert.rejects(GameTrackerRecord[operation]({_id:recordId},{product:'changed'}).exec(),{status:405})
 for(const operation of ['deleteOne','deleteMany','findOneAndDelete']) await assert.rejects(GameTrackerRecord[operation]({_id:recordId}).exec(),{status:405})
 await assert.rejects(GameTrackerRecord.bulkWrite([{deleteOne:{filter:{_id:recordId}}}]),{status:405})
})
test('HTTP: separate logins, Saif create, accountant writers, private photos, pagination and immutable records',async t=>{
 mockMedia(t)
 process.env.JWT_SECRET='game-tracker-tests-only'
 const passwordHash=await bcrypt.hash('test-password-only',4)
 const users=['saif','accountant1','accountant2','accountant3','outsider','admin'].map(identity=>({_id:id,name:identity,email:identity+'@example.test',passwordHash,role:identity==='admin'?'ADMIN':identity==='outsider'?'EMPLOYEE':'ACCOUNTANT',gameTrackerIdentity:['saif','accountant1','accountant2','accountant3'].includes(identity)?identity:undefined,game_tracker_access:!['outsider','admin'].includes(identity),game_tracker_create:identity==='saif'}))
 let current=users[0], store=[]
 t.mock.method(User,'findById',()=>({select:async()=>({...current,passwordHash:undefined,toObject(){return {...this,passwordHash:undefined,toObject:undefined}}})}))
 t.mock.method(Period,'findById',async()=>({status:'open'}))
 t.mock.method(User,'findOne',async filter=>users.find(u=>u.email===filter.email))
 const match=(row,filter)=>Object.entries(filter).every(([k,v])=>k==='$or'?v.some(part=>Object.entries(part).some(([field,rule])=>new RegExp(rule.$regex,rule.$options).test(row[field]))):row[k]===v)
 t.mock.method(GameTrackerRecord,'create',async value=>{const row={_id:recordId,...value,created_at:new Date()};store.push(row);return row})
 t.mock.method(GameTrackerRecord,'find',filter=>{let skip=0;return {sort(){return this},skip(value){skip=value;return this},async limit(value){return store.filter(r=>match(r,filter)).slice(skip,skip+value)}}})
 t.mock.method(GameTrackerRecord,'countDocuments',async filter=>store.filter(r=>match(r,filter)).length)
 t.mock.method(GameTrackerRecord,'findById',value=>({select:async()=>store.find(r=>r._id===value)}))
 const app=express();app.use('/api/game-tracker',router);app.use(express.json());app.use('/api/auth',authRouter);app.use((e,req,res,next)=>res.status(e.status||500).json({message:e.message}))
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)))
 const base='http://127.0.0.1:'+server.address().port
 const request=(path='',method='GET',body,authorized=true)=>fetch(base+'/api/game-tracker'+path,{method,headers:{'Content-Type':'application/json',...(authorized?{Authorization:'Bearer '+jwt.sign({sub:id},process.env.JWT_SECRET)}:{})},body:body===undefined?undefined:JSON.stringify(body)})
 assert.equal((await request('','GET',undefined,false)).status,401)
 for(const user of users){
  current=user
  const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:user.email,password:'test-password-only'})})
  const session=await login.json();assert.ok(session.token);assert.equal(session.user.passwordHash,undefined);assert.equal(session.user.game_tracker_create,user.name!=='outsider');assert.equal(session.user.game_tracker_access,user.name!=='outsider')
 }
 current=users[0]
 const created=await request('','POST',{...input,periodId});assert.equal(created.status,201)
 const saved=await created.json();assert.equal(saved.cost,12.25);assert.equal(saved.photoForPayment.data,undefined);assert.ok(saved.created_at)
 for(const user of users){
  current=user
  const allowed=user.name!=='outsider'
  const listing=await request();assert.equal(listing.status,allowed?200:403)
  if(allowed)assert.equal((await listing.json()).total,1)
  const photo=await request('/'+recordId+'/photos/photoForPayment');assert.equal(photo.status,allowed?200:403)
  if(allowed){assert.equal(photo.headers.get('content-type'),'image/png');assert.equal(photo.headers.get('cache-control'),'private, no-store');assert.deepEqual(Buffer.from(await photo.arrayBuffer()),png)}
  if(user.name==='outsider')assert.equal((await request('','POST',input)).status,403)
  for(const method of ['PUT','PATCH','DELETE'])for(const path of ['', '/'+recordId]) { if(allowed && method!=='PUT')continue;assert.equal((await request(path,method,{product:'changed'})).status,!allowed?403:method==='PUT'?405:403) }
 }
 current=users[0]
 assert.equal((await (await request('?search=customer&date=2026-09-12&state=Completed&paymentMethod=Instapay&limit=1')).json()).records.length,1)
 assert.equal((await (await request('?page=2&limit=1')).json()).records.length,0)
 assert.equal((await (await request('?search=missing')).json()).total,0)
 assert.equal((await request('','POST',{...input,price:-1})).status,400)
 assert.equal((await request('/bad/photos/photoForPayment')).status,400)
 assert.equal(store.length,1);assert.equal(store[0].product,'Game')
})
test('setup hashes all four passwords, assigns ACCOUNTANT access, and refuses unrelated existing users',async t=>{
 const previous=process.env.MONGO_URI
 process.env.MONGO_URI='mongodb://localhost/game-tracker-setup-test'
 t.after(()=>{if(previous===undefined)delete process.env.MONGO_URI;else process.env.MONGO_URI=previous})
 t.mock.method(mongoose,'connect',async()=>{})
 t.mock.method(User,'init',async()=>{})
 const find=t.mock.method(User,'findOne',async()=>null)
 const writes=[]
 t.mock.method(User,'updateOne',async(filter,update,options)=>{writes.push({filter,update,options})})
 const env={}
 for(const [i,key] of ['SAIF','ACCOUNTANT_1','ACCOUNTANT_2','ACCOUNTANT_3'].entries()) {env['GAME_TRACKER_'+key+'_EMAIL']='setup'+i+'@example.test';env['GAME_TRACKER_'+key+'_PASSWORD']='setup-test-password-'+i}
 await setupTrackerAccounts(env)
 assert.equal(writes.length,4)
 for(const [i,write] of writes.entries()) {
  const account=write.update.$setOnInsert
  assert.equal(account.password,undefined)
  assert.equal(await bcrypt.compare('setup-test-password-'+i,account.passwordHash),true)
  assert.equal(account.game_tracker_access,true)
  assert.equal(account.game_tracker_create,true)
  assert.equal(account.role,'ACCOUNTANT')
  assert.deepEqual(Object.keys(write.update),['$setOnInsert'])
  assert.equal(write.options.upsert,true)
 }
 find.mock.mockImplementation(async()=>({email:'setup0@example.test',gameTrackerIdentity:undefined}))
 await assert.rejects(setupTrackerAccounts(env),/overwritten/)
 assert.equal(writes.length,4)
})
test('privileged PATCH/DELETE retain validation and reject legacy staff accounts',async t=>{
 assert.equal(trackerAccess({role:'admin',permissions:{'game-tracker':'FULL_EDIT'},game_tracker_access:false}),true)
 assert.equal(trackerCreate({role:'admin',permissions:{'game-tracker':'FULL_EDIT'},game_tracker_access:false,game_tracker_create:false}),true)
 for(const actor of [{role:'staff',gameTrackerIdentity:'saif'},{role:'staff',gameTrackerIdentity:'accountant1'},null]){
  await assert.rejects(GameTrackerRecord.adminUpdate(actor,recordId,{product:'bad'}),{status:403})
  await assert.rejects(GameTrackerRecord.adminDelete(actor,recordId),{status:403})
 }
 process.env.JWT_SECRET='admin-route-test-only'
 let actor={_id:id,role:'admin',permissions:{'game-tracker':'FULL_EDIT'},game_tracker_access:false,game_tracker_create:false}
 let stored={_id:recordId,...trackerInput(input),createdBy:id,created_at:new Date()}
 let mutations=0
 t.mock.method(User,'findById',()=>({select:async()=>actor}))
 t.mock.method(GameTrackerRecord,'findById',async()=>stored)
 t.mock.method(GameTrackerRecord,'adminUpdate',async(user,key,fields)=>{
  assert.equal(user.role,'ADMIN');assert.equal(key,recordId)
  assert.equal(Object.hasOwn(fields,'createdBy'),false)
  assert.equal(Object.hasOwn(fields,'created_at'),false)
  assert.equal(Object.hasOwn(fields,'photoForPayment'),false)
  mutations++;stored={...stored,...fields};return stored
 })
 t.mock.method(GameTrackerRecord,'adminDelete',async(user,key)=>{assert.equal(user.role,'ADMIN');mutations++;const previous=stored;stored=null;return previous})
 const app=express();app.use('/api/game-tracker',router);app.use((e,req,res,next)=>res.status(e.status||500).json({message:e.message}))
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)))
 const token=jwt.sign({sub:id},process.env.JWT_SECRET)
 const send=(method,body,key=recordId,auth=true)=>fetch('http://127.0.0.1:'+server.address().port+'/api/game-tracker/'+key,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)})
 assert.equal((await send('PATCH',{price:3},recordId,false)).status,401)
 for(const body of [{createdBy:id},{created_at:'2020-01-01'},{role:'admin',permissions:{'game-tracker':'FULL_EDIT'}},{price:-1},{state:'invalid'},[],{}])assert.equal((await send('PATCH',body)).status,400)
 assert.equal((await send('PATCH',{price:3},'bad')).status,400)
 const edited=await send('PATCH',{price:3,product:'edited'});assert.equal(edited.status,200);assert.equal((await edited.json()).price,3)
 for(const identity of ['saif','accountant1','accountant2','accountant3']){
  actor={_id:id,role:'staff',gameTrackerIdentity:identity,game_tracker_access:true,game_tracker_create:true}
  assert.equal((await send('PATCH',{product:'forbidden'})).status,403)
  assert.equal((await send('DELETE')).status,403)
 }
 assert.equal(mutations,1)
 actor={_id:id,role:'admin',permissions:{'game-tracker':'FULL_EDIT'}}
 assert.equal((await send('DELETE')).status,200)
 assert.equal((await send('PATCH',{price:4})).status,404)
 assert.equal((await send('DELETE')).status,404)
})
