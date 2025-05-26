"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { getUserConversations, getMessagingUsers } from "@/app/actions/messages"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

// UI Components
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  AlertCircle, 
  Check, 
  Loader2, 
  MessageSquare, 
  Search, 
  User, 
  Users, 
  Plus,
  Clock,
  ArrowRight
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

// Types
interface Conversation {
  id: number
  last_message_at: string
  other_user: {
    id: string
    full_name: string
    user_code: string
    role_id: number
    roles: {
      name: string
    }
  }
  unread_count: number
}

interface UserForMessaging {
  id: string
  full_name: string
  user_code: string
  role_id: number
  roles: {
    name: string
  }
}

// Role color mappings
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

// Helper function to format date
const formatMessageDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  // If less than 24 hours, show time
  if (diff < 24 * 60 * 60 * 1000) {
    return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  }
  
  // If less than 7 days, show day name
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString('ar-SA', { weekday: 'long' });
  }
  
  // Otherwise show date
  return date.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function MessagesPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("conversations")
  const [isLoading, setIsLoading] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [users, setUsers] = useState<UserForMessaging[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const supabase = createClientComponentClient()

  // Check authentication and redirect if not logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Use getUser directly as recommended by Supabase
        const { data: userData, error: userError } = await supabase.auth.getUser()
                
                if (userError) {
          console.error("Auth user error:", userError)
          setIsAuthenticated(false)
          setIsLoading(false)
          router.replace('/auth/login?redirect=/messages')
          return
        }
        
        if (!userData?.user) {
          console.log("No authenticated user found")
          setIsAuthenticated(false)
          setIsLoading(false)
          router.replace('/auth/login?redirect=/messages')
          return
        }
        
        console.log("User authenticated:", userData.user.id)
        setIsAuthenticated(true)
        
        // Fetch conversations and users data
        await fetchData()
      } catch (err) {
        console.error("Authentication check error:", err)
        setError("حدث خطأ أثناء التحقق من الجلسة")
        setIsAuthenticated(false)
        setIsLoading(false)
      }
    }
    
    const fetchData = async () => {
      try {
        // Get conversations
        const conversationsResult = await getUserConversations()
        
        if (conversationsResult.success) {
          setConversations(conversationsResult.data)
        } else {
          console.error("Error fetching conversations:", conversationsResult.message)
          setError(conversationsResult.message || "فشل في جلب المحادثات")
        }
        
        // Get users for messaging
        const usersResult = await getMessagingUsers()
        
        if (usersResult.success) {
          setUsers(usersResult.data as UserForMessaging[])
        } else {
          console.error("Error fetching users:", usersResult.message)
          // Don't set error here since we can still show conversations
        }
      } catch (err) {
        console.error("Unexpected error loading messages data:", err)
        setError("حدث خطأ غير متوقع أثناء تحميل البيانات")
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router, supabase])

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
              onClick={() => router.push('/auth/login?redirect=/messages')} 
              className="w-full"
            >
              تسجيل الدخول
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Filter conversations based on search term
  const filteredConversations = conversations.filter((conv) =>
    conv.other_user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.other_user.user_code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Filter users based on search term
  const filteredUsers = users.filter((user) =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.user_code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 text-center">
        <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
        <p className="mt-4 text-lg">جاري تحميل المحادثات...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">المحادثات</h1>
        </div>

        {error && (
          <Card className="bg-red-50 border-red-200 mb-4">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
              <div className="flex space-x-2 mt-4 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()}
                >
                  إعادة المحاولة
                </Button>
                <Button 
                  variant="default" 
                  onClick={() => router.push('/auth/login?redirect=/messages')}
                >
                  تسجيل الدخول
        </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="bg-background rounded-lg border shadow-sm">
          <Tabs 
            defaultValue="conversations" 
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="conversations" className="text-sm">
                  <MessageSquare className="h-4 w-4 ml-2" />
                  المحادثات
                </TabsTrigger>
                <TabsTrigger value="contacts" className="text-sm">
                  <Users className="h-4 w-4 ml-2" />
                  جهات الاتصال
                </TabsTrigger>
              </TabsList>
      </div>

            <div className="p-4">
              <div className="flex w-full items-center space-x-2 mb-4">
                <Search className="h-4 w-4 text-muted-foreground ml-2" />
                <Input
                  type="search"
                  placeholder="البحث..."
                  className="flex-1"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <TabsContent value="conversations" className="mt-0">
                {filteredConversations.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      {searchTerm ? "لا توجد نتائج بحث" : "لا توجد محادثات"}
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      {searchTerm 
                        ? "لم يتم العثور على محادثات تطابق بحثك." 
                        : "ابدأ محادثة جديدة مع أحد المستخدمين."}
                    </p>
                    {searchTerm ? (
                      <Button 
                        variant="outline" 
                        onClick={() => setSearchTerm("")}
                      >
                        مسح البحث
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => setActiveTab("contacts")}
                      >
                        <Plus className="h-4 w-4 ml-2" />
                        محادثة جديدة
                      </Button>
                    )}
            </div>
                ) : (
                  <ul className="space-y-2">
                    {filteredConversations.map((conversation) => {
                      const { other_user } = conversation
                      const roleColor = getRoleColor(other_user.role_id)
                      const initials = getUserInitials(other_user.full_name)
                  
                  return (
                        <li key={conversation.id}>
                          <Link 
                            href={`/messages/${other_user.id}`}
                            className="block"
                          >
                            <div className="flex items-center px-4 py-3 hover:bg-muted rounded-lg transition-colors">
                              <div className={`flex h-12 w-12 items-center justify-center rounded-full text-white ${roleColor.avatar} flex-shrink-0`}>
                          <span className="text-sm font-medium">{initials}</span>
                      </div>
                              
                              <div className="ml-4 flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <div className="font-medium truncate">
                                    {other_user.full_name}
                                  </div>
                                  <div className="text-xs text-muted-foreground flex items-center">
                                    <Clock className="h-3 w-3 inline ml-1" />
                                    {formatMessageDate(conversation.last_message_at)}
                                  </div>
                                </div>
                                
                                <div className="flex items-center mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${roleColor.bg} ${roleColor.text}`}>
                                    {other_user.roles?.name || "غير محدد"}
                            </span>
                                  <span className="text-xs text-muted-foreground mr-2 truncate">
                                    {other_user.user_code}
                            </span>
                          </div>
                        </div>
                              
                              <div className="ml-2 flex items-center">
                                {conversation.unread_count > 0 && (
                                  <Badge variant="default" className="ml-auto py-1">
                                    {conversation.unread_count}
                                  </Badge>
                                )}
                                <ArrowRight className="h-5 w-5 text-muted-foreground mr-2" />
                      </div>
                    </div>
                          </Link>
                          {conversation !== filteredConversations[filteredConversations.length - 1] && (
                            <Separator className="my-1" />
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </TabsContent>
              
              <TabsContent value="contacts" className="mt-0">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      {searchTerm ? "لا توجد نتائج بحث" : "لا توجد جهات اتصال"}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {searchTerm 
                        ? "لم يتم العثور على مستخدمين يطابقون بحثك." 
                        : "لم يتم العثور على مستخدمين متاحين للمراسلة."}
                    </p>
                    {searchTerm && (
                      <Button 
                        variant="outline" 
                        onClick={() => setSearchTerm("")}
                      >
                        مسح البحث
                      </Button>
                    )}
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {filteredUsers.map((user) => {
                      const roleColor = getRoleColor(user.role_id)
                      const initials = getUserInitials(user.full_name)
                
                return (
                        <li key={user.id}>
                          <Link 
                            href={`/messages/${user.id}`}
                            className="block"
                          >
                            <div className="flex items-center px-4 py-3 hover:bg-muted rounded-lg transition-colors">
                              <div className={`flex h-12 w-12 items-center justify-center rounded-full text-white ${roleColor.avatar} flex-shrink-0`}>
                            <span className="text-sm font-medium">{initials}</span>
                      </div>
                              
                              <div className="ml-4 flex-1 min-w-0">
                                <div className="font-medium truncate">
                                  {user.full_name}
                                </div>
                                
                                <div className="flex items-center mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${roleColor.bg} ${roleColor.text}`}>
                                    {user.roles?.name || "غير محدد"}
                              </span>
                                  <span className="text-xs text-muted-foreground mr-2 truncate">
                                    {user.user_code}
                              </span>
                            </div>
                      </div>
                              
                  <Button 
                                size="sm" 
                                variant="ghost"
                                className="ml-2"
                              >
                                <MessageSquare className="h-4 w-4" />
                                <span className="sr-only">بدء محادثة</span>
                  </Button>
                </div>
                          </Link>
                          {user !== filteredUsers[filteredUsers.length - 1] && (
                            <Separator className="my-1" />
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </TabsContent>
            </div>
          </Tabs>
          </div>
        </div>
    </div>
  )
}