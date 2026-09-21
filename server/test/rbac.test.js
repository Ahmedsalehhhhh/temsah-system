import Company from '../src/models/Company.js'
import './permission-fixture.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import jwt from 'jsonwebtoken'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import User from '../src/models/User.js'
import Attendance from '../src/models/Attendance.js'
import Period from '../src/models/Period.js'
import Problem from '../src/models/Problem.js'
import StreamerPerformance from '../src/models/StreamerPerformance.js'
import RecruitingRecord from '../src/models/RecruitingRecord.js'
import RecruiterAdjustment from '../src/models/RecruiterAdjustment.js'
import StaffRow from '../src/models/StaffRow.js'
import Expense from '../src/models/Expense.js'
import GameTrackerRecord from '../src/models/GameTrackerRecord.js'
import { ROLES, can as effectiveCan, assignableRoles, canManageAccount, normalizeRole } from '../src/lib/permissions.js'
import { roleValue, assertManageable } from '../src/routes/employeeAccounts.js'

const id = '111111111111111111111111', targetId = '222222222222222222222222'
const ts = createRequire(new URL('../../client/package.json', import.meta.url))('typescript')
function clientModule(file, dependencies = {}) {
  const source = readFileSync(new URL('../../client/src/app/core/' + file, import.meta.url), 'utf8')
  const exports = {}
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, require: name => dependencies[name], setTimeout })
  return exports
}
import { defaultPermissions } from '../src/lib/permissionDefaults.js'
const can = (user,resource,action) => effectiveCan({...user,permissions:user.permissions || defaultPermissions(normalizeRole(user.role))},resource,action)
const clientPolicy = clientModule('permissions.ts')
const clientCan = clientPolicy.can
clientPolicy.can = (role,page,action='read') => clientCan(role,({finance:'overview',operations:'attendance-and-work',accounts:'employee-accounts'})[page] || page,action,defaultPermissions(normalizeRole(role)))

test('all five role matrices agree across client and server; unknown and legacy roles fail closed', () => {
  const expected = {
    EMPLOYEE: [true, false, false, false, false],
    ACCOUNTANT: [true, true, true, false, false],
    MANAGEMENT: [true, true, false, true, false],
    ADMIN: [true, true, true, true, true],
    SUPER_ADMIN: [true, true, true, true, true],
  }
  for (const role of ROLES) {
    const checks = [['attendance-own','write'], ['finance','read'], ['finance','write'], ['operations','write'], ['accounts','write']]
    checks.forEach(([resource, action], i) => {
      assert.equal(can({role}, resource, action), expected[role][i], role + ':' + resource + ':' + action)
      assert.equal(clientPolicy.can(role, resource, action), expected[role][i])
      assert.equal(can({role:role.toLowerCase()}, resource, action), expected[role][i])
    })
  }
  for (const role of ['staff', 'streamer', 'unknown', '', undefined]) assert.equal(can({role}, 'finance'), false)
  assert.equal(can({role:'SUPER_ADMIN'}, 'unknown'), false)
  assert.equal(normalizeRole('staff'), 'EMPLOYEE')
  assert.deepEqual(User.schema.path('role').enumValues, ROLES)
})

test('CanActivate redirects every forbidden page to own attendance', async () => {
  class Auth {}
  class Router {}
  let role = 'EMPLOYEE'
  const auth = { refreshPermissions:async()=>{}, landingPage:()=>'/attendance', loading: () => false, user: () => ({role}), can: resource => clientPolicy.can(role, resource) }
  const router = { parseUrl:path=>path, createUrlTree: paths => paths.join('/') }
  const guard = clientModule('role.guard.ts', {
    '@angular/core': { inject: token => token === Auth ? auth : router },
    '@angular/router': { Router }, './auth.service': { AuthService: Auth }, './permissions': clientPolicy,
  })
  const financial = ['', 'payroll', 'streamers', 'name-rates', 'recruiters', 'recruiting-list', 'management-payroll', 'it', 'settings', 'expenses', 'archive', 'game-tracker']
  for (role of ROLES) for (const path of [...financial, 'attendance', 'attendance-and-work', 'management', 'employee-accounts', 'unknown']) {
    const expected = clientPolicy.can(role, clientPolicy.pageResource(path)) || path==='attendance-and-work' && clientPolicy.can(role,'attendance-own')
    assert.equal(await guard.roleGuard({routeConfig:{path}}), expected ? true : '/attendance', role + ':' + path)
  }
  auth.user = () => null
  assert.equal(await guard.roleGuard({routeConfig:{path:'streamers'}}), '/login')
})

