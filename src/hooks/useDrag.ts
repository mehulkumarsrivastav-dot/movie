import { useRef } from 'react'
import type { PanInfo } from 'framer-motion'

interface UseDragBoundsArgs {
  onPositionChange: (x: number, y: number) => void
  initialX: number
  initialY: number
}

/**
 * Thin wrapper around Framer Motion's drag gesture that clamps the floating
 * camera bubble to the viewport and persists the final position.
 */
export function useDragBounds({ onPositionChange, initialX, initialY }: UseDragBoundsArgs) {
  const position = useRef({ x: initialX, y: initialY })

  const onDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const nextX = Math.max(8, position.current.x + info.offset.x)
    const nextY = Math.max(8, position.current.y + info.offset.y)
    position.current = { x: nextX, y: nextY }
    onPositionChange(nextX, nextY)
  }

  return { onDragEnd, position }
}
