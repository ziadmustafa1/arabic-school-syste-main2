"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"

export function FixNotificationsButton() {
  const [loading, setLoading] = useState(false)

  const handleFixNotifications = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/fix-notifications-schema')
      const result = await response.json()
      
      if (result.success) {
        toast({
          title: "تم بنجاح",
          description: "تم إصلاح قاعدة البيانات بنجاح، يرجى تحديث الصفحة",
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
    }
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleFixNotifications}
      disabled={loading}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          جاري الإصلاح...
        </>
      ) : (
        "إصلاح مشكلة الإشعارات"
      )}
    </Button>
  )
} 