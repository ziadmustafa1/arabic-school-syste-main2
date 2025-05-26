"use client"

import * as React from "react"
import { formatDistanceToNow } from "date-fns"
import { ar } from "date-fns/locale"
import { Send, ArrowRight } from "lucide-react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Message {
  id: string
  content: string
  sender_id: string
  receiver_id: string
  created_at: string
  sender_name?: string
  sender_avatar?: string
}

interface User {
  id: string
  full_name: string
  avatar_url?: string
}

interface MobileMessageViewProps {
  messages: Message[]
  currentUser: User
  recipient: User
  onSendMessage: (content: string) => Promise<void>
  isLoading?: boolean
}

export function MobileMessageView({
  messages,
  currentUser,
  recipient,
  onSendMessage,
  isLoading = false,
}: MobileMessageViewProps) {
  const [newMessage, setNewMessage] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return

    try {
      setSending(true)
      await onSendMessage(newMessage)
      setNewMessage("")

      // Focus back on textarea after sending
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 0)
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="border-b p-3 flex items-center gap-3">
        <Link href="/messages">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowRight className="h-4 w-4" />
            <span className="sr-only">العودة</span>
          </Button>
        </Link>
        <Avatar className="h-8 w-8">
          <AvatarImage src={recipient.avatar_url || "/placeholder.svg"} alt={recipient.full_name} />
          <AvatarFallback>{recipient.full_name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-sm">{recipient.full_name}</p>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => {
            const isCurrentUser = message.sender_id === currentUser.id

            return (
              <div key={message.id} className={cn("flex", isCurrentUser ? "justify-end" : "justify-start")}>
                <div className="flex items-end gap-2 max-w-[80%]">
                  {!isCurrentUser && (
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={recipient.avatar_url || "/placeholder.svg"} alt={recipient.full_name} />
                      <AvatarFallback>{recipient.full_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  )}

                  <div
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm",
                      isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted",
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p
                      className={cn(
                        "text-xs mt-1",
                        isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground",
                      )}
                    >
                      {formatDistanceToNow(new Date(message.created_at), {
                        addSuffix: true,
                        locale: ar,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="border-t p-3">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="اكتب رسالتك هنا..."
            className="min-h-[60px] resize-none"
            disabled={sending || isLoading}
          />
          <Button
            onClick={handleSendMessage}
            size="icon"
            disabled={!newMessage.trim() || sending || isLoading}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">إرسال</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
