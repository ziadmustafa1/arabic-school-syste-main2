"use client"

import { useEffect, useState } from "react"
import { Loader2, AlertCircle } from "lucide-react"
import Link from "next/link"

import { useMediaQuery } from "@/hooks/use-media-query"
import { MobileNotification } from "@/components/mobile-notification"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { ar } from "date-fns/locale"
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification,
  type Notification 
} from "@/lib/actions/notifications"
import { toast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"
import { getCurrentUser } from "@/lib/utils/auth-compat"
import { FixNotificationsButton } from "@/app/components/fix-notifications-button"

// Wrapper type for the notification with flexible ID type
type NotificationWithFlexibleId = Omit<Notification, 'id'> & {
  id: number | string;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAsRead, setMarkingAsRead] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [databaseError, setDatabaseError] = useState<boolean>(false)
  const [userIsAdmin, setUserIsAdmin] = useState<boolean>(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    // Get current user
    async function initUser() {
      const userData = await getCurrentUser()
      if (userData) {
        setCurrentUser(userData)
      }
    }
    
    initUser()
  }, [])

  useEffect(() => {
    if (currentUser?.id) {
      fetchNotifications()
      loadUserRole()
    }
  }, [currentUser])

  async function loadUserRole() {
    if (!currentUser?.id) return

    try {
      const { data: userData } = await supabase
        .from('users')
        .select('role_id')
        .eq('id', currentUser.id)
        .single()
        
      if (userData?.role_id === 4) { // Assuming 4 is admin role
        setUserIsAdmin(true)
      }
    } catch (error) {
      console.error("Error checking user role:", error)
    }
  }

  async function fetchNotifications() {
    if (!currentUser?.id) return

    setLoading(true)
    try {
      // First try to use the proper API
      try {
        const result = await getUserNotifications()
        if (result.success) {
          setNotifications(result.data || [])
          return
        }
      } catch (apiError) {
        console.error("API method failed:", apiError)
      }
      
      // Fallback to direct Supabase query
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error("Error fetching notifications:", error)
        
        // Check if this is the specific database function error
        if (error.message && (
            error.message.includes('exec_sql') || 
            error.message.includes('function') && error.message.includes('does not exist')
        )) {
          setDatabaseError(true)
        }
        
        setNotifications([])
      } else {
        setNotifications(data || [])
      }
    } catch (error) {
      console.error("Error in fetch notifications:", error)
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  // Wrapper function to handle both string and number IDs
  const handleMobileMarkAsRead = async (id: string | number) => {
    const numericId = typeof id === 'string' ? parseInt(id) : id
    await handleMarkAsRead(numericId)
  }

  // Wrapper function to handle both string and number IDs
  const handleMobileDeleteNotification = async (id: string | number) => {
    const numericId = typeof id === 'string' ? parseInt(id) : id
    await handleDeleteNotification(numericId)
  }

  const handleMarkAsRead = async (id: number) => {
    try {
      setMarkingAsRead(id)
      const result = await markNotificationAsRead(id)
      
      if (!result.success) {
        toast({
          title: "خطأ",
          description: result.error || "حدث خطأ أثناء تحديد الإشعار كمقروء",
          variant: "destructive",
        })
        return
      }
      
      setNotifications(
        notifications.map((notification) => 
          notification.id === id ? { ...notification, is_read: true } : notification
        )
      )
    } catch (error) {
      console.error("Error marking notification as read:", error)
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديد الإشعار كمقروء",
        variant: "destructive",
      })
    } finally {
      setMarkingAsRead(null)
    }
  }

  const handleDeleteNotification = async (id: number) => {
    try {
      setDeleting(id)
      const result = await deleteNotification(id)
      
      if (!result.success) {
        toast({
          title: "خطأ",
          description: result.error || "حدث خطأ أثناء حذف الإشعار",
          variant: "destructive",
        })
        return
      }
      
      setNotifications(notifications.filter((notification) => notification.id !== id))
    } catch (error) {
      console.error("Error deleting notification:", error)
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف الإشعار",
        variant: "destructive",
      })
    } finally {
      setDeleting(null)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      setLoading(true)
      const result = await markAllNotificationsAsRead()
      
      if (!result.success) {
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء تحديد جميع الإشعارات كمقروءة. استخدم زر الإصلاح لحل المشكلة.",
          variant: "destructive",
          action: (
            <Button variant="outline" size="sm" onClick={handleFixNotificationsSchema}>
              إصلاح
            </Button>
          )
        })
        return
      }
      
      setNotifications(notifications.map((notification) => ({ ...notification, is_read: true })))
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديد جميع الإشعارات كمقروءة",
        variant: "destructive",
        action: (
          <Button variant="outline" size="sm" onClick={handleFixNotificationsSchema}>
            إصلاح
          </Button>
        )
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFixNotificationsSchema = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/fix-notifications-schema')
      const result = await response.json()
      
      if (result.success) {
        toast({
          title: "تم بنجاح",
          description: "تم إصلاح قاعدة البيانات بنجاح، يرجى المحاولة مرة أخرى",
          variant: "default",
        })
      } else {
        toast({
          title: "خطأ",
          description: result.error || "حدث خطأ أثناء إصلاح قاعدة البيانات",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fixing notifications schema:", error)
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إصلاح قاعدة البيانات",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      fetchNotifications() // Refresh notifications after fix
    }
  }

  const unreadCount = notifications.filter((notification) => !notification.is_read).length

  if (loading && notifications.length === 0) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const typeStyles = {
    info: "border-blue-500",
    warning: "border-amber-500",
    success: "border-emerald-500",
    error: "border-red-500",
  }

  const typeIcons = {
    info: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>,
    warning: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>,
    success: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>,
    error: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>,
  }

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">الإشعارات</h1>
            <p className="text-muted-foreground mt-1">
              {unreadCount > 0 ? `لديك ${unreadCount} إشعارات غير مقروءة` : "ليس لديك إشعارات غير مقروءة"}
            </p>
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" onClick={handleMarkAllAsRead} disabled={loading} className="shrink-0">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    جاري التحديث...
                  </>
                ) : (
                  "تحديد الكل كمقروء"
                )}
              </Button>
            )}
            <FixNotificationsButton />
          </div>
        </div>

        {databaseError && (
          <div className="mb-6 p-4 border border-red-200 bg-red-50 rounded-md">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-red-800">خطأ في قاعدة البيانات</h3>
                <p className="text-sm text-red-700 mt-1">
                  يبدو أن هناك مشكلة في دالة قاعدة البيانات اللازمة لعرض الإشعارات. 
                  {userIsAdmin ? (
                    <span> بصفتك مسؤول النظام، يمكنك <Link href="/admin/database" className="text-red-800 underline">إصلاح المشكلة من هنا</Link>.</span>
                  ) : (
                    <span> يرجى التواصل مع مسؤول النظام لإصلاح هذه المشكلة.</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {notifications.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center h-[200px] space-y-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-muted-foreground opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p className="text-muted-foreground text-center">ليس لديك إشعارات حالياً</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {isMobile ? (
              <div className="space-y-2">
                {notifications.map((notification) => {
                  // Convert to flexible ID type for mobile component
                  const flexibleNotification: NotificationWithFlexibleId = {
                    ...notification,
                    message: notification.message || notification.content
                  };
                  
                  return (
                    <MobileNotification
                      key={notification.id}
                      notification={flexibleNotification}
                      onMarkAsRead={handleMobileMarkAsRead}
                      onDelete={handleMobileDeleteNotification}
                    />
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>جميع الإشعارات</CardTitle>
                  <CardDescription>{notifications.length} إشعارات في المجموع</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {notifications.map((notification) => {
                      // Ensure we have a valid type
                      const notificationType = notification.type && 
                        ["info", "warning", "success", "error"].includes(notification.type)
                          ? notification.type as keyof typeof typeStyles
                          : "info";
                      
                      // Extract notification category from title for better visual cues
                      let categoryLabel = "";
                      if (notification.title.includes("بطاقة")) {
                        categoryLabel = "بطاقة";
                      } else if (notification.title.includes("نقاط") || notification.title.includes("نقطة")) {
                        categoryLabel = notification.title.includes("سالب") ? "نقاط سالبة" : "نقاط";
                      } else if (notification.title.includes("شارة")) {
                        categoryLabel = "شارة";
                      } else if (notification.title.includes("مكافأة") || notification.title.includes("جائزة")) {
                        categoryLabel = "مكافأة";
                      }
                          
                      return (
                        <div
                          key={notification.id}
                          className={`flex items-start justify-between p-4 rounded-lg border-r-4 ${
                            typeStyles[notificationType]
                          } ${!notification.is_read ? "bg-accent/30" : "bg-background"} transition-colors duration-200 hover:bg-accent/10`}
                        >
                          <div className="flex items-start space-x-3 rtl:space-x-reverse">
                            <div className="mt-1">{typeIcons[notificationType]}</div>
                            <div className="flex-1">
                              <div className="flex items-center flex-wrap gap-2">
                                <h3 className="font-medium">{notification.title}</h3>
                                {!notification.is_read && (
                                  <Badge variant="secondary" className="h-2 w-2 rounded-full p-0 bg-primary" />
                                )}
                                {categoryLabel && (
                                  <Badge variant="outline" className="text-xs py-0 h-5">
                                    {categoryLabel}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {notification.message || notification.content}
                              </p>
                              <div className="text-xs text-muted-foreground mt-2">
                                {formatDistanceToNow(new Date(notification.created_at), {
                                  addSuffix: true,
                                  locale: ar,
                                })}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 mr-4">
                            {!notification.is_read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkAsRead(notification.id)}
                                disabled={markingAsRead === notification.id}
                                className="h-8"
                              >
                                {markingAsRead === notification.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  "تحديد كمقروء"
                                )}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteNotification(notification.id)}
                              disabled={deleting === notification.id}
                              className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              {deleting === notification.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "حذف"}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
