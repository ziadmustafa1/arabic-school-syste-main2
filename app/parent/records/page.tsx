"use client"

import { useState, useEffect } from "react"
import { getCurrentUser } from "@/lib/utils/auth-compat"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { ar } from "date-fns/locale"

export default function ParentRecordsPage() {
  const [user, setUser] = useState<any>(null)
  const [records, setRecords] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        
        // Get current user
        const userData = await getCurrentUser()
        if (!userData) {
          return
        }
        
        setUser(userData)
        
        // Get parent's children
        const { data: childrenData, error: childrenError } = await supabase
          .from("parent_children")
          .select("*, children:child_id(*)")
          .eq("parent_id", userData.id)
        
        if (childrenError) {
          console.error("Error fetching children:", childrenError)
          toast({
            title: "خطأ في تحميل البيانات",
            description: "حدث خطأ أثناء محاولة تحميل بيانات الأبناء",
            variant: "destructive",
          })
          return
        }
        
        // For this example, we'll just use a placeholder for records
        // In a real implementation, you'd fetch actual records related to the parent
        // such as messages sent/received, parent meetings, etc.
        setRecords([
          {
            id: 1,
            type: "message",
            title: "رسالة من المعلم",
            date: new Date(),
            details: "تم إرسال رسالة من معلم اللغة العربية"
          },
          {
            id: 2,
            type: "meeting",
            title: "اجتماع أولياء الأمور",
            date: new Date(),
            details: "تم حضور اجتماع أولياء الأمور الدوري"
          }
        ])
        
      } catch (error) {
        console.error("Error loading records data:", error)
        toast({
          title: "خطأ في تحميل البيانات",
          description: "حدث خطأ أثناء محاولة تحميل بيانات السجلات",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    loadData()
  }, [supabase])
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">سجلاتي</h1>
      </div>

      <div className="rounded-lg border shadow-sm">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">سجل النشاطات الأخيرة</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="p-3 text-right font-medium">التاريخ</th>
                <th className="p-3 text-right font-medium">النوع</th>
                <th className="p-3 text-right font-medium">العنوان</th>
                <th className="p-3 text-right font-medium">التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {records.length > 0 ? (
                records.map((record) => (
                  <tr key={record.id} className="border-b hover:bg-muted/50">
                    <td className="p-3 text-sm">
                      {format(new Date(record.date), "PPP", { locale: ar })}
                    </td>
                    <td className="p-3 text-sm">
                      {record.type === "message" ? "رسالة" : "اجتماع"}
                    </td>
                    <td className="p-3 text-sm font-medium">
                      {record.title}
                    </td>
                    <td className="p-3 text-sm">
                      {record.details}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-muted-foreground">
                    لا توجد سجلات حتى الآن
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
} 