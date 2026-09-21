import './permission-fixture.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import router from '../src/routes/salaries.js'
import User from '../src/models/User.js'
import Period from '../src/models/Period.js'
import Employee from '../src/models/Employee.js'
import Recruiter from '../src/models/Recruiter.js'
import StaffRow from '../src/models/StaffRow.js'
import RecruitingRecord from '../src/models/RecruitingRecord.js'
import RecruiterAdjustment from '../src/models/RecruiterAdjustment.js'
import ManagementRecord from '../src/models/ManagementRecord.js'
import Settings from '../src/models/Settings.js'
import Withdrawal from '../src/models/SalaryWithdrawal.js'
test('withdrawals validate balance, permission, closed period, retries and cancellation',async t=>{
 process.env.JWT_SECRET='local-withdrawal-test';const id='111111111111111111111111',period='222222222222222222222222';let stored=[],closed=false,role='SUPER_ADMIN';const query=data=>({session(){return this},lean:async()=>data,sort(){return this},then(resolve){return Promise.resolve(data).then(resolve)}});
 t.mock.method(User,'findById',()=>({select:async()=>({_id:id,role})}));t.mock.method(mongoose.connection,'transaction',async fn=>fn(null));t.mock.method(Period,'findOneAndUpdate',async f=>{assert.equal(String(f._id),period);assert.equal(f.status,'open');return closed?null:{_id:period}});
 t.mock.method(Employee,'find',()=>query([{_id:id,name:'Test',dept:'it'}]));t.mock.method(StaffRow,'find',()=>query([{employee:id,baseSalary:1000}]));for(const model of [Recruiter,RecruitingRecord,RecruiterAdjustment,ManagementRecord])t.mock.method(model,'find',()=>query([]));t.mock.method(Settings,'findById',()=>query({managementItBaseSalary:8000,tierAmounts:{1:0,2:1500,3:1000,4:500,5:0}}));
 t.mock.method(Withdrawal,'find',()=>query(stored));t.mock.method(Withdrawal,'findOne',f=>query(stored.find(w=>w.requestId===f.requestId)));t.mock.method(Withdrawal,'create',async rows=>{const w={...rows[0],_id:id};stored.push(w);return [w]});t.mock.method(Withdrawal,'findOneAndUpdate',async(f,u)=>{const w=stored.find(w=>w._id===String(f._id)&&!w.voidedAt);if(w)Object.assign(w,u.$set);return w});
 const app=express();app.use(express.json());app.use('/api/salaries',router);app.use((e,q,r,n)=>r.status(e.status||500).json({message:e.message}));const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)));
 const send=(body,suffix='')=>fetch('http://127.0.0.1:'+server.address().port+'/api/salaries/'+period+'/withdrawals'+suffix,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+jwt.sign({sub:id},process.env.JWT_SECRET)},body:JSON.stringify(body)});
 const body={source:'employee:'+id,amount:250,note:'test',requestId:'test-request-000001'};
 assert.equal((await send({...body,amount:-1})).status,400);assert.equal((await send({...body,amount:0.001})).status,400);assert.equal((await send({...body,amount:1001})).status,409);assert.equal(stored.length,0);
 assert.equal((await send(body)).status,201);assert.equal((await send(body)).status,201);assert.equal(stored.length,1);assert.equal(stored[0].amountMinor,25000);
 assert.equal((await send({...body,amount:800,requestId:'test-request-000002'})).status,409);assert.equal((await send({...body,amount:200})).status,409);
 closed=true;assert.equal((await send({...body,requestId:'test-request-000003'})).status,409);closed=false;role='EMPLOYEE';assert.equal((await send(body)).status,403);role='SUPER_ADMIN';assert.equal((await send({},'/'+id+'/void')).status,200);assert.ok(stored[0].voidedAt);assert.equal((await send({...body,amount:1000,requestId:'test-request-000004'})).status,201);
})
