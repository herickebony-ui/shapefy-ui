import { useState } from 'react'
import { heicUrlToObjectUrl } from '../../utils/heicToJpeg'

// <img> com fallback de HEIC: se a imagem falhar ao carregar (navegador não
// decodifica HEIC), tenta baixar e converter pra JPEG no cliente e troca o src.
// Pega fotos antigas que ficaram em HEIC (inclusive com extensão enganosa .png).
// Obs: o fetch dos bytes precisa de mesma origem (CORS) — funciona no beta/prod
// servido junto, não no front em localhost apontando pro beta.
export default function HeicSafeImg({ src, onError, ...props }) {
  const [override, setOverride] = useState(null)
  const [tried, setTried] = useState(false)

  const handleError = async (e) => {
    if (!tried && src) {
      setTried(true)
      const obj = await heicUrlToObjectUrl(src)
      if (obj) { setOverride(obj); return }
    }
    onError?.(e)
  }

  return <img src={override || src} onError={handleError} {...props} />
}
