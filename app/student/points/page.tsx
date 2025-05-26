"use client"

import { useState, useEffect } from "react"
import { getCurrentUser } from "@/lib/utils/auth-compat"
import { createClient } from "@/lib/supabase/client"
import { Loader2, RefreshCw, ArrowRight } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { PointsSyncButton } from "@/app/components/points-sync-button"
import { showInfoToast, showActionSuccessToast, showErrorToast, showActionErrorToast } from "@/lib/utils/toast-messages"
import { Button } from "@/components/ui/button"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"

// Define simple types for database tables
interface StudentPoints {
  id?: number;
  student_id: string;
  points: number;
}

export default function StudentPointsPage() {
  const [user, setUser] = useState<any>(null)
  const [points, setPoints] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [showRefreshConfirm, setShowRefreshConfirm] = useState(false)
  const [historyLoadingState, setHistoryLoadingState] = useState<boolean>(false)
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
        
        // Get points balance with explicit typing
        const { data, error } = await supabase
          .from("student_points") // Use any to avoid TypeScript errors without proper database typing
          .select("points")
          .eq("student_id", userData.id)
          .single() as { data: StudentPoints | null, error: any }
        
        if (!error && data) {
          setPoints(data.points)
          showInfoToast(
            "رصيد النقاط",
            `رصيدك الحالي: ${data.points} نقطة`
          )
        } else {
          console.error("Error fetching points:", error)
          toast({
            title: "خطأ في تحميل البيانات",
            description: "حدث خطأ أثناء محاولة تحميل بيانات النقاط",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error loading points data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadData()
  }, [supabase])
  
  const handleShowHistory = () => {
    setHistoryLoadingState(true)
    showActionSuccessToast("تحميل", "جاري تحميل سجل المعاملات...")
    
    // Simulate loading time
    setTimeout(() => {
      setHistoryLoadingState(false)
      showInfoToast(
        "سجل المعاملات",
        "سيتم تفعيل هذه الميزة قريبًا"
      )
    }, 1500)
  }
  
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
        <h1 className="text-2xl font-bold">النقاط</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="default" 
            onClick={() => setShowRefreshConfirm(true)}
          >
            <RefreshCw className="h-4 w-4 ml-2" />
            تحديث الرصيد
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.history.back()}>
            <ArrowRight className="h-4 w-4 ml-2" />
            العودة
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="rounded-lg border p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-2">رصيد النقاط الحالي</h2>
          <p className="text-3xl font-bold">{points} نقطة</p>
          <div className="mt-4">
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleShowHistory}
              disabled={historyLoadingState}
            >
              {historyLoadingState ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  جاري التحميل...
                </>
              ) : (
                "عرض سجل المعاملات"
              )}
            </Button>
          </div>
        </div>
        
        <div className="rounded-lg border p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-2">معلومات عن النقاط</h2>
          <ul className="list-disc mr-5 space-y-1 text-sm">
            <li>يمكنك الحصول على النقاط من خلال المشاركة في الأنشطة المدرسية</li>
            <li>كل نشاط يمنحك عدد مختلف من النقاط حسب أهميته</li>
            <li>احرص على تجميع أكبر عدد من النقاط للحصول على مكافآت قيمة</li>
            <li>ترقب الفعاليات والمسابقات لكسب المزيد من النقاط</li>
          </ul>
        </div>
        
        <div className="rounded-lg border p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-2">استخدامات النقاط</h2>
          <ul className="list-disc mr-5 space-y-1 text-sm">
            <li>استبدال النقاط بمكافآت من قسم المكافآت</li>
            <li>تسديد النقاط السلبية</li>
            <li>التبرع بالنقاط لزملائك</li>
            <li>الحصول على امتيازات خاصة</li>
          </ul>
        </div>
      </div>

      <div className="rounded-lg border p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">معلومات حول نظام النقاط</h2>
        <ul className="list-disc mr-5 space-y-2">
          <li>يمكنك الحصول على النقاط من خلال حضور الدروس والمشاركة في الأنشطة</li>
          <li>يمكنك استخدام النقاط لشراء المكافآت من قسم المكافآت</li>
          <li>يمكنك تحويل النقاط إلى طلاب آخرين من خلال قسم تحويل النقاط</li>
          <li>يمكنك شحن رصيدك باستخدام بطاقات الشحن من قسم بطاقات الشحن</li>
        </ul>
      </div>
      
      {/* Confirmation Dialog for Refresh */}
      <ConfirmationDialog
        open={showRefreshConfirm}
        onOpenChange={setShowRefreshConfirm}
        title="تأكيد تحديث الرصيد"
        description="هل أنت متأكد من رغبتك في تحديث رصيد النقاط؟"
        confirmText="تحديث الرصيد"
        onConfirm={() => {
          if (!user) return
          showActionSuccessToast("تحديث", "جاري تحديث رصيد النقاط...")
          setShowRefreshConfirm(false)
          // Let the PointsSyncButton handle it - we just need to click it programmatically
          document.getElementById("hidden-sync-button")?.click()
        }}
      />
      
      {/* Hidden sync button */}
      <div className="hidden">
        {user && (
          <PointsSyncButton 
            userId={user.id} 
            id="hidden-sync-button"
          />
        )}
      </div>
    </div>
  )
} 