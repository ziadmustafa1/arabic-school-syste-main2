"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { ROLES, ROLE_NAMES } from "@/lib/constants"
import {
  LayoutDashboard,
  Users,
  Award,
  Gift,
  CreditCard,
  MessageSquare,
  Bell,
  LogOut,
  User,
  BarChart3,
  School,
  ChevronLeft,
  ChevronRight,
  Settings,
  Search,
  AlertCircle,
  MinusCircle,
  Medal,
  Crown,
  Trophy,
  Star,
  X
} from "lucide-react"
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip"

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  roles: number[]
  badge?: string
  description?: string
}

interface SidebarProps {
  onClose?: () => void; // Prop to close sidebar on mobile
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [userRole, setUserRole] = useState<number | null>(null)
  const [userName, setUserName] = useState<string>("")
  const [userInitials, setUserInitials] = useState<string>("")
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function loadSidebarData() {
      try {
        setIsLoading(true)
        setError(null)
        
        // Get current user session
        const { data: sessionData } = await supabase.auth.getSession()
        
        if (!sessionData.session) {
          setError("يجب تسجيل الدخول أولاً")
          return
        }
        
        // Get user data
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("id", sessionData.session.user.id)
          .single()
        
        if (userError || !userData) {
          console.error("Error fetching user data:", userError)
          setError("خطأ في الحصول على بيانات المستخدم")
          return
        }
        
        // Set user data
        setUserRole(userData.role_id)
        setUserName(userData.full_name)

        // Generate initials from full name
        const nameParts = userData.full_name.split(" ")
        const initials = nameParts.length > 1
            ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
          : userData.full_name.substring(0, 2)
        setUserInitials(initials.toUpperCase())

        // Get notifications count
        const { count: notificationsCount } = await supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", sessionData.session.user.id)
          .eq("is_read", false)
        
        // Get messages count
        const { count: messagesCount } = await supabase
          .from("user_messages")
          .select("*", { count: "exact", head: true })
          .eq("recipient_id", sessionData.session.user.id)
          .eq("is_read", false)
        
        // Set notification counts
        setUnreadNotifications(notificationsCount || 0)
        setUnreadMessages(messagesCount || 0)
        
        console.log("Sidebar data loaded successfully")
      } catch (error) {
        console.error("Error loading sidebar data:", error)
        setError("حدث خطأ أثناء تحميل البيانات")
      } finally {
        setIsLoading(false)
      }
    }

    loadSidebarData()

