/**
 * Payment proofs are stored as a Base64 data URL directly on the Firestore sale
 * document, which has a hard 1 MB limit. Phone photos are routinely several MB,
 * so we downscale + JPEG-compress before storing, and step the quality down
 * until the result comfortably fits (leaving room for the rest of the sale).
 */

const MAX_PROOF_BYTES = 700 * 1024 // stay well under Firestore's 1 MB doc cap

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('read failed'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('decode failed'))
    img.src = src
  })
}

/** Approximate decoded byte size of a data URL's base64 payload. */
export function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',')
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
  return Math.floor((b64.length * 3) / 4)
}

/**
 * Turns a captured/selected image File into a compressed JPEG data URL small
 * enough to store on a Firestore doc. Downscales to `maxDim`, then reduces
 * quality (and finally dimensions) if still too large.
 */
export async function compressToProof(file: File, maxDim = 1100): Promise<string> {
  const original = await readAsDataUrl(file)
  const img = await loadImage(original)

  const render = (dim: number, quality: number): string => {
    let { width, height } = img
    if (width > dim || height > dim) {
      const scale = dim / Math.max(width, height)
      width = Math.round(width * scale)
      height = Math.round(height * scale)
    }
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return original
    ctx.fillStyle = '#fff' // flatten any transparency for JPEG
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(img, 0, 0, width, height)
    return canvas.toDataURL('image/jpeg', quality)
  }

  // Try progressively smaller/lower-quality renders until it fits.
  for (const [dim, q] of [[maxDim, 0.6], [maxDim, 0.45], [900, 0.4], [700, 0.4]] as const) {
    const out = render(dim, q)
    if (dataUrlBytes(out) <= MAX_PROOF_BYTES) return out
  }
  // Last resort — smallest we attempt; caller may still reject if oversized.
  return render(600, 0.35)
}
