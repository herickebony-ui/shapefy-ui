import { useEffect, useState, useCallback, useRef } from 'react'
import { obterStatusAluno } from '../api/contratosAluno'

const TTL_MS = 60_000
const cache = new Map()

const inflight = new Map()

const fetchOnce = (alunoId) => {
  if (inflight.has(alunoId)) return inflight.get(alunoId)
  const p = obterStatusAluno(alunoId)
    .then((res) => {
      cache.set(alunoId, { data: res, ts: Date.now() })
      return res
    })
    .finally(() => inflight.delete(alunoId))
  inflight.set(alunoId, p)
  return p
}

export const invalidateStatusCache = (alunoId) => {
  if (alunoId) cache.delete(alunoId)
  else cache.clear()
}

export default function useStatusAluno(alunoId) {
  const [state, setState] = useState(() => {
    if (!alunoId) return { data: null, loading: false }
    const cached = cache.get(alunoId)
    if (cached && Date.now() - cached.ts < TTL_MS) {
      return { data: cached.data, loading: false }
    }
    return { data: null, loading: true }
  })
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const load = useCallback(async () => {
    if (!alunoId) return
    const cached = cache.get(alunoId)
    if (cached && Date.now() - cached.ts < TTL_MS) {
      setState({ data: cached.data, loading: false })
      return
    }
    setState((s) => ({ ...s, loading: true }))
    try {
      const data = await fetchOnce(alunoId)
      if (mounted.current) setState({ data, loading: false })
    } catch {
      if (mounted.current) setState({ data: null, loading: false })
    }
  }, [alunoId])

  useEffect(() => { load() }, [load])

  return { ...state, reload: load }
}