    // Simple channel for notifications
    const notificationsChannel = supabase
      .channel('unread-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: 'is_read=eq.false'
      }, () => {
        // Just increment the counter on any new unread notification
        setUnreadNotifications(prev => prev + 1)
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: 'is_read=eq.true'
      }, () => {
        // Just decrement the counter when a notification is read
        setUnreadNotifications(prev => Math.max(0, prev - 1))
      })
      .subscribe()

    // Cleanup subscription when component unmounts
    return () => {
      supabase.removeChannel(notificationsChannel)
    }
  }, [supabase])

  const navItems: NavItem[] = [
    // Home links for each role
    { title: "الرئيسية", href: "/student", icon: LayoutDashboard, roles: [ROLES.STUDENT] },
    { title: "الرئيسية", href: "/parent", icon: LayoutDashboard, roles: [ROLES.PARENT] },
    { title: "الرئيسية", href: "/teacher", icon: LayoutDashboard, roles: [ROLES.TEACHER] },
    { title: "الرئيسية", href: "/admin", icon: LayoutDashboard, roles: [ROLES.ADMIN] },
    
    // Admin menu items - Reorganized into logical groups
    // Users group
    { title: "إدارة المستخدمين", href: "/admin/users", icon: Users, roles: [ROLES.ADMIN], description: "إدارة وقبول وتعديل المستخدمين" },
    { title: "إدارة المواد الدراسية", href: "/admin/subjects", icon: Star, roles: [ROLES.ADMIN], description: "إدارة المواد وربط المعلمين" },
    { title: "إدارة الصفوف", href: "/admin/classes", icon: School, roles: [ROLES.ADMIN] },
    
    // Points & Cards group - Highlighted and regrouped
    { title: "إدارة النقاط", href: "/admin/points", icon: Award, roles: [ROLES.ADMIN] },
    { title: "فئات النقاط", href: "/admin/points-categories", icon: Award, roles: [ROLES.ADMIN] },
    { title: "سجلات النقاط", href: "/admin/records", icon: Trophy, roles: [ROLES.ADMIN], description: "إدارة سجلات الإنجازات للمستخدمين" },
    { title: "بطاقات الشحن", href: "/admin/cards", icon: CreditCard, roles: [ROLES.ADMIN], description: "إدارة بطاقات شحن النقاط" },
    { title: "كروت الحسم", href: "/admin/deduction-cards", icon: AlertCircle, roles: [ROLES.ADMIN], description: "إدارة بطاقات خصم النقاط" },
    
    // Achievements & Rewards group
    { title: "إدارة الشارات", href: "/admin/badges", icon: Award, roles: [ROLES.ADMIN] },
    { title: "إدارة الأوسمة", href: "/admin/awards", icon: Award, roles: [ROLES.ADMIN] },
    { title: "إدارة المدليات", href: "/admin/medals", icon: Medal, roles: [ROLES.ADMIN] },
    { title: "إدارة الشارات المميزة", href: "/admin/emblems", icon: Crown, roles: [ROLES.ADMIN] },
    { title: "إدارة الطبقات", href: "/admin/tiers", icon: Trophy, roles: [ROLES.ADMIN], description: "إدارة نظام الطبقات والمستويات" },
    { title: "إدارة المكافآت", href: "/admin/rewards", icon: Gift, roles: [ROLES.ADMIN] },
    
    // Reports & System group
    { title: "التقارير", href: "/admin/reports", icon: BarChart3, roles: [ROLES.ADMIN] },
    { title: "أدوات التصحيح", href: "/admin/debug", icon: Settings, roles: [ROLES.ADMIN], description: "أدوات لتصحيح مشاكل النظام" },
    
    // Teacher menu items
    { title: "الصفوف", href: "/teacher/classes", icon: School, roles: [ROLES.TEACHER] },
    { title: "الحضور", href: "/teacher/attendance", icon: Users, roles: [ROLES.TEACHER] },
    { title: "النقاط الإيجابية", href: "/teacher/positive-points", icon: Award, roles: [ROLES.TEACHER] },
    { title: "النقاط السلبية", href: "/teacher/negative-points", icon: Award, roles: [ROLES.TEACHER] },
    { title: "الشارات", href: "/teacher/badges", icon: Award, roles: [ROLES.TEACHER] },
    { title: "الميداليات", href: "/teacher/medals", icon: Medal, roles: [ROLES.TEACHER] },
    { title: "المكافآت", href: "/teacher/rewards", icon: Gift, roles: [ROLES.TEACHER] },
    { title: "كروت الحسم", href: "/teacher/deduction-cards", icon: AlertCircle, roles: [ROLES.TEACHER] },
    { title: "بطاقات الشحن", href: "/teacher/recharge", icon: CreditCard, roles: [ROLES.TEACHER] },
    { title: "كروت الشحن الخاصة", href: "/teacher/my-cards", icon: CreditCard, roles: [ROLES.TEACHER] },
    { title: "سجلات النقاط", href: "/teacher/records", icon: Trophy, roles: [ROLES.TEACHER] },
    
    // Student menu items
    { title: "الحضور", href: "/student/attendance", icon: Users, roles: [ROLES.STUDENT] },
    { title: "النقاط", href: "/student/points", icon: Award, roles: [ROLES.STUDENT] },
    { title: "المكافآت", href: "/student/rewards", icon: Gift, roles: [ROLES.STUDENT] },
    { title: "الشارات", href: "/student/badges", icon: Award, roles: [ROLES.STUDENT] },
    { title: "الميداليات", href: "/student/medals", icon: Medal, roles: [ROLES.STUDENT] },
    { title: "المستوى والطبقة", href: "/profile/tier", icon: Trophy, roles: [ROLES.STUDENT], description: "عرض مستوى التقدم والطبقة الحالية" },
    { title: "بطاقات الشحن", href: "/student/recharge", icon: CreditCard, roles: [ROLES.STUDENT] },
    { title: "كروت الشحن الخاصة", href: "/student/my-cards", icon: CreditCard, roles: [ROLES.STUDENT] },
    { title: "كروت الحسم والاستبعاد", href: "/student/deduction-cards", icon: AlertCircle, roles: [ROLES.STUDENT], description: "عرض كروت الحسم المخصصة لك" },
    { title: "النقاط السلبية", href: "/student/negative-points", icon: MinusCircle, roles: [ROLES.STUDENT], description: "عرض وتسديد النقاط السلبية" },
    { title: "تحويل النقاط", href: "/student/transfer", icon: Users, roles: [ROLES.STUDENT] },
    { title: "كشف الحساب", href: "/student/statement", icon: BarChart3, roles: [ROLES.STUDENT] },
    { title: "سجلات النقاط", href: "/student/records", icon: Trophy, roles: [ROLES.STUDENT] },
    
    // Parent menu items
    { title: "أبنائي", href: "/parent/children", icon: Users, roles: [ROLES.PARENT] },
    { title: "كروت الحسم والاستبعاد", href: "/parent/children/deduction-cards", icon: AlertCircle, roles: [ROLES.PARENT], description: "عرض كروت الحسم لأبنائك" },
    { title: "المكافآت", href: "/parent/rewards", icon: Gift, roles: [ROLES.PARENT] },
    { title: "الحضور", href: "/parent/attendance", icon: Users, roles: [ROLES.PARENT] },
    { title: "سجلات النقاط", href: "/parent/records", icon: Trophy, roles: [ROLES.PARENT] },
    
    // Common menu items for all roles
    { title: "قائمة المتصدرين", href: "/leaderboard", icon: Award, roles: [ROLES.STUDENT, ROLES.PARENT, ROLES.TEACHER, ROLES.ADMIN] },
    // Temporarily hiding messages tab until it's fixed
    /*{
      title: "الرسائل",
      href: "/messages",
      icon: MessageSquare,
      roles: [ROLES.STUDENT, ROLES.PARENT, ROLES.TEACHER, ROLES.ADMIN],
      badge: unreadMessages > 0 ? unreadMessages.toString() : undefined,
    },*/
    {
      title: "الإشعارات",
      href: "/notifications",
      icon: Bell,
      roles: [ROLES.STUDENT, ROLES.PARENT, ROLES.TEACHER, ROLES.ADMIN],
      badge: unreadNotifications > 0 ? unreadNotifications.toString() : undefined,
    },
  ]

  // Add conditional rendering to show loading state and debug info
  if (isLoading) {
    return (
      <aside className="w-[280px] h-screen overflow-hidden bg-card border-l flex flex-col">
        <div className="p-4 flex items-center justify-between border-b">
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse"></div>
          <div className="h-6 w-24 bg-muted animate-pulse rounded"></div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {Array(10).fill(0).map((_, i) => (
            <div key={i} className="h-10 w-full bg-muted animate-pulse rounded-md mb-2"></div>
          ))}
        </div>
      </aside>
    )
  }

  if (error) {
    return (
      <aside className="w-[280px] h-screen overflow-hidden bg-card border-l flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <div className="text-destructive">خطأ</div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-destructive">{error}</p>
      </div>
      </aside>
    )
  }

  // Filter navigation items based on user role and search query
  const filteredNavItems = navItems.filter(item => {
    // Check if item is applicable to current user role
    const roleMatch = userRole !== null ? item.roles.includes(userRole) : false
    
    // If no search query, just check role match
    if (!searchQuery) return roleMatch
    
    // Otherwise check if search matches title or description
    const searchMatch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
    
    return roleMatch && searchMatch
  })

  return (
    <aside className={cn(
      "w-[260px] lg:w-[280px] h-screen max-h-[100dvh] overflow-hidden bg-card border-l flex flex-col",
      isCollapsed && "w-16 lg:w-20" // Reduce width when collapsed
    )}>
      {/* User profile and collapse button */}
      <div className="p-3 sm:p-4 flex items-center justify-between border-b">
        {!isCollapsed ? (
          <>
            <div className="flex items-center space-x-3 flex-row-reverse">
              <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              <div className="space-y-1 text-right">
                <p className="text-sm font-medium leading-none">{userName}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {ROLE_NAMES[userRole || 1]}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 flex-row-reverse">
              {onClose && (
                <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
                  <X className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCollapsed(true)}
                className="hidden lg:flex"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center w-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(false)}
              className="mt-2"
            >
              <ChevronLeft className="h-4 w-4" />
          </Button>
          </div>
        )}
        </div>

      {/* Search bar */}
        {!isCollapsed && (
        <div className="p-3 sm:p-4">
            <div className="relative">
            <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث..."
              className="pl-2 pr-8 h-9 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        )}

        <Separator />

      <div className="flex-1 overflow-auto p-2 sm:p-4">
        <nav className="grid gap-1 sm:gap-2">
          <TooltipProvider>
            {filteredNavItems.map((item) => (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm transition-all hover:bg-accent",
                      pathname === item.href ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                      isCollapsed && "justify-center px-1 sm:px-2",
                    )}
                  >
                    <div className={cn("flex items-center gap-2 sm:gap-3", isCollapsed && "justify-center")}>
                      <item.icon className={cn(
                        "h-4 w-4 sm:h-5 sm:w-5",
                      )} />
                      {!isCollapsed && <span className="line-clamp-1">{item.title}</span>}
                    </div>
                    {!isCollapsed && item.badge && (
                      <Badge variant="destructive" className="ml-auto text-xs">
                        {item.badge}
                      </Badge>
                    )}
                    {isCollapsed && item.badge && (
                      <Badge
                        variant="destructive"
                        className="absolute -right-1 -top-1 flex h-4 min-w-4 sm:h-5 sm:min-w-5 items-center justify-center rounded-full p-0 text-[10px] sm:text-xs"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                </TooltipTrigger>
                {isCollapsed && <TooltipContent side="left">{item.title}</TooltipContent>}
              </Tooltip>
            ))}
          </TooltipProvider>
          </nav>
        </div>

        <Separator />

      <div className={cn("p-3 sm:p-4", isCollapsed && "flex flex-col items-center")}>
          {!isCollapsed ? (
          <div className="mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
              <Avatar>
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              <div>
              <p className="text-xs sm:text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">
                  {userRole ? ROLE_NAMES[userRole] : ""}
                </p>
              </div>
            </div>
          ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="mb-3 sm:mb-4 cursor-pointer">
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="left">{userName}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          )}

        <nav className="grid gap-1 sm:gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/profile"
                  className={cn(
                    "flex items-center gap-2 sm:gap-3 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm transition-all hover:bg-accent",
                    pathname === "/profile" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                    isCollapsed && "justify-center px-1 sm:px-2",
                  )}
                >
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                  {!isCollapsed && <span>الملف الشخصي</span>}
                </Link>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent side="left">الملف الشخصي</TooltipContent>}
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/settings"
                  className={cn(
                    "flex items-center gap-2 sm:gap-3 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm transition-all hover:bg-accent",
                    pathname === "/settings" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                    isCollapsed && "justify-center px-1 sm:px-2",
                  )}
                >
                  <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                  {!isCollapsed && <span>الإعدادات</span>}
                </Link>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent side="left">الإعدادات</TooltipContent>}
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/api/auth/logout"
                  className={cn(
                    "flex items-center gap-2 sm:gap-3 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-red-500 transition-all hover:bg-red-100",
                    isCollapsed && "justify-center px-1 sm:px-2",
                  )}
                >
                  <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
                  {!isCollapsed && <span>تسجيل الخروج</span>}
                </Link>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent side="left">تسجيل الخروج</TooltipContent>}
            </Tooltip>
          </TooltipProvider>
          </nav>
      </div>
    </aside>
  )
} 