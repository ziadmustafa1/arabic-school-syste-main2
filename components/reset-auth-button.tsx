"use client"

import { useState } from "react"
import { resetAuth } from "@/lib/utils/reset-auth"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

/**
 * A component that provides a button to reset authentication state
 * Useful for troubleshooting login issues
 */
export function ResetAuthButton({ className }: { className?: string }) {
  const [isResetting, setIsResetting] = useState(false)

  const handleReset = async () => {
    if (isResetting) return
    
    setIsResetting(true)
    try {
      await resetAuth()
      // resetAuth will redirect the page if successful
    } catch (error) {
      console.error("Failed to reset auth:", error)
      setIsResetting(false)
      // If we get here, the redirect didn't happen
      alert("فشل في إعادة تعيين حالة تسجيل الدخول. يرجى المحاولة مرة أخرى.")
    }
  }

  return (
    <Button 
      variant="outline" 
      onClick={handleReset} 
      disabled={isResetting}
      className={className}
    >
      {isResetting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin ml-2" />
          جاري إعادة التعيين...
        </>
      ) : (
        "إعادة تعيين حالة تسجيل الدخول"
      )}
    </Button>
  )
} 