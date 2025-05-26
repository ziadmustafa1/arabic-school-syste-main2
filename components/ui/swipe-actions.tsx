"use client"

import type * as React from "react"
import { useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface SwipeActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  leftActions?: React.ReactNode
  rightActions?: React.ReactNode
  threshold?: number
  children: React.ReactNode
}

export function SwipeActions({
  leftActions,
  rightActions,
  threshold = 0.4,
  children,
  className,
  ...props
}: SwipeActionsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const leftActionsRef = useRef<HTMLDivElement>(null)
  const rightActionsRef = useRef<HTMLDivElement>(null)

  const [isSwiping, setIsSwiping] = useState(false)
  const [startX, setStartX] = useState(0)
  const [currentX, setCurrentX] = useState(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsSwiping(true)
    setStartX(e.touches[0].clientX)
    setCurrentX(e.touches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return
    setCurrentX(e.touches[0].clientX)

    const deltaX = currentX - startX

    if (contentRef.current) {
      contentRef.current.style.transform = `translateX(${deltaX}px)`
    }
  }

  const handleTouchEnd = () => {
    if (!isSwiping || !contentRef.current || !containerRef.current) return

    const deltaX = currentX - startX
    const containerWidth = containerRef.current.offsetWidth

    // Calculate if we've moved past the threshold
    const movePercentage = Math.abs(deltaX) / containerWidth

    if (movePercentage > threshold) {
      // Snap to action
      if (deltaX > 0 && leftActionsRef.current) {
        // Snap to left actions
        const leftWidth = leftActionsRef.current.offsetWidth
        contentRef.current.style.transform = `translateX(${leftWidth}px)`
      } else if (deltaX < 0 && rightActionsRef.current) {
        // Snap to right actions
        const rightWidth = rightActionsRef.current.offsetWidth
        contentRef.current.style.transform = `translateX(-${rightWidth}px)`
      }
    } else {
      // Reset position
      contentRef.current.style.transform = "translateX(0)"
    }

    setIsSwiping(false)
  }

  return (
    <div ref={containerRef} className={cn("relative overflow-hidden", className)} {...props}>
      {leftActions && (
        <div ref={leftActionsRef} className="absolute inset-y-0 left-0 flex items-center">
          {leftActions}
        </div>
      )}

      {rightActions && (
        <div ref={rightActionsRef} className="absolute inset-y-0 right-0 flex items-center">
          {rightActions}
        </div>
      )}

      <div
        ref={contentRef}
        className="relative bg-background transition-transform"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}
