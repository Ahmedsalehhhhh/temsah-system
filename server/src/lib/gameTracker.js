import { can } from './permissions.js'
export const trackerIdentities = ['saif', 'accountant1', 'accountant2', 'accountant3']
export const states = ['Pending', 'Completed', 'Cancelled', 'Refunded']
export const paymentMethods = ['Cash', 'Bank Transfer', 'Instapay', 'Vodafone Cash', 'Credit Card', 'Other']
const bad = message => Object.assign(new Error(message), { status: 400 })
export function trackerAccess(user) {
  return can(user, 'game-tracker', 'read')
}
export function trackerCreate(user) {
  return can(user, 'game-tracker', 'write')
}
export function requireTrackerAccess(req, res, next) {
  if (!trackerAccess(req.user)) return res.status(403).json({ message: 'غير مسموح بالدخول إلى Game Tracker' })
  next()
}
export function requireTrackerCreate(req, res, next) {
  if (!trackerCreate(req.user)) return res.status(403).json({ message: 'إضافة السجلات متاحة لـ Saif فقط' })
  next()
}
function text(value, label, max) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw bad('قيمة غير صالحة: ' + label)
  return value.trim()
}
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw bad('التاريخ غير صالح')
  return value
}
function money(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1000000000 || Math.abs(value * 100 - Math.round(value * 100)) > 0.0001) throw bad('المبلغ غير صالح؛ حد أقصى منزلتان عشريتان')
  return Math.round(value * 100)
}
export function photoInput(value) {
  if (value == null) return null
  const name = text(value.name, 'اسم الصورة', 200)
  const base64 = value.base64
  if (typeof base64 !== 'string' || base64.length > 4 * 1024 * 1024 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)) throw bad('الصورة غير صالحة أو أكبر من 3 MB')
  const data = Buffer.from(base64, 'base64')
  let mime
  if (data.length >= 33 && data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && data.subarray(12,16).toString() === 'IHDR' && data.subarray(-8,-4).toString() === 'IEND') mime = 'image/png'
  if (data.length >= 4 && data[0] === 255 && data[1] === 216 && data[2] === 255 && data[data.length-2] === 255 && data[data.length-1] === 217) mime = 'image/jpeg'
  if (!mime || data.length > 3 * 1024 * 1024) throw bad('يُسمح بصور PNG وJPG فقط، بحد أقصى 3 MB للصورة')
  return { name: name.replace(/[\x00-\x1f]/g, ''), mime, data }
}
export function trackerInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw bad('بيانات السجل غير صالحة')
  const allowed = ['date','user','email','product','cost','price','state','website','paymentMethod','photoForPayment','photoFromUs','purchaseProof','customerPaymentMethod','transferredToCompany']
  if (Object.keys(body).some(key => !allowed.includes(key))) throw bad('حقول غير مسموح بها')
  const email = text(body.email, 'Email', 254).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw bad('البريد الإلكتروني غير صالح')
  if (!states.includes(body.state) || !paymentMethods.includes(body.paymentMethod)) throw bad('حالة أو طريقة دفع غير صالحة')
  if (body.customerPaymentMethod != null && !paymentMethods.includes(body.customerPaymentMethod)) throw bad('طريقة دفع العميل غير صالحة')
  if (body.transferredToCompany !== undefined && typeof body.transferredToCompany !== 'boolean') throw bad('تأكيد التحويل غير صالح')
  return { purchaseProof: photoInput(body.purchaseProof), customerPaymentMethod: body.customerPaymentMethod || null, transferredToCompany: body.transferredToCompany ?? false, date: validDate(body.date), user: text(body.user,'User',120), email, product: text(body.product,'Product',200), costMinor: money(body.cost), priceMinor: money(body.price), state: body.state, website: text(body.website,'Website',500), paymentMethod: body.paymentMethod, photoForPayment: photoInput(body.photoForPayment), photoFromUs: photoInput(body.photoFromUs) }
}
export function trackerQuery(query) {
  const integer = (value, fallback, max) => {
    if (value === undefined) return fallback
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || Number(value) > max) throw bad('رقم صفحة أو حجم صفحة غير صالح')
    return Number(value)
  }
  const page = integer(query.page,1,1000000), limit = integer(query.limit,20,100)
  const filter = {}
  if (query.search !== undefined && query.search !== '') {
    const search = text(query.search,'Search',200).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')
    filter.$or = ['user','email','product'].map(key => ({ [key]: { $regex: search, $options: 'i' } }))
  }
  if (query.date) filter.date = validDate(query.date)
  for (const [key,values] of [['state',states],['paymentMethod',paymentMethods]]) {
    if (query[key]) { if (!values.includes(query[key])) throw bad('فلتر غير صالح'); filter[key] = query[key] }
  }
  return { filter, page, limit }
}
export function trackerView(row) {
  const photo = value => value?.mime ? { name: value.name, mime: value.mime } : null
  return { purchaseProof: photo(row.purchaseProof), customerPaymentMethod: row.customerPaymentMethod || null, transferredToCompany: row.transferredToCompany ?? false, id: String(row._id), date: row.date, user: row.user, email: row.email, product: row.product, cost: row.costMinor/100, price: row.priceMinor/100, state: row.state, website: row.website, paymentMethod: row.paymentMethod, photoForPayment: photo(row.photoForPayment), photoFromUs: photo(row.photoFromUs), created_at: row.created_at }
}
