import { isAdminOrAbove } from './lib/permissions.js'
import {getDefaultAdminCredentials} from './config/env.js'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import User from './models/User.js'
import {connectDB,connectionDiagnostic} from './config/db.js'
import {passwordValue} from './lib/attendance.js'
try{
 const {email,password:configuredPassword}=getDefaultAdminCredentials()
 const password=passwordValue(configuredPassword)
 await connectDB();await User.init()
 const existing=await User.findOne({email})
 if(existing){if(!isAdminOrAbove(existing.role))throw new Error('Existing account is not admin; refusing automatic promotion');console.log('SKIPPED: existing admin and password preserved')}
 else {await User.create({name:process.env.ATTENDANCE_ADMIN_NAME||'Admin',fullName:process.env.ATTENDANCE_ADMIN_NAME||'Admin',email,passwordHash:await bcrypt.hash(password,12),role:'ADMIN',status:'ACTIVE'});console.log('CREATED attendance admin')}
}catch(e){console.error('Admin setup failed',e.code?connectionDiagnostic(e):e.message);process.exitCode=1}finally{await mongoose.disconnect()}
