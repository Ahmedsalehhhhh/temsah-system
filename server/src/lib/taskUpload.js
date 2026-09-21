import {createHash} from 'node:crypto'
import {photoInput} from './gameTracker.js'
export async function uploadTaskImage(input) {
  const photo=photoInput(input)
  if(!photo)return null
  const {CLOUDINARY_CLOUD_NAME:cloud,CLOUDINARY_API_KEY:key,CLOUDINARY_API_SECRET:secret}=process.env
  if(!cloud||!key||!secret)throw Object.assign(new Error('رفع الصور يحتاج إعدادات Cloudinary على السيرفر'),{status:503})
  const timestamp=String(Math.floor(Date.now()/1000)),folder='golden-streamers/tasks'
  const signature=createHash('sha1').update(`folder=${folder}&timestamp=${timestamp}${secret}`).digest('hex')
  const body=new FormData()
  for(const [k,v] of Object.entries({timestamp,folder,signature,api_key:key}))body.append(k,v)
  body.append('file',new Blob([photo.data],{type:photo.mime}),photo.name)
  let response
  try {response=await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/image/upload`,{method:'POST',body,signal:AbortSignal.timeout(30000)})}
  catch {throw Object.assign(new Error('تعذر رفع الصورة؛ حاول مرة أخرى'),{status:502})}
  if(!response.ok)throw Object.assign(new Error('تعذر رفع الصورة إلى Cloudinary'),{status:502})
  const result=await response.json()
  if(!result.secure_url?.startsWith('https://res.cloudinary.com/')||!result.public_id)throw Object.assign(new Error('استجابة رفع غير صالحة'),{status:502})
  return {url:result.secure_url,publicId:result.public_id}
}
