"use client"

import { useEffect } from "react"
import { logout } from "@/lib/actions/auth"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

export default function LogoutPage() {
  const router = useRouter()

  useEffect(() => {
    const handleLogout = async () => {
      try {
        // First, call the server action to log out
        const result = await logout()
        // If execution continues here, logout didn't redirect properly
        // Fall back to client-side redirect
        router.push("/auth/login")
      } catch (error) {
        console.error("Logout error:", error)
        // If there's an error, redirect to login page
        router.push("/auth/login")
      }
    }
    
    handleLogout()
  }, [router])
  
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-muted/10">
      <div className="flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <h2 className="text-lg font-medium">جاري تسجيل الخروج...</h2>
        <p className="text-sm text-muted-foreground">
          سيتم توجيهك إلى صفحة تسجيل الدخول خلال لحظات
        </p>
      </div>
    </div>
  )
}
