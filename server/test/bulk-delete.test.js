import './permission-fixture.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import router from '../src/routes/streamers.js'
import User from '../src/models/User.js'
import Period from '../src/models/Period.js'
import Streamer from '../src/models/Streamer.js'
import Performance from '../src/models/StreamerPerformance.js'
test('bulk delete requires admin, confirmation, valid ids, open period and one transaction',async t=>{
 process.env.JWT_SECRET='bulk-test-only'
 let role='admin',closed=false,fail=false;const calls=[];const session={}
 t.mock.method(User,'findById',()=>({select:async()=>({role})}))
 t.mock.method(Period,'findById',async()=>({status:closed?'closed':'open'}))
 t.mock.method(mongoose.connection,'transaction',async cb=>{calls.push('transaction');await cb(session)})
 t.mock.method(Performance,'deleteMany',async(filter,options)=>{assert.equal(options.session,session);calls.push('performance');if(fail)throw new Error('test failure')})
 t.mock.method(User,'deleteMany',async(filter,options)=>{assert.fail('Deleting streamers must not delete login accounts')})
 t.mock.method(Streamer,'deleteMany',async(filter,options)=>{assert.equal(options.session,session);assert.equal(filter._id.$in.length,2);calls.push('streamers');return {deletedCount:2}})
 const app=express();app.use(express.json());app.use('/streamers',router);app.use((e,req,res,next)=>res.status(e.status||500).json({message:e.message}))
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)))
 const ids=['111111111111111111111111','222222222222222222222222']
 const send=(body,auth=true)=>fetch('http://127.0.0.1:'+server.address().port+'/streamers/bulk-delete',{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+jwt.sign({sub:'u'},process.env.JWT_SECRET)}:{})},body:JSON.stringify(body)})
 const body={ids,confirmed:true,periodId:'p'}
 assert.equal((await send(body,false)).status,401)
 role='staff';assert.equal((await send(body)).status,403);role='admin'
 for(const patch of [{confirmed:false},{ids:[]},{ids:['invalid']},{ids:undefined}])assert.equal((await send({...body,...patch})).status,400)
 closed=true;assert.equal((await send(body)).status,409);closed=false;assert.deepEqual(calls,[])
 const result=await send({...body,ids:[...ids,ids[0]]});assert.equal(result.status,200);assert.deepEqual(await result.json(),{deletedCount:2,deletedIds:ids})
 assert.deepEqual(calls,['transaction','performance','streamers'])
 calls.length=0;fail=true;assert.equal((await send(body)).status,500);assert.deepEqual(calls,['transaction','performance'])
})
