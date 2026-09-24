import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import vm from 'node:vm'
const ts=createRequire(new URL('../../client/package.json',import.meta.url))('typescript')
const angular={Component:()=>target=>target,Injectable:()=>target=>target,ViewChild:()=>()=>{},Input:()=>()=>{},HostListener:()=>()=>{},signal(value){const fn=()=>value;fn.set=v=>value=v;fn.update=f=>value=f(value);return fn}}
function load(file,extra={}){
  const exports={}
  const code=ts.transpileModule(readFileSync(new URL('../../client/src/app/'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText
  vm.runInNewContext(code,{exports,performance,Date,setInterval,clearInterval,confirm:()=>true,require:name=>extra[name] || (name==='@angular/core'?angular:name.endsWith('confirm-dialog')?{confirmAction:async()=>true}:name==='rxjs'?{firstValueFrom:x=>x}:name.endsWith('environment')?{environment:{apiUrl:'/api'}}:{})})
  return exports
}

test('task component submits the selected assignee; personal and VIEW_ONLY modes cannot save or delete',async()=>{
  const {TasksComponent}=load('pages/attendance/tasks.component.ts')
  let writable=true,calls=[]
  const auth={can:()=>writable},http={post:async(url,body)=>calls.push({url,body}),delete:async url=>calls.push({url}),get:async()=>({rows:[],total:0})}
  const component=new TasksComponent(auth,http)
  component.form={text:'Finish report',status:'Pending',assignedTo:'employee-id'}
  await component.save()
  assert.equal(calls.length,1);assert.equal(calls[0].body.assignedTo,'employee-id')
  for(const mine of [false,true]){
    component.mine=mine;writable=mine
    component.form={text:'Blocked change',status:'Pending',assignedTo:'employee-id'}
    await component.save();await component.remove({_id:'task-id'})
    assert.equal(component.owns({}),false);assert.equal(calls.length,1)
  }
})

test('checkout unlocks for a fresh draft or an already-saved daily report',async()=>{
  const {AttendanceComponent}=load('pages/attendance/attendance.component.ts',{'./tasks.component':{TasksComponent:class{}}})
  const calls=[],http={post:async(url,body)=>calls.push({url,body})}
  const component=new AttendanceComponent({snapshot:{data:{}}},{can:()=>true},http,{currentPeriodId:()=>null})
  component.load=async()=>{}
  await component.action('check-out');assert.equal(calls.length,0)
  component.update={text:'Earlier note',status:'Completed'}
  await component.action('updates');assert.equal(calls.length,1)
  component.today.set({updates:[{text:'Earlier note'}]})
  await component.action('check-out');assert.equal(calls.length,2,'an earlier submitted update unlocks checkout')
  assert.equal(calls[1].url,'/api/attendance/check-out');assert.equal(Object.keys(calls[1].body).length,0)
  component.update={text:'Last thing before leaving',status:'In Progress'}
  await component.action('check-out')
  assert.equal(calls.length,3);assert.equal(calls[2].url,'/api/attendance/check-out')
  assert.equal(calls[2].body.text,'Last thing before leaving');assert.equal(calls[2].body.status,'In Progress')
  assert.equal(component.update.text,'')
})

test('attendance details can always be closed while a mobile request is loading',()=>{
  const {AttendanceComponent}=load('pages/attendance/attendance.component.ts')
  const component=new AttendanceComponent({snapshot:{data:{}}},{can:()=>true},{},{currentPeriodId:()=>null})
  component.detail.set({id:'attendance-id'});component.detailLoading=true;component.correcting=true;component.dialogError='old error'
  component.closeDetail()
  assert.equal(component.detail(),null)
  assert.equal(component.detailLoading,false)
  assert.equal(component.correcting,false)
  assert.equal(component.dialogError,'')
})

test('support chat keeps mobile input readable without browser auto zoom',()=>{
  const css=readFileSync(new URL('../../client/src/app/components/support-assistant/support-assistant.component.css',import.meta.url),'utf8')
  const html=readFileSync(new URL('../../client/src/index.html',import.meta.url),'utf8')
  assert.match(css,/support-compose textarea\{[^}]*font-size:16px/)
  assert.match(css,/@media\(max-width:640px\)[\s\S]*support-compose textarea\{font-size:16px\}/)
  assert.match(html,/viewport-fit=cover/)
  assert.doesNotMatch(html,/maximum-scale|user-scalable=no/)
})
