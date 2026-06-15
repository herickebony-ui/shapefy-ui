// Converte um File HEIC/HEIF para JPEG no navegador antes do upload.
// iPhone manda HEIC por padrão, e o <img> não renderiza HEIC fora do Safari —
// então convertemos pra JPEG no envio (o backend ainda tem rede de segurança).
// O heic2any (libheif/WASM ~1.5MB) é carregado sob demanda (dynamic import): só
// baixa quando o aluno realmente seleciona um HEIC. Outros formatos passam direto.

let _heic2any

const HEIC_BRANDS = ['heic', 'heix', 'mif1', 'msf1', 'hevc', 'hevx', 'heim', 'heis']

const ehHeicPorNome = (file) =>
  /heic|heif/i.test(file?.type || '') || /\.(heic|heif)$/i.test(file?.name || '')

// Detecta HEIC pelo CONTEÚDO (magic bytes: "ftyp" + brand HEIC nos bytes 4–12).
// Pega arquivos com extensão enganosa — ex: HEIC salvo como .png/.jpg (comum em
// fotos de iPhone e exportadas por outros apps).
async function ehHeicPorConteudo(file) {
  try {
    const buf = new Uint8Array(await file.slice(0, 12).arrayBuffer())
    if (buf.length < 12) return false
    const ftyp = String.fromCharCode(buf[4], buf[5], buf[6], buf[7])
    if (ftyp !== 'ftyp') return false
    const brand = String.fromCharCode(buf[8], buf[9], buf[10], buf[11])
    return HEIC_BRANDS.includes(brand)
  } catch {
    return false
  }
}

export async function toRenderableImage(file) {
  if (!file) return file
  const heic = ehHeicPorNome(file) || await ehHeicPorConteudo(file)
  if (!heic) return file
  try {
    if (!_heic2any) _heic2any = (await import('heic2any')).default
    const resultado = await _heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
    const blob = Array.isArray(resultado) ? resultado[0] : resultado
    const base = (file.name || 'foto').replace(/\.(heic|heif|png|jpe?g|webp)$/i, '')
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg' })
  } catch (e) {
    // Se a conversão falhar, sobe o original — o backend tenta converter (pillow_heif).
    console.warn('Falha ao converter HEIC no navegador; subindo original:', e)
    return file
  }
}

// Fallback de EXIBIÇÃO: baixa um HEIC já salvo e devolve um object URL JPEG, pra
// renderizar fotos antigas que ficaram em HEIC. Requer mesma origem (o fetch dos
// bytes sofre CORS quando o front roda em localhost contra o beta).
export async function heicUrlToObjectUrl(url) {
  if (!url) return null
  try {
    if (!_heic2any) _heic2any = (await import('heic2any')).default
    const resp = await fetch(url)
    const blob = await resp.blob()
    const jpeg = await _heic2any({ blob, toType: 'image/jpeg', quality: 0.9 })
    return URL.createObjectURL(Array.isArray(jpeg) ? jpeg[0] : jpeg)
  } catch (e) {
    console.warn('Falha ao decodificar HEIC no display:', e)
    return null
  }
}
