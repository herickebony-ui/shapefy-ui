// Reduz a imagem no cliente ANTES do upload — só quando é genuinamente gigante.
// Motivo: fotos de iPhone (AirDrop / HEIC, 4000px+, vários MB) travam/fecham o
// app do aluno (o webview estoura memória ao processar/subir o arquivo).
//
// Filosofia: mexer o MÍNIMO possível na qualidade.
//   - Foto ≤ 2 MB             → passa INTACTA.
//   - Lado maior ≤ 3000px     → passa INTACTA (mesmo que pese alguns MB).
//   - Só quando é grande E tem dimensão enorme → reduz pro lado maior = 3000px,
//     JPEG qualidade 0.92 (visualmente idêntico pra comparação, mas o arquivo
//     despenca e o app para de travar). Ex: 12 MB / 4032px → ~2 MB / 3000px.
//   - Se o resultado não ficar menor que o original, mantém o original.
//   - Qualquer erro (ex: HEIC que o browser não decodifica): devolve o original
//     — nunca bloqueia o aluno.
const MAX_SIDE = 3000
const QUALITY = 0.92
const SKIP_BYTES = 2 * 1024 * 1024

export async function compressImageIfLarge(file) {
  try {
    if (!file || !file.type?.startsWith('image/')) return file
    if (file.size <= SKIP_BYTES) return file

    const bitmap = await createImageBitmap(file).catch(() => null)
    if (!bitmap) return file

    const maior = Math.max(bitmap.width, bitmap.height)
    if (maior <= MAX_SIDE) {
      bitmap.close?.()
      return file
    }

    const escala = MAX_SIDE / maior
    const w = Math.round(bitmap.width * escala)
    const h = Math.round(bitmap.height * escala)

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()

    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', QUALITY))
    if (!blob || blob.size >= file.size) return file

    const nome = (file.name || 'foto').replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], nome, { type: 'image/jpeg' })
  } catch {
    return file
  }
}
