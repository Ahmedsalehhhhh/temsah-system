import Period from '../models/Period.js'

export async function assertPeriodOpen(periodId) {
  const period = await Period.findById(periodId)
  if (!period) {
    const err = new Error('فترة الرواتب غير موجودة')
    err.status = 404
    throw err
  }
  if (period.status === 'closed') {
    const err = new Error('فترة الرواتب دي مقفولة — مينفعش تتعدل')
    err.status = 409
    throw err
  }
  return period
}
