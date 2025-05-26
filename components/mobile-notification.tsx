"use client"

import * as React from "react"
import { formatDistanceToNow } from "date-fns"
import { ar } from "date-fns/locale"
import { Check, Trash2, ChevronLeft } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Notification {
  id: number | string
  title: string
  message?: string
  content: string
  created_at: string
  is_read: boolean
  type?: "info" | "warning" | "success" | "error"
}

interface MobileNotificationProps {
  notification: Notification
  onMarkAsRead: (id: number | string) => void
  onDelete: (id: number | string) => void
}

export function MobileNotification({ notification, onMarkAsRead, onDelete }: MobileNotificationProps) {
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [isReading, setIsReading] = React.useState(false)
  const [swipeOffset, setSwipeOffset] = React.useState(0)
  const touchStartX = React.useRef(0)
  const cardRef = React.useRef<HTMLDivElement>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX
    const diff = currentX - touchStartX.current

    // Limit swipe to left direction and max 150px
    if (diff < 0 && diff > -150) {
      setSwipeOffset(diff)
    }
  }

  const handleTouchEnd = () => {
    if (swipeOffset < -80) {
      // Show action buttons
      setSwipeOffset(-150)
    } else {
      // Reset position
      setSwipeOffset(0)
    }
  }

  const handleMarkAsRead = async () => {
    setIsReading(true)
    await onMarkAsRead(notification.id)
    setIsReading(false)
    setSwipeOffset(0)
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    await onDelete(notification.id)
    setIsDeleting(false)
  }

  const resetSwipe = () => {
    setSwipeOffset(0)
  }

  const typeStyles = {
    info: "border-blue-500 bg-blue-50 dark:bg-blue-950/30",
    warning: "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30",
    success: "border-green-500 bg-green-50 dark:bg-green-950/30",
    error: "border-red-500 bg-red-50 dark:bg-red-950/30",
  }

  const badgeStyles = {
    info: "bg-blue-500",
    warning: "bg-yellow-500",
    success: "bg-green-500",
    error: "bg-red-500",
  }

  // Ensure we have a valid type, defaulting to "info" if not provided
  const notificationType = notification.type && 
    ["info", "warning", "success", "error"].includes(notification.type) 
      ? notification.type 
      : "info"

  const messageContent = notification.message || notification.content

  return (
    <div className="relative">
      <div
        ref={cardRef}
        style={{ transform: `translateX(${swipeOffset}px)` }}
        className="transition-transform touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Card
          className={cn(
            "p-4",
            !notification.is_read && "bg-accent/20",
            typeStyles[notificationType as keyof typeof typeStyles]
          )}
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{notification.title}</h3>
                {!notification.is_read && (
                  <Badge variant="secondary" className="h-2 w-2 rounded-full p-0 bg-primary" />
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{messageContent}</p>
            </div>
            {swipeOffset < -50 && (
              <Button variant="ghost" size="sm" onClick={resetSwipe} className="h-8 p-0 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
              locale: ar,
            })}
          </div>
        </Card>
      </div>

      {/* Action buttons that appear on swipe */}
      <div className="absolute top-0 right-0 h-full flex items-center">
        {!notification.is_read && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAsRead}
            disabled={isReading}
            className="h-10 bg-primary/10 hover:bg-primary/20 text-primary"
          >
            <Check className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={isDeleting}
          className="h-10 bg-destructive/10 hover:bg-destructive/20 text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
