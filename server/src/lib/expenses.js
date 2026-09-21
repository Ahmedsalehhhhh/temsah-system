const bad = message => Object.assign(new Error(message), { status: 400 })
export function validId(value) {
  if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value)) throw bad('معرّف الشركة أو الفترة أو المصروف غير صالح')
  return value
}
export function companyName(value) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 120) throw bad('اسم الشركة مطلوب وبحد أقصى 120 حرف')
  const name = value.trim().replace(/\s+/g, ' ')
  return { name, nameKey: name.normalize('NFKC').toLowerCase() }
}
export function expenseInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw bad('بيانات المصروف غير صالحة')
  if (typeof body.amount !== 'number' || !Number.isFinite(body.amount) || body.amount <= 0 || body.amount > 1000000000 ||
      Math.abs(body.amount * 100 - Math.round(body.amount * 100)) > 0.0001) throw bad('المبلغ يجب أن يكون أكبر من صفر وبحد أقصى منزلتين عشريتين')
  if (typeof body.description !== 'string' || !body.description.trim() || body.description.trim().length > 1000) throw bad('البيان مطلوب وبحد أقصى 1000 حرف')
  if (typeof body.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.date) ||
      Number.isNaN(Date.parse(body.date)) || new Date(body.date).toISOString().slice(0, 10) !== body.date) throw bad('تاريخ المصروف غير صالح')
  const result = { amountMinor: Math.round(body.amount * 100), description: body.description.trim(), date: body.date }
  if (Object.hasOwn(body, 'receipt')) {
    if (body.receipt === null) result.receipt = null
    else {
      const { name, base64 } = body.receipt || {}
      if (typeof name !== 'string' || !name.trim() || name.length > 200 ||
          typeof base64 !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64) || base64.length % 4) throw bad('ملف الإيصال غير صالح')
      if (base64.length > 4 * 1024 * 1024) throw bad('حجم الإيصال لا يتجاوز 3 MB')
      const data = Buffer.from(base64, 'base64')
      let mime
      if (data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) mime = 'image/png'
      else if (data[0] === 255 && data[1] === 216 && data[2] === 255) mime = 'image/jpeg'
      else if (data.subarray(0,5).toString() === '%PDF-') mime = 'application/pdf'
      if (!mime || !data.length || data.length > 3 * 1024 * 1024) throw bad('الإيصال يجب أن يكون JPG أو PNG أو PDF بحجم لا يتجاوز 3 MB')
      result.receipt = { name: name.replace(/[\x00-\x1f]/g, ''), mime, data }
    }
  }
  return result
}
export function expenseView(doc) {
  return { id: String(doc._id), companyId: String(doc.company), periodId: String(doc.period),
    amount: doc.amountMinor / 100, description: doc.description, date: doc.date,
    receipt: doc.receipt?.mime ? { name: doc.receipt.name, mime: doc.receipt.mime } : null }
}
