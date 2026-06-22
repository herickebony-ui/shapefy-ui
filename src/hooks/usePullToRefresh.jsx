import { useState, useRef, useCallback, useEffect } from 'react'

const THRESHOLD = 45
const MAX_PULL = 100

export default function usePullToRefresh(onRefresh) {
  const [refreshing, setRefreshing] = useState(false)
  const indicatorRef = useRef(null)
  const arrowRef = useRef(null)
  const startY = useRef(0)
  const pullY = useRef(0)
  const active = useRef(false)
  const refreshingRef = useRef(false)

  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    html.style.overscrollBehaviorY = 'none'
    body.style.overscrollBehaviorY = 'none'
    return () => {
      html.style.overscrollBehaviorY = ''
      body.style.overscrollBehaviorY = ''
    }
  }, [])

  const updateVisual = useCallback((py) => {
    const el = indicatorRef.current
    const arrow = arrowRef.current
    if (!el || !arrow) return
    const h = py * 0.7
    el.style.height = `${h}px`
    el.style.opacity = Math.min(py / THRESHOLD, 1)
    const rot = Math.min(py / THRESHOLD, 1) * 180
    arrow.style.transform = `rotate(${rot}deg)`
  }, [])

  useEffect(() => {
    const onTouchStart = (e) => {
      if (refreshingRef.current || window.scrollY > 0) return
      startY.current = e.touches[0].clientY
      pullY.current = 0
      active.current = true
    }

    const onTouchMove = (e) => {
      if (!active.current || refreshingRef.current) return
      const dy = e.touches[0].clientY - startY.current
      if (dy < 0) { active.current = false; updateVisual(0); return }
      e.preventDefault()
      pullY.current = Math.min(dy * 0.6, MAX_PULL)
      updateVisual(pullY.current)
    }

    const onTouchEnd = async () => {
      if (!active.current) return
      active.current = false
      if (pullY.current >= THRESHOLD && !refreshingRef.current) {
        refreshingRef.current = true
        setRefreshing(true)
        const el = indicatorRef.current
        if (el) {
          el.style.height = '36px'
          el.style.opacity = '1'
        }
        const arrow = arrowRef.current
        if (arrow) arrow.style.transform = 'none'
        try { await onRefresh() } catch {}
        refreshingRef.current = false
        setRefreshing(false)
      }
      updateVisual(0)
      pullY.current = 0
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [onRefresh, updateVisual])

  const indicator = (
    <div ref={indicatorRef}
      className="flex justify-center overflow-hidden"
      style={{ height: 0, opacity: 0, transition: 'none', willChange: 'height, opacity' }}>
      <div className={`flex items-center justify-center w-8 h-8 rounded-full bg-[#29292e] border border-[#323238] mt-1 ${refreshing ? 'animate-spin' : ''}`}>
        <svg ref={arrowRef} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className="text-[#2563eb]" style={{ willChange: 'transform' }}>
          <path d="M12 5v14M5 12l7-7 7 7" />
        </svg>
      </div>
    </div>
  )

  return { indicator, refreshing }
}
