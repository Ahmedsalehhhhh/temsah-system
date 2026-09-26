import {mockMedia} from './media-fixture.js'
import './permission-fixture.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import jwt from 'jsonwebtoken'
import Company from '../src/models/Company.js'
import Expense from '../src/models/Expense.js'
import Period from '../src/models/Period.js'
import User from '../src/models/User.js'
import companiesRouter from '../src/routes/companies.js'
import expensesRouter from '../src/routes/expenses.js'
import { expenseInput, companyName } from '../src/lib/expenses.js'
const c1='111111111111111111111111',c2='222222222222222222222222',p1='333333333333333333333333',p2='444444444444444444444444',id='555555555555555555555555'
test('expense validation: exact currency, valid date, safe files and company names',()=>{
 const classified=expenseInput({amount:10.25,category:'  أجهزة   ومعدات ',description:' إيجار ',date:'2026-09-12'})
 assert.equal(classified.amountMinor,1025);assert.equal(classified.category,'أجهزة ومعدات')
 assert.equal(expenseInput({amount:10.25,description:' إيجار ',date:'2026-09-12'}).category,'غير مصنف')
 assert.throws(()=>expenseInput({amount:1,category:'x'.repeat(81),description:'x',date:'2026-09-12'}),{status:400})
 for(const amount of [0,-1,1.001,Infinity,'10'])assert.throws(()=>expenseInput({amount,description:'x',date:'2026-09-12'}),{status:400})
 assert.throws(()=>expenseInput({amount:1,description:'x',date:'2026-02-30'}),{status:400})
 assert.throws(()=>expenseInput({amount:1,description:'x',date:'2026-09-12',receipt:{name:'fake.png',base64:Buffer.from('<html>').toString('base64')}}),{status:400})
 assert.throws(()=>expenseInput({amount:1,description:'x',date:'2026-09-12',receipt:{name:'big.pdf',base64:'A'.repeat(4*1024*1024+4)}}),{status:400})
 assert.deepEqual(companyName('  Golden   Streamers  '),{name:'Golden Streamers',nameKey:'golden streamers'})
})
test('HTTP companies/expenses: CRUD, company-period isolation, private receipts, roles and period lock',async t=>{
 mockMedia(t)
 process.env.JWT_SECRET='expense-test-only'
 let role='admin',closed=false,store=[],companyStore=[]
 t.mock.method(User,'findById',()=>({select:async()=>({_id:id,role})}))
 t.mock.method(Period,'findById',async()=>({status:closed?'closed':'open'}))
 t.mock.method(Company,'exists',async({_id})=>[c1,c2].includes(_id))
 t.mock.method(Company,'find',()=>({sort:async()=>companyStore}))
 t.mock.method(Company,'create',async data=>{if(companyStore.some(c=>c.nameKey===data.nameKey))throw Object.assign(new Error('duplicate'),{code:11000});const row={_id:c1,...data};companyStore.push(row);return row})
 const match=(r,f)=>Object.entries(f).every(([key,value])=>String(r[key])===String(value))
 t.mock.method(Expense,'create',async data=>{const row={_id:id,...data};store.push(row);return row})
 t.mock.method(Expense,'find',f=>({sort:async()=>store.filter(r=>match(r,f))}))
 t.mock.method(Expense,'findOne',f=>({select:async()=>store.find(r=>match(r,f))}))
 t.mock.method(Expense,'findOneAndUpdate',async(f,u)=>{const row=store.find(r=>match(r,f));if(row)Object.assign(row,u.$set);return row})
 t.mock.method(Expense,'findOneAndDelete',async f=>{const row=store.find(r=>match(r,f));store=store.filter(r=>r!==row);return row})
 const app=express();app.use('/expenses',expensesRouter);app.use(express.json());app.use('/companies',companiesRouter)
 app.use((e,req,res,next)=>res.status(e.code===11000?409:e.status||500).json({message:e.message}))
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)))
 const request=(url,method='GET',body,auth=true)=>fetch('http://127.0.0.1:'+server.address().port+url,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+jwt.sign({sub:id},process.env.JWT_SECRET)}:{})},body:body?JSON.stringify(body):undefined})
 const scope='?companyId='+c1+'&periodId='+p1,base='/expenses'+scope
 assert.equal((await request('/companies','GET',null,false)).status,401)
 for(role of ['staff','streamer']){assert.equal((await request('/companies')).status,403);assert.equal((await request(base)).status,403);assert.equal((await request('/expenses/'+id+'/receipt'+scope)).status,403)}
 role='admin'
 assert.equal((await request('/companies','POST',{name:'Golden Streamers'})).status,201)
 assert.equal((await (await request('/companies')).json()).length,1)
 assert.equal((await request('/companies','POST',{name:'golden streamers'})).status,409)
 const body={amount:125.75,category:'إيجار',description:'إيجار مكتب',date:'2026-09-12',receipt:{name:'receipt.pdf',base64:Buffer.from('%PDF-1.4\ntest').toString('base64')}}
 const created=await request(base,'POST',body);assert.equal(created.status,201)
 const row=await created.json();assert.equal(row.category,'إيجار');assert.equal(row.receipt.mime,'application/pdf');assert.equal(row.receipt.data,undefined)
 assert.equal((await (await request(base)).json()).total,125.75)
 for(const q of ['?companyId='+c2+'&periodId='+p1,'?companyId='+c1+'&periodId='+p2]){
 assert.equal((await (await request('/expenses'+q)).json()).expenses.length,0)
 assert.equal((await request('/expenses/'+id+q,'PATCH',body)).status,404)
 assert.equal((await request('/expenses/'+id+'/receipt'+q)).status,404)
 }
 const receipt=await request('/expenses/'+id+'/receipt'+scope);assert.equal(receipt.headers.get('cache-control'),'private, no-store');assert.match(await receipt.text(),/%PDF/)
 const {receipt:unused,...plain}=body
 assert.equal((await request('/expenses/'+id+scope,'PATCH',{...plain,amount:200})).status,200)
 assert.equal((await (await request(base)).json()).total,200)
 assert.equal((await request('/expenses/'+id+'/receipt'+scope)).status,200)
 closed=true;assert.equal((await request(base,'POST',body)).status,409);assert.equal((await request('/expenses/'+id+scope,'DELETE')).status,409);closed=false
 assert.equal((await request('/expenses/'+id+scope,'PATCH',{...plain,receipt:null})).status,200)
 assert.equal((await request('/expenses/'+id+'/receipt'+scope)).status,404)
 assert.equal((await request('/expenses/'+id+scope,'DELETE')).status,204)
 assert.equal((await (await request(base)).json()).total,0)
})
