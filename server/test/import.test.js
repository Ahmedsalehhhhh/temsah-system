import test from 'node:test'
import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import { previewWorkbook, validateNames, cellText } from '../src/lib/streamerImport.js'
test('XLSX preview finds offset headers, Arabic names, multiple sheets and skips formulas', async () => {
  const w = new ExcelJS.Workbook()
  const s = w.addWorksheet('Streamers')
  s.getCell('A1').value='Team'
  s.getCell('A14').value='Name'
  s.getCell('B14').value='Score'
  s.getCell('A15').value='  أحمد  '
  s.getCell('B15').value=150000
  s.getCell('A16').value={formula:'1+1',result:2}
  s.getCell('A17').value='أحمد'
  const other = w.addWorksheet('بدون عنوان')
  other.getCell('B1').value='سارة'
  const p = await previewWorkbook(Buffer.from(await w.xlsx.writeBuffer()))
  assert.equal(p.sheets[0].startRow,15)
  assert.equal(p.sheets[0].nameColumn,0)
  assert.equal(p.sheets[0].rows.find(r=>r.number===15).values[0],'أحمد')
  assert.equal(p.sheets[0].rows.some(r=>r.number===16),false)
  assert.equal(p.sheets[1].startRow,1)
  assert.equal(cellText({richText:[{text:'أح'},{text:'مد'}]}),'أحمد')
})
test('invalid files and empty workbooks are rejected', async () => {
  await assert.rejects(previewWorkbook(Buffer.from('not excel')), {status:400})
  const w = new ExcelJS.Workbook(); w.addWorksheet('Empty')
  await assert.rejects(previewWorkbook(Buffer.from(await w.xlsx.writeBuffer())),{status:400})
})
test('names are validated before database writes and repeats collapse', () => {
  assert.deepEqual(validateNames([' أحمد ','أحمد','سارة']),{names:['أحمد','سارة'],duplicates:1})
  for (const input of [[],null,[{}],[''],['a\nname'],['a'.repeat(201)],Array(10001).fill('a')])
    assert.throws(()=>validateNames(input),{status:400})
})
