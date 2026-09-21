import './permission-fixture.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import jwt from 'jsonwebtoken'
import router from '../src/routes/managementRecords.js'
import User from '../src/models/User.js'
import Period from '../src/models/Period.js'
import Employee from '../src/models/Employee.js'
import Record from '../src/models/ManagementRecord.js'
test('management log validates values, preserves period boundaries and rejects non-admin deletion',async t=>{
 process.env.JWT_SECRET='local-management-test-only';const id='111111111111111111111111',period='222222222222222222222222';let role='ADMIN',closed=false,saved,deleted;
 t.mock.method(User,'findById',()=>({select:async()=>({_id:id,role})}));t.mock.method(Period,'findById',async()=>({_id:period,status:closed?'closed':'open'}));t.mock.method(Employee,'findOne',async()=>({_id:id,dept:'management'}));t.mock.method(Record,'create',async data=>{saved=data;return data});t.mock.method(Record,'findOneAndDelete',async filter=>{deleted=filter;return {_id:id}});
 const app=express();app.use(express.json());app.use(router);app.use((e,q,r,n)=>r.status(e.status||500).json({message:e.message}));const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)));
 const send=(method,body,suffix='')=>fetch('http://127.0.0.1:'+server.address().port+'/'+period+suffix,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+jwt.sign({sub:id},process.env.JWT_SECRET)},body:body?JSON.stringify(body):undefined});
 const body={employee:id,streamer:'Test',tier:3,score:150000,days:22,hours:100};assert.equal((await send('POST',body)).status,201);assert.equal(saved.days,22);assert.equal(saved.userId,id);assert.equal((await send('POST',{...body,days:35})).status,400);assert.equal((await send('POST',{...body,score:'bad'})).status,400);closed=true;assert.equal((await send('POST',body)).status,409);closed=false;assert.equal((await send('DELETE',null,'/'+id)).status,204);assert.equal(String(deleted.period),period);role='EMPLOYEE';assert.equal((await send('DELETE',null,'/'+id)).status,403)
})
