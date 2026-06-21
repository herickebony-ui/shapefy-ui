import { useState } from 'react'
import { heicUrlToObjectUrl } from '../../utils/heicToJpeg'
import useAuthSrc from '../../hooks/useAuthSrc'

export default function HeicSafeImg({ src, onError, ...props }) {
  const authSrc = useAuthSrc(src)
  const [override, setOverride] = useState(null)
  const [tried, setTried] = useState(false)

  const handleError = async (e) => {
    if (!tried && authSrc) {
      setTried(true)
      const obj = await heicUrlToObjectUrl(authSrc)
      if (obj) { setOverride(obj); return }
    }
    onError?.(e)
  }

  return <img src={override || authSrc} onError={handleError} {...props} />
}
