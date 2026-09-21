import './permission-fixture.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import jwt from 'jsonwebtoken'
import router from '../src/routes/periods.js'
import User from '../src/models/User.js'
import Period from '../src/models/Period.js'
test('exchange rate rejects invalid or closed periods and updates only the requested open period',async t=>{
 process.env.JWT_SECRET='local-rate-test';const id='111111111111111111111111';let filter,update,closed=false,calls=0;
 t.mock.method(User,'findById',()=>({select:async()=>({_id:id,role:'SUPER_ADMIN'})}));
 t.mock.method(Period,'findOneAndUpdate',async(f,u)=>{calls++;filter=f;update=u;return closed?null:{_id:id,...u.$set}});
 const app=express();app.use(express.json());app.use('/api/periods',router);const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)));
 const send=value=>fetch('http://127.0.0.1:'+server.address().port+'/api/periods/'+id+'/exchange-rate',{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:'Bearer '+jwt.sign({sub:id},process.env.JWT_SECRET)},body:JSON.stringify({egpConversionRate:value})});
 for(const value of [0,-1,'bad',1000001])assert.equal((await send(value)).status,400);assert.equal(calls,0);
 assert.equal((await send(51.25)).status,200);assert.deepEqual(filter,{_id:id,status:'open'});assert.deepEqual(update,{$set:{egpConversionRate:51.25}});
 closed=true;assert.equal((await send(52)).status,409);
})
