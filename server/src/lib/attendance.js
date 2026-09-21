import { normalizeRole } from './permissions.js'
import '../config/env.js'
export const attendanceTimezone = process.env.ATTENDANCE_TIMEZONE || 'Africa/Cairo'
// Validate configuration at startup rather than silently changing the work day.
const formatter = new Intl.DateTimeFormat('en-CA',{timeZone:attendanceTimezone,year:'numeric',month:'2-digit',day:'2-digit'})
export function workDate(now=new Date()) { const p=Object.fromEntries(formatter.formatToParts(now).map(x=>[x.type,x.value]));return p.year+'-'+p.month+'-'+p.day }
export const fail=(status,message)=>Object.assign(new Error(message),{status})
export function fields(body,allowed){if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!allowed.includes(k)))throw fail(400,'حقول غير مسموح بها');return body}
export function text(value,max=200){if(typeof value!=='string'||!value.trim()||value.trim().length>max)throw fail(400,'قيمة غير صالحة');return value.trim()}
export function dateValue(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number.isNaN(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)throw fail(400,'تاريخ غير صالح');return value}
export function objectId(value){if(typeof value!=='string'||!/^[a-f\d]{24}$/i.test(value))throw fail(400,'معرّف غير صالح');return value}
export function passwordValue(value){if(typeof value!=='string'||value.length<12||Buffer.byteLength(value)>72)throw fail(400,'كلمة المرور: 12 حرفًا على الأقل و72 بايت بحد أقصى');return value}
export function accountView(u){return {id:String(u._id),fullName:u.fullName||u.name,email:u.email,role:normalizeRole(u.role),status:u.status||'ACTIVE',createdAt:u.createdAt}}
export function attendanceView(row,now=new Date()){
 if(!row)return null
 return {id:String(row._id),userId:String(row.userId),date:row.workDate,checkIn:row.checkIn,checkOut:row.checkOut||null,status:row.checkOut?'Finished':'Working',workedSeconds:Math.max(0,Math.floor(((row.checkOut||now)-row.checkIn)/1000)),workUpdates:row.updates?.length||0,revision:row.__v||0}
}
export function timestamp(value){if(typeof value!=='string'||!/(Z|[+-]\d{2}:\d{2})$/.test(value)||!Number.isFinite(Date.parse(value)))throw fail(400,'استخدم وقتًا مع منطقة زمنية');return new Date(value)}

export function dayBounds(date){
 dateValue(date)
 // Find the first instant of each local calendar date, including DST gaps/repeats.
 const boundary=day=>{const center=Date.parse(day+'T00:00:00Z');let low=center-36*3600000,high=center+36*3600000;while(low<high){const mid=Math.floor((low+high)/2);if(workDate(new Date(mid))<day)low=mid+1;else high=mid}return new Date(low)}
 const next=new Date(Date.parse(date+'T00:00:00Z')+86400000).toISOString().slice(0,10)
 return {start:boundary(date),end:boundary(next)}
}
