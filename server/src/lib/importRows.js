export function validateImportRows(rows){
 const fail=m=>{throw Object.assign(new Error(m),{status:400})}
 if(!Array.isArray(rows)||!rows.length||rows.length>10000)fail('اختر من 1 إلى 10000 صف')
 const seen=new Set();let duplicates=0
 const result=[]
 for(const [index,row] of rows.entries()){
  if(!row||typeof row.name!=='string'||!row.name.trim()||row.name.trim().length>200)fail('اسم غير صالح في الصف '+(index+1))
  const name=row.name.trim();if(seen.has(name)){duplicates++;continue}seen.add(name)
  const item={name}
  for(const key of ['score','days','hours','rate','bonus','deduction']){
   if(row[key]===undefined||row[key]===null||row[key]==='')continue
   const n=Number(String(row[key]).replace(/,/g,''));if(!Number.isFinite(n)||n<0||n>1e12)fail('قيمة '+key+' غير صالحة للاسم '+name)
   item[key]=n
  }
  for(const key of ['bonusReason','deductionReason'])if(row[key]!==undefined&&row[key]!==''){if(typeof row[key]!=='string'||row[key].length>2000)fail('ملاحظات غير صالحة');item[key]=row[key]}
  if(row.status){if(!['active','inactive','suspended'].includes(row.status))fail('حالة غير صالحة للاسم '+name);item.status=row.status}
  result.push(item)
 }
 return {rows:result,duplicates}
}