test('admins cannot assign or modify privileged roles, including password reset targets', () => {
  assert.deepEqual(assignableRoles({role:'ADMIN'}), ['EMPLOYEE','ACCOUNTANT','MANAGEMENT'])
  assert.deepEqual(assignableRoles({role:'SUPER_ADMIN'}), ROLES)
  for (const actor of ROLES) for (const targetRole of ROLES) {
    const allowed = actor === 'SUPER_ADMIN' || actor === 'ADMIN' && ['EMPLOYEE','ACCOUNTANT','MANAGEMENT'].includes(targetRole)
    assert.equal(canManageAccount({role:actor}, {role:targetRole}), allowed)
    if (allowed) {
      assert.equal(roleValue({role:actor}, targetRole), targetRole)
      assert.doesNotThrow(() => assertManageable({role:actor}, {role:targetRole}))
    } else {
      assert.throws(() => roleValue({role:actor}, targetRole), {status:403})
      assert.throws(() => assertManageable({role:actor}, {role:targetRole}), {status:403})
    }
  }
})

async function serverFor(t, names, actor) {
  process.env.JWT_SECRET = 'rbac-test-secret-only'
  t.mock.method(User, 'findById', () => ({select: async () => ({_id:id, ...actor()})}))
  const app = express()
  app.use(express.json())
  for (const name of names) app.use('/' + name, (await import('../src/routes/' + name + '.js')).default)
  app.use((error, req, res, next) => res.status(error.status || 500).json({message:error.message}))
  const server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  t.after(() => new Promise(resolve => server.close(resolve)))
  return (path, method = 'GET', body, authorized = true) => fetch('http://127.0.0.1:' + server.address().port + path, {
    method, headers: {'Content-Type':'application/json', ...(authorized ? {Authorization:'Bearer ' + jwt.sign({sub:id}, process.env.JWT_SECRET)} : {})},
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

test('HTTP every financial route rejects EMPLOYEE and every mutation rejects MANAGEMENT before database access', async t => {
  const names = ['streamers','settings','periods','recruiters','recruitingRecords','employees','payroll','companies','expenses','archive','gameTracker']
  let role = 'EMPLOYEE'
  const request = await serverFor(t, names, () => ({role}))
  let checked = 0
  for (const name of names) {
    const router = (await import('../src/routes/' + name + '.js')).default
    for (const layer of router.stack.filter(layer => layer.route)) {
      const path = '/' + name + layer.route.path.replace(/:[A-Za-z]+/g, id)
      for (const method of Object.keys(layer.route.methods)) {
        role = 'EMPLOYEE'
        assert.equal((await request(path, method.toUpperCase(), method === 'get' ? undefined : {})).status, 403, method + ' ' + path)
        if (method !== 'get') {
          role = 'MANAGEMENT'
          assert.equal((await request(path, method.toUpperCase(), {})).status, 403, 'MANAGEMENT ' + method + ' ' + path)
        }
        checked++
      }
    }
  }
  assert.ok(checked > 35)
  assert.equal((await request('/streamers', 'GET', undefined, false)).status, 401)
})

test('HTTP accountants/employees cannot reach all-attendance, operations, tasks or accounts', async t => {
  let role = 'ACCOUNTANT'
  const request = await serverFor(t, ['attendance','management','tasks','employeeAccounts'], () => ({role}))
  for (role of ['EMPLOYEE','ACCOUNTANT']) {
    for (const path of ['/attendance/dashboard','/attendance/employees','/management','/tasks','/employeeAccounts']) {
      assert.equal((await request(path)).status, 403, role + ':' + path)
    }
    assert.equal((await request('/attendance/' + targetId + '/correction','PATCH',{})).status, 403)
    assert.equal((await request('/employeeAccounts','POST',{role:'ADMIN'})).status, 403)
    assert.equal((await request('/attendance/history?employee=' + targetId)).status, 403)
  }
})

test('HTTP self attendance is scoped by authenticated identity, including manager own-history mode', async t => {
  let role = 'EMPLOYEE', observed
  const request = await serverFor(t, ['attendance'], () => ({role}))
  t.mock.method(Attendance, 'find', query => {
    observed = query
    return {sort(){return this}, skip(){return this}, limit(){return this}, populate:async()=>[]}
  })
  t.mock.method(Attendance, 'countDocuments', async()=>0)
  t.mock.method(Attendance, 'findOne', query => { observed=query; return {sort:async()=>null, populate:async()=>null} })
  for (role of ROLES) {
    assert.equal((await request('/attendance/today')).status, 200)
    assert.equal(String(observed.userId), id)
    assert.equal((await request('/attendance/history?scope=own')).status, 200)
    assert.equal(String(observed.userId), id)
  }
  role='EMPLOYEE'
  assert.equal((await request('/attendance/' + targetId)).status, 404)
  assert.equal(String(observed.userId), id)
  assert.equal((await request('/attendance/check-in','POST',{userId:targetId})).status, 400)
  assert.equal((await request('/attendance/check-out','POST',{userId:targetId})).status, 400)
})

test('HTTP archive never returns operations data to ACCOUNTANT', async t => {
  let role='ACCOUNTANT', operationsReads=0
  const request=await serverFor(t,['archive'],()=>({role}))
  t.mock.method(Period,'findOne',async()=>({_id:id,status:'closed'}))
  const chain = rows => ({select(){return this},lean(){return this},populate(){return this},sort(){return this},then(resolve,reject){return Promise.resolve(rows).then(resolve,reject)}})
  for(const model of [Company,StreamerPerformance,RecruitingRecord,RecruiterAdjustment,StaffRow,Expense,GameTrackerRecord]) t.mock.method(model,'find',()=>chain([]))
  for(const model of [Attendance,Problem]) t.mock.method(model,'find',()=>{operationsReads++;return chain([{safeTestRecord:true}])})
  let response=await request('/archive/'+id), data=await response.json()
  assert.equal(response.status,200);assert.deepEqual(data.attendance,[]);assert.deepEqual(data.problems,[]);assert.equal(operationsReads,0)
  for(role of ['MANAGEMENT','ADMIN','SUPER_ADMIN']) {
    response=await request('/archive/'+id);data=await response.json()
    assert.equal(response.status,200);assert.equal(data.attendance.length,1);assert.equal(data.problems.length,1)
  }
})

test('HTTP protected account targets and assignments return 403 without hashing or writing', async t => {
  let actorRole='ADMIN', targetRole='SUPER_ADMIN', writes=0
  const request=await serverFor(t,['employeeAccounts'],()=>({role:actorRole}))
  t.mock.method(User,'findById', key=>({select:async()=> key===id ? {_id:id,role:actorRole} : {_id:targetId,role:targetRole,status:'ACTIVE'}}))
  t.mock.method(User,'create',async fields=>{writes++;return {_id:targetId,...fields}})
  t.mock.method(User,'findOneAndUpdate',(filter,update)=>{
    writes++
    assert.ok(filter.role.$in.includes(targetRole))
    return {select:async()=>({_id:targetId,role:update.$set.role||targetRole,status:'ACTIVE'})}
  })
  for(targetRole of ['ADMIN','SUPER_ADMIN']) {
    for(const body of [{fullName:'Changed'},{email:'changed@example.test'},{role:'EMPLOYEE'},{status:'INACTIVE'}]) {
      assert.equal((await request('/employeeAccounts/'+targetId,'PATCH',body)).status,403)
    }
    assert.equal((await request('/employeeAccounts/'+targetId+'/reset-password','POST',{temporaryPassword:'test-only-password'})).status,403)
    assert.equal((await request('/employeeAccounts','POST',{role:targetRole})).status,403)
  }
  targetRole='EMPLOYEE'
  for(const role of ['ADMIN','SUPER_ADMIN']) assert.equal((await request('/employeeAccounts/'+targetId,'PATCH',{role})).status,403)
  assert.equal(writes,0)
  for(const role of ['EMPLOYEE','ACCOUNTANT','MANAGEMENT']) assert.equal((await request('/employeeAccounts/'+targetId,'PATCH',{role})).status,200)
  actorRole='SUPER_ADMIN'
  for(targetRole of ['ADMIN','SUPER_ADMIN']) {
    assert.equal((await request('/employeeAccounts/'+targetId,'PATCH',{fullName:'Allowed'})).status,200)
    assert.equal((await request('/employeeAccounts/'+targetId+'/reset-password','POST',{temporaryPassword:'test-only-password'})).status,200)
  }
  for(const role of ROLES) assert.equal((await request('/employeeAccounts','POST',{fullName:'Test',email:'test@example.test',role,temporaryPassword:'test-only-password'})).status,201)
})

test('HTTP ACCOUNTANT, ADMIN and SUPER_ADMIN can write financial settings and edit/delete Game Tracker; MANAGEMENT can read settings', async t => {
  let role='ACCOUNTANT', writes=0
  const request=await serverFor(t,['settings','gameTracker'],()=>({role}))
  const {default:Settings}=await import('../src/models/Settings.js')
  t.mock.method(Settings,'findById',async()=>({egpConversionRate:50,save:async()=>{writes++}}))
  t.mock.method(GameTrackerRecord,'findById',async()=>({_id:targetId,date:'2026-09-15',user:'Test',email:'test@example.test',product:'Game',costMinor:100,priceMinor:200,state:'Pending',website:'Store',paymentMethod:'Cash'}))
  t.mock.method(GameTrackerRecord,'adminUpdate',async(actor,key,fields)=>{assert.equal(can(actor,'finance','write'),true);writes++;return {_id:key,...fields}})
  t.mock.method(GameTrackerRecord,'adminDelete',async(actor,key)=>{assert.equal(can(actor,'finance','write'),true);writes++;return {_id:key}})
  for(role of ['ACCOUNTANT','ADMIN','SUPER_ADMIN']) {
    assert.equal((await request('/settings','PATCH',{egpConversionRate:51})).status,200)
    assert.equal((await request('/gameTracker/'+targetId,'PATCH',{product:'Changed'})).status,200)
    assert.equal((await request('/gameTracker/'+targetId,'DELETE')).status,200)
  }
  role='MANAGEMENT'
  assert.equal((await request('/settings')).status,200)
  assert.equal((await request('/settings','PATCH',{egpConversionRate:100})).status,403)
  assert.equal(writes,9)
})

test('HTTP legacy registration and streamer writes cannot bypass account administration', async t => {
  let role='ACCOUNTANT'
  const request=await serverFor(t,['auth','streamers'],()=>({role}))
  for(role of ['EMPLOYEE','ACCOUNTANT','MANAGEMENT']) {
    assert.equal((await request('/auth/register','POST',{name:'Test',email:'test@example.test',password:'test-only',role:'SUPER_ADMIN'})).status,403)
  }
  assert.equal((await request('/auth/register','POST',{},false)).status,401)
  role='ACCOUNTANT'
  assert.equal((await request('/streamers','POST',{name:'Test',writeAccess:true})).status,403)
})
