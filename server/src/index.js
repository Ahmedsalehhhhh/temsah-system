import managementRecords from './routes/managementRecords.js'
import conversations from './routes/conversations.js'
import reportRoutes from './routes/reports.js'
import helmet from 'helmet'
import {rateLimit} from 'express-rate-limit'
import taskRoutes from './routes/tasks.js'
import managementRoutes from './routes/management.js'
import followUpRoutes from './routes/followUps.js'
import attendanceRoutes from './routes/attendance.js'
import employeeAccountRoutes from './routes/employeeAccounts.js'
import Attendance from './models/Attendance.js'
import gameTrackerRoutes from './routes/gameTracker.js'
import './config/env.js'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import path from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { connectDB, connectionDiagnostic } from './config/db.js'
import { notFound, errorHandler } from './middleware/errorHandler.js'

import authRoutes from './routes/auth.js'
import settingsRoutes from './routes/settings.js'
import periodsRoutes from './routes/periods.js'
import streamersRoutes from './routes/streamers.js'
import recruitersRoutes from './routes/recruiters.js'
import recruitingRecordsRoutes from './routes/recruitingRecords.js'
import employeesRoutes from './routes/employees.js'
import payrollRoutes from './routes/payroll.js'

import companyRoutes from './routes/companies.js'
import expenseRoutes from './routes/expenses.js'
import archiveRoutes from './routes/archive.js'
import salaryRoutes from './routes/salaries.js'

import permissionRoutes from './routes/permissions.js'
import supportAssistantRoutes from './routes/supportAssistant.js'
import inventoryRoutes from './routes/inventory.js'
import { seedPermissions } from './lib/permissionStore.js'
const app = express()

app.disable('x-powered-by')
app.set('trust proxy', 1)
app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'"],imgSrc:["'self'","data:","blob:","https://res.cloudinary.com"],fontSrc:["'self'","data:"],connectSrc:["'self'"],frameSrc:["'self'",'blob:'],objectSrc:["'none'"],baseUri:["'self'"],frameAncestors:["'none'"]}}}))
app.use(cors({ origin: (process.env.CLIENT_ORIGIN||'http://localhost:4200').split(',').map(x=>x.trim()) }))
app.use('/api/auth/login',rateLimit({windowMs:15*60*1000,limit:30,standardHeaders:'draft-8',legacyHeaders:false,message:{message:'محاولات كثيرة؛ حاول بعد قليل'}}))
app.use('/api/game-tracker', gameTrackerRoutes)
app.use('/api/expenses', expenseRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/conversations',conversations)
app.use('/api/support-assistant', supportAssistantRoutes)
app.use(express.json({ limit: '3mb' }))
app.use('/api/companies', companyRoutes)
app.use(morgan('dev'))

app.get('/api/health', (req, res) => res.json({ ok: true }))

app.use('/api/reports',reportRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/permissions', permissionRoutes)
app.use('/api/management', managementRoutes)
app.use('/api/management-records', managementRecords)
app.use('/api/follow-ups', followUpRoutes)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/employee-accounts', employeeAccountRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/periods', periodsRoutes)
app.use('/api/streamers', streamersRoutes)
app.use('/api/recruiters', recruitersRoutes)
app.use('/api/recruiting-records', recruitingRecordsRoutes)
app.use('/api/employees', employeesRoutes)
app.use('/api/payroll', payrollRoutes)
app.use('/api/archive', archiveRoutes)
app.use('/api/salaries', salaryRoutes)
app.use('/api/inventory', inventoryRoutes)

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public')
if (existsSync(path.join(webRoot, 'index.html'))) {
  app.use(express.static(webRoot))
  app.get('*', (req, res, next) => req.path.startsWith('/api/') ? next() : res.sendFile(path.join(webRoot, 'index.html')))
}

app.use(notFound)
app.use(errorHandler)

const PORT = process.env.PORT || 3000

connectDB()
  .then(async () => {
    await seedPermissions()
// Keep production indexes aligned with the schema (including the two shifts/day index).
await Attendance.syncIndexes()
    app.listen(PORT, () => console.log(`Golden Streamers API running on port ${PORT}`))
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', connectionDiagnostic(err))
    process.exit(1)
  })
