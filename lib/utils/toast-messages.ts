import { toast } from "@/components/ui/use-toast"

/**
 * Show a success toast notification
 */
export function showSuccessToast(title: string, description?: string) {
  toast({
    title,
    description,
    variant: "default",
  })
}

/**
 * Show an error toast notification
 */
export function showErrorToast(title: string, description?: string) {
  toast({
    title,
    description,
    variant: "destructive",
  })
}

/**
 * Show a confirmation toast notification for completed actions
 */
export function showActionSuccessToast(action: string, details?: string) {
  toast({
    title: `تم ${action} بنجاح 🎉`,
    description: details,
    variant: "default",
  })
}

/**
 * Show an error toast notification for failed actions
 */
export function showActionErrorToast(action: string, details?: string) {
  toast({
    title: `فشل ${action}`,
    description: details || "حدث خطأ أثناء تنفيذ العملية. الرجاء المحاولة مرة أخرى.",
    variant: "destructive",
  })
}

/**
 * Show a loading toast notification
 */
export function showLoadingToast(message: string) {
  return toast({
    title: "جاري التنفيذ...",
    description: message,
    duration: 5000,
  })
}

/**
 * Show a info toast notification
 */
export function showInfoToast(title: string, description?: string) {
  toast({
    title,
    description,
    variant: "default",
  })
} 