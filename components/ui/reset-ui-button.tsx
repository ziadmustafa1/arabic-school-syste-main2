"use client"

import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { forceResetUIState } from "@/lib/utils/focus-management"
import { useState } from "react"
import { toast } from "@/components/ui/use-toast"

interface ResetUIButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

export function ResetUIButton({
  variant = "outline",
  size = "sm",
  className
}: ResetUIButtonProps) {
  const [isResetting, setIsResetting] = useState(false)
  
  const handleReset = () => {
    setIsResetting(true)
    
    try {
      // Force reset UI state
      forceResetUIState()
      
      // Show success toast
      toast({
        title: "تم إعادة ضبط واجهة المستخدم",
        description: "تمت إعادة ضبط واجهة المستخدم بنجاح. إذا استمرت المشكلة، يرجى تحديث الصفحة.",
        variant: "default",
      })
    } catch (error) {
      console.error("Error resetting UI state:", error)
      
      // Show error toast
      toast({
        title: "حدث خطأ",
        description: "حدث خطأ أثناء إعادة ضبط واجهة المستخدم. يرجى تحديث الصفحة.",
        variant: "destructive",
      })
    } finally {
      setIsResetting(false)
    }
  }
  
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleReset}
      disabled={isResetting}
    >
      <RefreshCw 
        className={`h-4 w-4 ml-2 ${isResetting ? "animate-spin" : ""}`} 
      />
      إصلاح واجهة المستخدم
    </Button>
  )
} 