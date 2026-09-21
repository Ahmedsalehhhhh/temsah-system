export function notFound(req, res) {
  res.status(404).json({ message: 'المسار غير موجود' })
}

export function errorHandler(err, req, res, next) {
  console.error('Request failed',err.name||'Error',err.code||'',err.status||500)
  if (err.code === 11000) {
    return res.status(409).json({ message: 'القيمة دي مستخدمة قبل كده (تكرار)' })
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message })
  }
  if(err.name==='CastError')return res.status(400).json({message:'معرّف غير صالح'});res.status(err.status || 500).json({ message: err.status&&err.status<500?err.message:'تعذر إتمام الطلب؛ حاول مرة أخرى' })
}
