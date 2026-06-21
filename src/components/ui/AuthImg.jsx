import useAuthSrc from '../../hooks/useAuthSrc'

export default function AuthImg({ src, ...props }) {
  const resolved = useAuthSrc(src)
  if (!resolved) return null
  return <img src={resolved} {...props} />
}
