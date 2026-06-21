import { useState, useEffect, useRef } from 'react'
import client from '../api/client'

export default function useAuthSrc(url) {
  const [resolved, setResolved] = useState(null)
  const urlRef = useRef(null)

  useEffect(() => {
    if (!url) { setResolved(null); return }

    if (!url.includes('frappe_s3_attachment.controller.generate_file')) {
      setResolved(url)
      return
    }

    urlRef.current = url
    const separator = url.includes('?') ? '&' : '?'

    client.get(`${url}${separator}json=1`)
      .then(res => {
        if (urlRef.current !== url) return
        setResolved(res.data?.message?.url || res.data?.url || null)
      })
      .catch(() => {
        if (urlRef.current === url) setResolved(null)
      })
  }, [url])

  return resolved
}
