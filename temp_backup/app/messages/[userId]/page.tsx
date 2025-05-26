"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { sendMessage, markConversationAsRead, deleteMessage, getConversationMessages } from "@/app/actions/messages"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

// UI Components
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import { 
  ArrowLeft, 
  AlertCircle, 
  Loader2, 
  MessageSquare, 
  Send, 
  Trash2, 
  MoreVertical
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Types
interface Message {
  id: number
  conversation_id: number
  sender_id: string
  recipient_id: string
  content: string
  is_read: boolean
  created_at: string
}

interface UserDetails {
  id: string
  full_name: string
  user_code: string
  role_id: number
  roles: { name: string }
}

// Map role_id to colors for role tags and avatars
const roleColors: Record<number, { bg: string, text: string, avatar: string }> = {
  1: { bg: "bg-blue-100", text: "text-blue-800", avatar: "bg-blue-500" }, // Student
  2: { bg: "bg-green-100", text: "text-green-800", avatar: "bg-green-500" }, // Parent
  3: { bg: "bg-orange-100", text: "text-orange-800", avatar: "bg-orange-500" }, // Teacher
  4: { bg: "bg-purple-100", text: "text-purple-800", avatar: "bg-purple-500" }, // Admin
}

// Helper function to get user initials
const getUserInitials = (name: string): string => {
  if (!name) return "؟؟";
  const parts = name.split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2);
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Helper function to get role color
const getRoleColor = (roleId: number) => {
  return roleColors[roleId] || { bg: "bg-gray-100", text: "text-gray-800", avatar: "bg-gray-500" };
};

export default function ConversationPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.userId as string
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageContent, setMessageContent] = useState("")
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [otherUser, setOtherUser] = useState<UserDetails | null>(null)
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClientComponentClient()

  // Fetch conversation data and set up realtime subscription
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setErrorMessage(null)

        // Use getUser directly as recommended by Supabase
        const { data: userData, error: userError } = await supabase.auth.getUser()
        
        if (userError) {
          console.error("Auth user error:", userError)
          setIsAuthenticated(false)
          setIsLoading(false)
          router.replace(`/auth/login?redirect=/messages/${userId}`)
          return
        }
        
        if (!userData?.user) {
          console.log("No authenticated user found")
          setIsAuthenticated(false)
          setIsLoading(false)
          router.replace(`/auth/login?redirect=/messages/${userId}`)
          return
        }
        
        console.log("User authenticated:", userData.user.id)
        setIsAuthenticated(true)
        setCurrentUser(userData.user.id)

        // Get conversation messages and other user details using enhanced server action
        const result = await getConversationMessages(userId)
        
        if (!result.success) {
          console.error("Error fetching conversation:", result.message)
          setErrorMessage(result.message || "حدث خطأ أثناء تحميل المحادثة")
          setIsLoading(false)
          return
        }

        if (!result.otherUser) {
          console.error("Other user data not found")
          setErrorMessage("لم يتم العثور على المستخدم. تحقق من المعرف وحاول مرة أخرى")
          setIsLoading(false)
          return
        }
        
        setOtherUser(result.otherUser)
        setMessages(result.data || [])
        setConversationId(result.conversationId)
      } catch (error) {
        console.error("Error in conversation setup:", error)
        setErrorMessage("حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى لاحقًا")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()

    // Set up real-time subscription for new messages
    const setupRealtime = async () => {
      if (!conversationId) return
      
    const channel = supabase
      .channel("messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_messages" }, async (payload) => {
        const newMessage = payload.new as Message
          
          // Add message to state if it belongs to this conversation
          if (conversationId && newMessage.conversation_id === conversationId) {
          setMessages((prev) => [...prev, newMessage])

            // Mark as read if we are the recipient
            const { data: userData } = await supabase.auth.getUser()
            if (userData.user && newMessage.recipient_id === userData.user.id) {
            const formData = new FormData()
              formData.append("conversationId", conversationId.toString())
            await markConversationAsRead(formData)
          }
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    }
    
    if (conversationId) {
      setupRealtime()
    }
    
    // Cleanup
    return () => {
      // Cleanup is handled in setupRealtime
    }
  }, [userId, supabase, conversationId, router])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Send message handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageContent.trim() || !otherUser) return

    setIsSending(true)
    try {
      const formData = new FormData()
      formData.append("recipientId", otherUser.id)
      formData.append("content", messageContent)

      const result = await sendMessage(formData)

      if (result.success) {
        setMessageContent("")
      } else {
        toast({
          variant: "destructive",
          title: "خطأ في إرسال الرسالة",
          description: result.message,
        })
      }
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        variant: "destructive",
        title: "خطأ في إرسال الرسالة",
        description: "حدث خطأ أثناء إرسال الرسالة. يرجى المحاولة مرة أخرى",
      })
    } finally {
      setIsSending(false)
    }
  }

  // Delete message handler
  const handleDeleteMessage = async (messageId: number) => {
    try {
      const formData = new FormData()
      formData.append("messageId", messageId.toString())

      const result = await deleteMessage(formData)

      if (result.success) {
        setMessages((prev) => prev.filter((message) => message.id !== messageId))
        toast({
          title: "تم الحذف",
          description: "تم حذف الرسالة بنجاح",
        })
      } else {
        toast({
          variant: "destructive",
          title: "خطأ في الحذف",
          description: result.message,
        })
      }
    } catch (error) {
      console.error("Error deleting message:", error)
      toast({
        variant: "destructive",
        title: "خطأ في الحذف",
        description: "حدث خطأ أثناء حذف الرسالة. يرجى المحاولة مرة أخرى",
      })
    }
  }

  // Show login button if not authenticated
  if (isAuthenticated === false) {
    return (
      <div className="container mx-auto py-12 text-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>يجب تسجيل الدخول أولاً</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>يرجى تسجيل الدخول لعرض وإرسال الرسائل</p>
            <Button 
              onClick={() => router.push('/auth/login?redirect=/messages/' + userId)} 
              className="w-full"
            >
              تسجيل الدخول
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="mt-2">جاري تحميل المحادثة...</p>
      </div>
    )
  }

  // Error state
  if (errorMessage) {
    return (
      <div className="container mx-auto py-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              خطأ
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-8">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-4 text-red-800">{errorMessage}</h3>
            <p className="mb-6 text-red-700">
              تأكد من صحة الرابط أو عد إلى صفحة المحادثات.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="default" onClick={() => router.push("/messages")}>
                <ArrowLeft className="ml-2 h-4 w-4" />
                العودة للمحادثات
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                إعادة المحاولة
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Missing user state
  if (!otherUser) {
    return (
      <div className="container mx-auto py-6 flex flex-col items-center justify-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="mb-2">لم يتم العثور على المستخدم</p>
        <p className="text-sm text-muted-foreground mb-4">تحقق من المعرف وحاول مرة أخرى أو عد إلى المحادثات</p>
          <Button onClick={() => router.push("/messages")}>
          العودة إلى الرسائل
        </Button>
      </div>
    )
  }

  // Chat UI
  const roleColor = getRoleColor(otherUser.role_id)
  const initials = getUserInitials(otherUser.full_name)

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <Card className="h-[80vh] flex flex-col">
        {/* Header */}
        <CardHeader className="border-b flex-shrink-0 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/messages")}
              className="flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">العودة</span>
            </Button>
            <div className={`flex h-12 w-12 items-center justify-center rounded-full text-white ${roleColor.avatar} flex-shrink-0`}>
              <span className="text-sm font-medium">{initials}</span>
            </div>
            <div className="flex flex-col min-w-0">
              <CardTitle className="text-lg font-semibold truncate">{otherUser?.full_name}</CardTitle>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs px-2 py-0.5 rounded-full ${roleColor.bg} ${roleColor.text}`}>
                  {otherUser.roles?.name || "غير محدد"}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {otherUser?.user_code}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        
        {/* Messages */}
        <CardContent className="flex-grow overflow-auto p-4 space-y-4 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                لا توجد رسائل بعد. ابدأ المحادثة بإرسال رسالة.
              </p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender_id === currentUser ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] md:max-w-[70%] rounded-lg p-3 shadow-sm ${
                      message.sender_id === currentUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="break-words whitespace-pre-wrap">{message.content}</div>
                      {message.sender_id === currentUser && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 -mt-1 -mr-1 text-inherit opacity-70 hover:opacity-100">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">خيارات</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive flex items-center cursor-pointer"
                              onClick={() => handleDeleteMessage(message.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              حذف
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    <div
                      className={`text-xs mt-1 ${
                        message.sender_id === currentUser
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      {new Date(message.created_at).toLocaleTimeString("ar-SA", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </CardContent>
        
        {/* Message input */}
        <div className="p-4 border-t">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <Input
              placeholder="اكتب رسالتك هنا..."
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              className="flex-grow"
              disabled={isSending}
            />
            <Button type="submit" size="icon" disabled={isSending} className="shrink-0">
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="sr-only">إرسال</span>
            </Button>
          </form>
        </div>
      </Card>
      
      {/* Styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
    </div>
  )
}