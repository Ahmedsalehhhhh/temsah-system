import mongoose from 'mongoose'
import StreamerPerformance from '../src/models/StreamerPerformance.js'
import './permission-fixture.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import jwt from 'jsonwebtoken'
import ExcelJS from 'exceljs'
import router from '../src/routes/streamers.js'
import User from '../src/models/User.js'
import Period from '../src/models/Period.js'
import Settings from '../src/models/Settings.js'
import Streamer from '../src/models/Streamer.js'
test('HTTP import: authentication, preview, duplicate-safe save, existing rates, closed periods', async (t) => {
  process.env.JWT_SECRET = 'local-import-test-only'
  const token = jwt.sign({sub:'test-admin'},process.env.JWT_SECRET)
  let role='admin'; let closed=false; let writes=0
  const saved = [{_id:'existing',name:'Existing',rate:.7}]
  t.mock.method(User,'findById',()=>({select:async()=>({role})}))
  t.mock.method(Period,'findById',async()=>({status:closed?'closed':'open'}))
  t.mock.method(Settings,'findById',async()=>({streamerRules:{defaultRate:.62}}))
  t.mock.method(Streamer,'find',()=>({sort:async()=>saved}))
  t.mock.method(mongoose.connection,'transaction',async fn=>fn({}))
  t.mock.method(Streamer,'findOne',filter=>({session:async()=>saved.find(s=>s.name===filter.name)}))
  t.mock.method(Streamer,'create',async rows=>{writes++;const row={_id:String(saved.length),...rows[0]};saved.push(row);return [row]})
  const monthly=[];t.mock.method(StreamerPerformance,'updateOne',async(filter,update)=>monthly.push({filter,update}))
  const app=express(); app.use(express.json({limit:'3mb'}));app.use('/streamers',router)
  app.use((err,req,res,next)=>res.status(err.status||500).json({message:err.message}))
  const server=app.listen(0,'127.0.0.1')
  await new Promise(resolve=>server.once('listening',resolve))
  t.after(()=>new Promise(resolve=>server.close(resolve)))
  const url='http://127.0.0.1:'+server.address().port+'/streamers'
  const post=(path,body,auth=true)=>fetch(url+path,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)})
  assert.equal((await post('/import',{names:['أحمد'],periodId:'test'},false)).status,401)
  role='staff'
  assert.equal((await post('/import',{names:['أحمد'],periodId:'test'})).status,403)
  role='admin'
  const first=await post('/import',{names:['Existing','أحمد',' أحمد '],periodId:'test'})
  assert.equal(first.status,200)
  const body=await first.json()
  assert.equal(body.added,1);assert.equal(body.skipped,2)
  assert.equal(saved[0].rate,.7);assert.equal(saved[1].rate,.62)
  const second=await (await post('/import',{names:['Existing','أحمد'],periodId:'test'})).json()
  assert.equal(second.added,0);assert.equal(second.skipped,2)
  const full=await post('/import',{rows:[{name:'كامل',score:'150,000',days:'22',hours:100,bonus:0,deduction:'',rate:.5}],periodId:'test'})
  assert.equal(full.status,200);assert.equal(monthly[0].update.$set.score,150000);assert.equal(monthly[0].update.$set.days,22);assert.equal(monthly[0].update.$set.hours,100);assert.equal(monthly[0].update.$set.bonus,0);assert.ok(!Object.hasOwn(monthly[0].update.$set,'deduction'))
  assert.equal((await post('/import',{rows:[{name:'bad',score:'not numeric'}],periodId:'test'})).status,400)
  assert.equal((await post('/import',{rows:[{name:'bad'}],periodId:'test',updateExisting:'false'})).status,400)
  const before=writes
  assert.equal((await post('/import',{names:[{}],periodId:'test'})).status,400)
  closed=true
  assert.equal((await post('/import',{names:['New'],periodId:'test'})).status,409)
  assert.equal(writes,before)
  const wb=new ExcelJS.Workbook();wb.addWorksheet('Names').addRows([['Name'],['أحمد']])
  const preview=await fetch(url+'/import/preview',{method:'POST',headers:{'Content-Type':'application/octet-stream',Authorization:'Bearer '+token},body:Buffer.from(await wb.xlsx.writeBuffer())})
  assert.equal(preview.status,200);assert.equal((await preview.json()).sheets[0].startRow,2)
})
