"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw } from "lucide-react"

export function DatabaseStatusAlert() {
  const [isVisible, setIsVisible] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    checkDatabaseFunctions()
  }, [])

  async function checkDatabaseFunctions() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Try calling each function and track which ones are missing
    const functions = [
      { name: "get_points_by_month", params: { user_id_param: user.id, months_count: 6 } },
      { name: "get_points_by_category", params: { user_id_param: user.id } },
      { name: "get_user_rank", params: { user_id_param: user.id } },
      { name: "calculate_user_points", params: { user_id_param: user.id } }
    ]

    let missingCount = 0

    for (const func of functions) {
      try {
        const { data, error } = await supabase.rpc(func.name, func.params)
        if (error && error.code === 'PGRST202') {
          // Function not found
          missingCount++
        }
      } catch {
        missingCount++
      }
    }

    // Show alert if more than one function is missing
    if (missingCount > 0) {
      setIsVisible(true)
    }
  }

  if (!isVisible) return null

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>لم يتم إكمال إعداد قاعدة البيانات بعد</AlertTitle>
      <AlertDescription className="mt-2">
        <p>هناك بعض الوظائف المفقودة في قاعدة البيانات. يرجى التواصل مع مسؤول النظام لتشغيل النصوص البرمجية اللازمة.</p>
        <p className="text-sm mt-2">يمكنك استخدام بعض وظائف النظام، ولكن قد تواجه بعض الأخطاء.</p>
        
        <div className="mt-3">
          <Button 
            variant="outline" 
            size="sm"
            className="bg-background" 
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="mr-2 h-3 w-3" />
            تحديث الصفحة
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
} 