import './permission-fixture.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import jwt from 'jsonwebtoken'
import recordsRouter from '../src/routes/managementRecords.js'
import employeesRouter from '../src/routes/employees.js'
import Record from '../src/models/ManagementRecord.js'
import Employee from '../src/models/Employee.js'
import User from '../src/models/User.js'
import Period from '../src/models/Period.js'
import Settings from '../src/models/Settings.js'
import StaffRow from '../src/models/StaffRow.js'
test('management payroll follows record add, tier edit and deletion in the selected period',async t=>{
 process.env.JWT_SECRET='local-management-payroll';const id='111111111111111111111111',period='222222222222222222222222';let records=[];
 t.mock.method(User,'findById',()=>({select:async()=>({_id:id,role:'SUPER_ADMIN'})}));t.mock.method(Period,'findById',async()=>({_id:period,status:'open'}));
 t.mock.method(Employee,'findOne',async()=>({_id:id,dept:'management'}));t.mock.method(Employee,'find',async()=>[{_id:id,dept:'management'}]);t.mock.method(StaffRow,'find',async()=>[]);t.mock.method(Settings,'findById',async()=>({tierAmounts:{1:0,2:1500,3:1000,4:500,5:0}}));
 t.mock.method(Record,'create',async data=>{const row={_id:id,...data};records.push(row);return row});t.mock.method(Record,'find',async filter=>records.filter(r=>String(r.period)===String(filter.period)));
 t.mock.method(Record,'findOneAndUpdate',async(f,u)=>{const row=records.find(r=>String(r._id)===String(f._id)&&String(r.period)===String(f.period));if(row)Object.assign(row,u.$set);return row});
 t.mock.method(Record,'findOneAndDelete',async f=>{const row=records.find(r=>String(r._id)===String(f._id)&&String(r.period)===String(f.period));records=records.filter(r=>r!==row);return row});
 const app=express();app.use(express.json());app.use('/api/management-records',recordsRouter);app.use('/api/employees',employeesRouter);app.use((e,q,r,n)=>r.status(e.status||500).json({message:e.message}));const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)));
 const send=(path,method='GET',body)=>fetch('http://127.0.0.1:'+server.address().port+'/api/'+path,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+jwt.sign({sub:id},process.env.JWT_SECRET)},body:body?JSON.stringify(body):undefined});
 const bonus=async(p=period)=>(await(await send('employees/management/rows/'+p)).json())[0].recruiterBonus;
 const body={employee:id,streamer:'Test',tier:2,score:150000,days:22,hours:100};assert.equal(await bonus(),0);
 assert.equal((await send('management-records/'+period,'POST',body)).status,201);assert.equal(await bonus(),1500);assert.equal(await bonus('333333333333333333333333'),0);
 assert.equal((await send('management-records/'+period+'/'+id,'PATCH',{...body,tier:3})).status,200);assert.equal(await bonus(),1000);
 assert.equal((await send('management-records/'+period+'/'+id,'DELETE')).status,204);assert.equal(await bonus(),0);
})
