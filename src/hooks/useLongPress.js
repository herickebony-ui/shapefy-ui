import { useRef } from 'react'

// Long-press handler que cobre desktop (onContextMenu / botão direito) e mobile
// (touchstart + timer). Cancela em scroll/move > moveThreshold e suprime o click
// sintético que vem depois do touchend quando o long-press disparou.
export default function useLongPress(onLongPress, {
  onClick,
  delay = 500,
  moveThreshold = 10,
  shouldHandle,
} = {}) {
  const timerRef = useRef(null)
  const triggeredRef = useRef(false)
  const startPosRef = useRef(null)

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const fire = (clientX, clientY) => {
    triggeredRef.current = true
    onLongPress({ clientX, clientY, preventDefault: () => {} })
  }

  const handleTouchStart = (e) => {
    triggeredRef.current = false
    if (shouldHandle && !shouldHandle(e)) {
      startPosRef.current = null
      return
    }
    const t = e.touches[0]
    if (!t) return
    startPosRef.current = { x: t.clientX, y: t.clientY }
    clearTimer()
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      fire(startPosRef.current?.x ?? t.clientX, startPosRef.current?.y ?? t.clientY)
    }, delay)
  }

  const handleTouchMove = (e) => {
    if (!startPosRef.current) return
    const t = e.touches[0]
    if (!t) return
    const dx = Math.abs(t.clientX - startPosRef.current.x)
    const dy = Math.abs(t.clientY - startPosRef.current.y)
    if (dx > moveThreshold || dy > moveThreshold) {
      clearTimer()
      startPosRef.current = null
    }
  }

  const handleTouchEnd = () => {
    clearTimer()
    startPosRef.current = null
  }

  const handleTouchCancel = () => {
    clearTimer()
    startPosRef.current = null
    triggeredRef.current = false
  }

  const handleClick = (e) => {
    if (triggeredRef.current) {
      triggeredRef.current = false
      e.preventDefault?.()
      e.stopPropagation?.()
      return
    }
    if (onClick) onClick(e)
  }

  const handleContextMenu = (e) => {
    if (shouldHandle && !shouldHandle(e)) return
    e.preventDefault()
    fire(e.clientX, e.clientY)
  }

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchCancel,
    onClick: onClick !== undefined ? handleClick : undefined,
    onContextMenu: handleContextMenu,
  }
}
