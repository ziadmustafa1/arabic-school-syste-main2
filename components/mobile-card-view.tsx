"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface MobileCardViewProps {
  items: {
    id: string | number
    title: string
    content: React.ReactNode
    footer?: React.ReactNode
  }[]
  className?: string
}

export function MobileCardView({ items, className }: MobileCardViewProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50

  const nextCard = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % items.length)
  }, [items.length])

  const prevCard = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + items.length) % items.length)
  }, [items.length])

  // Handle touch events for swipe gestures
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }, [])

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance
    
    if (isLeftSwipe) {
      nextCard()
    }
    if (isRightSwipe) {
      prevCard()
    }
  }, [touchStart, touchEnd, nextCard, prevCard, minSwipeDistance])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') nextCard()
      if (e.key === 'ArrowRight') prevCard()
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [nextCard, prevCard])

  // Memoize carousel items to prevent unnecessary re-renders
  const carouselItems = useMemo(() => {
    return items.map((item, index) => (
      <Card 
        key={item.id} 
        className="w-full flex-shrink-0 border rounded-lg overflow-hidden will-change-transform"
        aria-hidden={index !== activeIndex}
      >
        <CardHeader>
          <CardTitle>{item.title}</CardTitle>
        </CardHeader>
        <CardContent>{item.content}</CardContent>
        {item.footer && <CardFooter>{item.footer}</CardFooter>}
      </Card>
    ))
  }, [items, activeIndex])

  if (items.length === 0) {
    return null
  }

  return (
    <div className={cn("relative w-full", className)}>
      <div 
        className="overflow-hidden" 
        ref={containerRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ touchAction: "pan-y" }}
      >
        <div
          className="flex transition-transform duration-300 ease-in-out will-change-transform"
          style={{ transform: `translateX(${activeIndex * -100}%)` }}
          aria-live="polite"
        >
          {carouselItems}
        </div>
      </div>

      {items.length > 1 && (
        <>
          <Button
            variant="outline"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur-sm h-12 w-12 min-h-[48px] min-w-[48px]"
            onClick={prevCard}
            aria-label="السابق"
          >
            <ChevronRight className="h-6 w-6" />
            <span className="sr-only">السابق</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur-sm h-12 w-12 min-h-[48px] min-w-[48px]"
            onClick={nextCard}
            aria-label="التالي"
          >
            <ChevronLeft className="h-6 w-6" />
            <span className="sr-only">التالي</span>
          </Button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 mt-2">
            {items.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "h-2.5 w-2.5 rounded-full transition-colors",
                  index === activeIndex ? "bg-primary" : "bg-muted-foreground/30",
                )}
                aria-label={`عرض البطاقة ${index + 1}`}
                aria-current={index === activeIndex ? "true" : "false"}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
