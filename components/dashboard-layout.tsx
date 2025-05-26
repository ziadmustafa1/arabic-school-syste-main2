"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import FallbackPage from "@/app/fallback-page"
import { AppLogo } from "@/components/app-logo"
import { cn } from "@/lib/utils"
import { ROLE_NAMES } from "@/lib/constants"
import { Sidebar } from "@/components/sidebar"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"

// Fallback data in case of errors
const FALLBACK_DATA = {
  user: { role_id: 1, full_name: "Guest User" },
  notifications: { count: 0 },
  messages: { count: 0 }
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  // State for loading and data
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userData, setUserData] = useState({
    role: 1,
    name: "",
    initials: "",
    notifications: 0,
    messages: 0
  })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const supabase = createClient()
  
  // Load data on component mount
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true)
        
        // Get current user session
        const { data: sessionData } = await supabase.auth.getSession()
        
        if (!sessionData.session) {
          setError("يجب تسجيل الدخول أولاً")
          applyFallbackData()
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
          applyFallbackData()
          return
        }
        
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
        
        // Generate initials
        const nameParts = userData.full_name.split(" ")
        const initials = nameParts.length > 1
          ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
          : userData.full_name.substring(0, 2)
          
        setUserData({
          role: userData.role_id,
          name: userData.full_name,
          initials: initials.toUpperCase(),
          notifications: notificationsCount || 0,
          messages: messagesCount || 0
        })
      } catch (err) {
        console.error("Error loading dashboard:", err)
        setError("An unexpected error occurred")
        applyFallbackData()
      } finally {
        // Always set loading to false when done
        setIsLoading(false)
      }
    }
    
    const applyFallbackData = () => {
      const nameParts = FALLBACK_DATA.user.full_name.split(" ")
      const initials = nameParts.length > 1
        ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
        : FALLBACK_DATA.user.full_name.substring(0, 2)
        
      setUserData({
        role: FALLBACK_DATA.user.role_id,
        name: FALLBACK_DATA.user.full_name,
        initials: initials.toUpperCase(),
        notifications: FALLBACK_DATA.notifications.count,
        messages: FALLBACK_DATA.messages.count
      })
    }
    
    // Close sidebar on mobile when route changes
    const handleRouteChange = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false)
      }
    }

    // Close sidebar on mobile when window resizes
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }

    // Set initial state based on window size
    if (typeof window !== 'undefined') {
      setSidebarOpen(window.innerWidth >= 1024)
      window.addEventListener('resize', handleResize)
    }
    
    // Load the data
    loadDashboardData()
    
    // Cleanup
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize)
      }
    }
  }, [supabase])
  
  if (isLoading) {
    return <FallbackPage loading={true} />
  }
  
  if (error) {
    return <FallbackPage error={error} />
  }
  
  return (
    <TooltipProvider>
      <div className="min-h-screen max-h-[100dvh] bg-background flex rtl">
        {/* Sidebar - absolute on mobile and fixed on desktop */}
        <div className={cn(
          "fixed inset-y-0 right-0 z-50 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:relative lg:z-20",
          "w-[260px] lg:w-[280px]",
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        )}>
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>
        
        {/* Overlay to close sidebar on mobile */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Main content - with margin only on desktop */}
        <div className={cn(
          "flex-1 flex flex-col min-h-screen max-h-[100dvh] overflow-hidden",
          "transition-all duration-200 ease-in-out",
          sidebarOpen ? "lg:mr-[280px]" : ""
        )}>
          <header className="sticky top-0 z-30 border-b bg-card p-2 sm:p-4">
            <div className="container mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="lg:hidden h-11 w-11 min-h-[44px] min-w-[44px]"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  {sidebarOpen ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                  <span className="sr-only">Toggle Menu</span>
                </Button>
                <AppLogo />
              </div>
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="text-xs sm:text-sm">
                  <span className="font-semibold">{userData.name}</span>
                  <span className="ml-2 text-muted-foreground hidden sm:inline">
                    {ROLE_NAMES[userData.role]}
                  </span>
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto p-2 sm:p-4 pb-16 sm:pb-4">
              {children}
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}
