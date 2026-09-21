import test from 'node:test'
import assert from 'node:assert/strict'
import {ownScope,taskScope,companyScope,canViewAll} from '../src/lib/recordScope.js'
import {validateImportRows} from '../src/lib/importRows.js'
import {readMedia} from '../src/lib/privateMedia.js'
import {reportData} from '../src/routes/reports.js'
import User from '../src/models/User.js'
import Attendance from '../src/models/Attendance.js'
import Settings from '../src/models/Settings.js'
const actor={_id:'111111111111111111111111',role:'MANAGEMENT',permissions:{management:'FULL_EDIT','attendance-and-work':'FULL_EDIT',tasks:'FULL_EDIT'}}
test('record ownership remains private until a section-specific read-all grant; grant does not widen mutations',()=>{
 assert.deepEqual(ownScope(actor,'management'),{userId:actor._id})
 const delegated={...actor,permissions:{...actor.permissions,'management-all':'VIEW_ONLY','tasks-all':'VIEW_ONLY'}}
 assert.deepEqual(ownScope(delegated,'management'),{})
 assert.deepEqual(ownScope(delegated,'management','userId',true),{userId:actor._id})
 assert.equal(canViewAll(delegated,'attendance-and-work'),false)
 assert.deepEqual(taskScope(delegated),{})
 assert.equal(taskScope(delegated,true).$or.length,2)
 assert.deepEqual(companyScope(actor),{expenseReaders:actor._id})
 assert.deepEqual(companyScope({...actor,role:'SUPER_ADMIN'}),{})
})
test('import keeps blank values unchanged, imports zero, rejects invalid numbers, counts duplicate names',()=>{
 const r=validateImportRows([{name:'أحمد',score:'150,000',days:22,hours:100,bonus:0,deduction:''},{name:'أحمد'},{name:'Rana'}])
 assert.equal(r.rows.length,2);assert.equal(r.duplicates,1);assert.equal(r.rows[0].bonus,0);assert.equal(r.rows[0].score,150000);assert.equal(r.rows[0].deduction,undefined);assert.deepEqual(r.rows[1],{name:'Rana'})
 assert.throws(()=>validateImportRows([{name:'X',score:'bad'}]),{status:400})
})
test('legacy private files remain readable without a cloud upload',async()=>{const data=Buffer.from('legacy');assert.deepEqual(await readMedia({data}),data)})
test('attendance export includes every employee, including no attendance record, and scopes ordinary users',async t=>{
 const people=Array.from({length:20},(_,i)=>({_id:String(i).padStart(24,'0'),fullName:'موظف '+i,email:'person'+i+'@example.test'}));let observed
 const chain=value=>({select(){return this},limit(){return this},lean:async()=>value})
 t.mock.method(Settings,'findById',()=>({lean:async()=>new Settings().toObject()}))
 t.mock.method(User,'find',filter=>{observed=filter;return chain(filter._id?people.slice(0,1):people)})
 t.mock.method(Attendance,'find',()=>chain([{userId:people[0]._id,checkIn:new Date('2026-09-20T08:00:00Z'),updates:[]}]))
 const report=await reportData({...actor,role:'ADMIN'},'attendance-and-work',null,'2026-09-20')
 assert.equal(report.rows.length,20);assert.equal(report.rows.filter(r=>r.status==='لم يبدأ').length,19);assert.deepEqual(observed,{})
 const own=await reportData(actor,'attendance-and-work',null,'2026-09-20');assert.equal(own.rows.length,1);assert.deepEqual(observed,{_id:actor._id})
})
