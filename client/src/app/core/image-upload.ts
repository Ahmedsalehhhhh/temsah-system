export type PreparedImage = { name: string; base64: string; dataUrl: string }

const MAX_SOURCE_BYTES = 20 * 1024 * 1024
const TARGET_BYTES = 2_400_000
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

const readDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result || ''))
  reader.onerror = () => reject(reader.error)
  reader.readAsDataURL(file)
})

const loadImage = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image()
  image.onload = () => resolve(image)
  image.onerror = () => reject(new Error('تعذر قراءة الصورة'))
  image.src = url
})

const canvasDataUrl = (image: HTMLImageElement, maxDimension: number, quality: number) => {
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('تعذر تجهيز الصورة')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', quality)
}

const dataBytes = (dataUrl: string) => Math.ceil((dataUrl.split(',')[1]?.length || 0) * 3 / 4)

export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!ALLOWED_TYPES.has(file.type) || !file.size) throw new Error('اختر صورة PNG أو JPG أو WEBP')
  if (file.size > MAX_SOURCE_BYTES) throw new Error('حجم الصورة كبير جدًا؛ الحد الأقصى قبل الضغط 20 MB')
  const original = await readDataUrl(file)
  if (file.size <= TARGET_BYTES && file.type !== 'image/webp') {
    return { name: file.name, base64: original.split(',')[1], dataUrl: original }
  }
  const image = await loadImage(original)
  let result = ''
  for (const dimension of [2400, 2000, 1600, 1280, 1024]) {
    for (const quality of [0.86, 0.76, 0.66, 0.56]) {
      result = canvasDataUrl(image, dimension, quality)
      if (dataBytes(result) <= TARGET_BYTES) {
        const cleanName = file.name.replace(/\.[^.]+$/, '') || 'image'
        return { name: cleanName + '.jpg', base64: result.split(',')[1], dataUrl: result }
      }
    }
  }
  throw new Error('تعذر ضغط الصورة للحجم المناسب؛ اختر صورة أصغر')
}
