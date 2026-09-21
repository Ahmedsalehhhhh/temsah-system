import './permission-fixture.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import Company from '../src/models/Company.js'
import Expense from '../src/models/Expense.js'
import User from '../src/models/User.js'
import router from '../src/routes/companies.js'
test('company rename and confirmed transactional cascade across periods',async t=>{
 process.env.JWT_SECRET='company-test-only'
 const id='111111111111111111111111',other='222222222222222222222222'
 let role='admin',companies=[{_id:id,name:'Old'},{_id:other,name:'Other'}],expenses=[{company:id,period:'open'},{company:id,period:'closed'},{company:other,period:'open'}],fail=false,ended=0
 const session={async withTransaction(fn){const before=structuredClone({companies,expenses});try{await fn()}catch(e){companies=before.companies;expenses=before.expenses;throw e}},async endSession(){ended++}}
 t.mock.method(mongoose,'startSession',async()=>session)
 t.mock.method(User,'findById',()=>({select:async()=>({_id:id,role})}))
 t.mock.method(Company,'findByIdAndUpdate',async(key,update)=>{const row=companies.find(c=>c._id===key);if(row)Object.assign(row,update.$set);return row})
 t.mock.method(Company,'findOneAndDelete',async(q,opts)=>{assert.equal(opts.session,session);const row=companies.find(c=>c._id===q._id);companies=companies.filter(c=>c!==row);return row})
 t.mock.method(Expense,'deleteMany',async(q,opts)=>{assert.equal(opts.session,session);assert.deepEqual(q,{company:id});if(fail)throw new Error('write failed');expenses=expenses.filter(e=>e.company!==q.company)})
 const app=express();app.use(express.json());app.use(router);app.use((e,req,res,next)=>res.status(e.status||500).json({message:e.message}))
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)))
 const send=(method,body,key=id)=>fetch('http://127.0.0.1:'+server.address().port+'/'+key,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+jwt.sign({sub:id},process.env.JWT_SECRET)},body:JSON.stringify(body)})
 role='staff';assert.equal((await send('PATCH',{name:'New'})).status,403);assert.equal((await send('DELETE',{confirm:true})).status,403);role='admin'
 assert.equal((await send('PATCH',{name:'  New Name  '})).status,200);assert.equal(companies[0].name,'New Name');assert.equal(companies[0].nameKey,'new name');assert.equal(expenses.length,3)
 assert.equal((await send('PATCH',{name:' '})).status,400)
 assert.equal((await send('DELETE',{confirm:true},'invalid')).status,400)
 assert.equal((await send('DELETE',{})).status,400);assert.equal(companies.length,2)
 fail=true;assert.equal((await send('DELETE',{confirm:true})).status,500);assert.equal(companies.length,2);assert.equal(expenses.length,3)
 fail=false;assert.equal((await send('DELETE',{confirm:true})).status,204);assert.deepEqual(companies,[{_id:other,name:'Other'}]);assert.deepEqual(expenses,[{company:other,period:'open'}]);assert.equal(ended,2)
 assert.equal((await send('DELETE',{confirm:true})).status,404)
})
