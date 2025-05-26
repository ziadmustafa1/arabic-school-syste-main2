"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { useRouter } from 'next/navigation'
import { syncUserPointsBalance } from "@/lib/actions/update-points-balance"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { showActionSuccessToast, showActionErrorToast } from "@/lib/utils/toast-messages"

interface PointsSyncButtonProps {
  userId: string
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  label?: string
  showSuccessToast?: boolean
  confirmDialog?: boolean
  id?: string
}

export function PointsSyncButton({
  userId,
  variant = "outline",
  size = "sm",
  className = "",
  label = "تحديث النقاط",
  showSuccessToast = true,
  confirmDialog = false,
  id
}: PointsSyncButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const router = useRouter()

  const performSync = async () => {
    if (!userId) {
      toast({
        title: "خطأ",
        description: "لم يتم العثور على معرف المستخدم",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      // Use server action with forceRefresh to invalidate cache
      const result = await syncUserPointsBalance(userId, true)
      
      if (!result.success) {
        throw new Error(result.message || "فشل تحديث النقاط")
      }
      
      if (showSuccessToast) {
        showActionSuccessToast(
          "تحديث النقاط",
          result.message || `تم تحديث رصيد النقاط (${result.data?.points} نقطة)`
        )
      }
      
      // Refresh the page to show updated data
      router.refresh()
    } catch (error: any) {
      showActionErrorToast(
        "تحديث النقاط",
        error.message || "حدث خطأ أثناء تحديث النقاط. يرجى المحاولة مرة أخرى لاحقاً."
      )
    } finally {
      setIsLoading(false)
      setShowConfirmation(false)
    }
  }

  const handleClick = () => {
    if (confirmDialog) {
      setShowConfirmation(true)
    } else {
      performSync()
    }
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleClick}
        disabled={isLoading}
        id={id}
      >
        {isLoading ? "جاري التحديث..." : label}
      </Button>
      
      {confirmDialog && (
        <ConfirmationDialog
          open={showConfirmation}
          onOpenChange={setShowConfirmation}
          title="تأكيد تحديث النقاط"
          description="هل أنت متأكد من رغبتك في تحديث رصيد النقاط؟ سيتم حساب الرصيد بناءً على جميع المعاملات."
          confirmText="تحديث النقاط"
          onConfirm={performSync}
          isLoading={isLoading}
        />
      )}
    </>
  )
} 