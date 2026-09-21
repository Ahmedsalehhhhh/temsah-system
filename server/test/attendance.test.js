import test from 'node:test'
import assert from 'node:assert/strict'
import {workDate,dayBounds,fields,dateValue,passwordValue,timestamp,attendanceView,accountView} from '../src/lib/attendance.js'
import Attendance from '../src/models/Attendance.js'

test('attendance server date and DST-aware business-day boundaries',()=>{
 for(const day of ['2026-01-15','2026-07-15','2026-04-24','2026-10-30']){
  const {start,end}=dayBounds(day)
  assert.equal(workDate(start),day)
  assert.equal(workDate(new Date(+end-1)),day)
  assert.notEqual(workDate(end),day)
  assert.ok(+end>+start)
 }
})
test('attendance rejects identity injection, malformed dates, timestamps, and passwords',()=>{
 for(const body of [{userId:'other'},{employeeId:'other'},{email:'other@test.local'},{name:'Other'},{checkIn:'2026-01-01'},[]])assert.throws(()=>fields(body,[]),{status:400})
 assert.throws(()=>dateValue('2026-02-30'),{status:400})
 assert.throws(()=>timestamp('2026-09-13T09:00'),{status:400})
 assert.throws(()=>passwordValue('short'),{status:400})
 assert.throws(()=>passwordValue('😀'.repeat(20)),{status:400})
 assert.equal(passwordValue('valid-long-password'),'valid-long-password')
})
test('attendance durations and account DTOs never expose password material',()=>{
 const checkIn=new Date('2026-09-13T06:03:00Z'),checkOut=new Date('2026-09-13T14:18:00Z')
 const row={_id:'r',userId:'u',workDate:'2026-09-13',checkIn,checkOut,updates:[{}],__v:2}
 assert.equal(attendanceView(row).workedSeconds,8*3600+15*60)
 assert.equal(attendanceView({...row,checkOut:null},new Date(+checkIn+60000)).workedSeconds,60)
 assert.equal(attendanceView(row).status,'Finished')
 const u=accountView({_id:'u',name:'Legacy',email:'u@test.local',role:'staff',passwordHash:'secret'})
 assert.equal(u.fullName,'Legacy');assert.equal(u.status,'ACTIVE');assert.equal(u.role,'EMPLOYEE');assert.equal(u.passwordHash,undefined)
})
test('attendance schema enforces per-day uniqueness and one open shift',()=>{
 const indexes=Attendance.schema.indexes()
 assert.ok(indexes.some(([keys,options])=>keys.userId&&keys.workDate&&options.unique))
 assert.ok(indexes.some(([keys,options])=>keys.userId&&options.unique&&options.partialFilterExpression?.isOpen))
 assert.ok(Attendance.schema.path('audits'));assert.ok(Attendance.schema.path('updates'))
})
