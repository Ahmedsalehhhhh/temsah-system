import { can, isAdminOrAbove } from './permissions.js'
export const canViewAll=(user,page)=>isAdminOrAbove(user?.role)||(can(user,page==='follow-ups'?'management':page)&&can(user,page+'-all'))
export const ownScope=(user,page,field='userId',write=false)=>(write?isAdminOrAbove(user?.role):canViewAll(user,page))?{}:{[field]:user._id}
export const taskScope=(user,write=false)=>(write?isAdminOrAbove(user?.role):canViewAll(user,'tasks'))?{}:{$or:[{userId:user._id},{assignedTo:user._id}]}
export const companyScope=user=>isAdminOrAbove(user?.role)?{}:{expenseReaders:user._id}
