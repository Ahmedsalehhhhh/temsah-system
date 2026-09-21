import ExcelJS from 'exceljs'

const fail = (message) => Object.assign(new Error(message), { status: 400 })
const headers = new Set(['name', 'username', 'user name', 'streamer', 'streamer name', 'اسم', 'الاسم', 'اسم الستريمر', 'اسم الاستريمر', 'اسم المستخدم'])

// Import literal cell values only: never execute formulas, links, or workbook instructions.
export function cellText(value) {
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim()
  if (value?.richText) return value.richText.map((part) => part.text).join('').trim()
  if (value?.hyperlink && typeof value.text === 'string') return value.text.trim()
  return ''
}

export async function previewWorkbook(buffer) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw fail('اختار ملف Excel بصيغة .xlsx')
  const workbook = new ExcelJS.Workbook()
  try { await workbook.xlsx.load(buffer) } catch { throw fail('ملف Excel غير صالح أو محمي بكلمة مرور') }
  if (workbook.worksheets.length > 30) throw fail('الملف يحتوي على أكثر من 30 ورقة؛ ارفع ورقة الأسماء فقط')
  let cells = 0
  const sheets = workbook.worksheets.map((sheet) => {
    if (sheet.actualRowCount > 20000 || sheet.columnCount > 200) throw fail('ارفع شيت أسماء لا يتجاوز 20000 صف و200 عمود')
    const rows = []
    sheet.eachRow((row, number) => {
      const values = []
      row.eachCell((cell, column) => {
        if (++cells > 500000) throw fail('الملف كبير؛ ارفع ورقة الأسماء فقط')
        const text = cellText(cell.value)
        if (text) values[column - 1] = text.slice(0, 500)
      })
      if (values.some(Boolean)) rows.push({ number, values: Array.from(values, (v) => v || '') })
    })
    let nameColumn = 0
    let startRow = rows[0]?.number || 1
    for (const row of rows.slice(0, 30)) {
      const index = row.values.findIndex((v) => headers.has(v.toLowerCase()))
      if (index >= 0) { nameColumn = index; startRow = row.number + 1; break }
    }
    return { name: sheet.name, rows, nameColumn, startRow }
  }).filter((sheet) => sheet.rows.length)
  if (!sheets.length) throw fail('الملف فارغ')
  return { sheets }
}

export function validateNames(names) {
  if (!Array.isArray(names) || !names.length || names.length > 10000) throw fail('اختار من 1 إلى 10000 اسم للاستيراد')
  const unique = new Set()
  for (const value of names) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > 200 || /[\x00-\x1f]/.test(value)) {
      throw fail('كل اسم لازم يكون نص من 1 إلى 200 حرف بدون أسطر جديدة')
    }
    unique.add(value.trim())
  }
  return { names: [...unique], duplicates: names.length - unique.size }
}
