"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { getUserDeductionCards } from "@/lib/actions/deduction-cards"
import { getCurrentUser } from "@/lib/utils/auth-compat"
import { useRouter } from "next/navigation"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, Clock, RefreshCw, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

interface DeductionCard {
  id: string
  name: string
  color: string | null
  description: string | null
  negative_points_threshold: number
  deduction_percentage: number
  active_duration_days: number
  active_duration_hours: number
  is_active: boolean
  user_deduction_card_id: string
  negative_points_count: number
  activated_at: string | null
  expires_at: string | null
  is_card_active: boolean
}

export default function StudentDeductionCardsPage() {
  const [cards, setCards] = useState<DeductionCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadUserAndData() {
      try {
        // Get current user with auth-compat helper
        const userData = await getCurrentUser()
        if (!userData) {
          router.push('/auth/login')
          return
        }
        
        setUser(userData)
        await fetchUserDeductionCards(userData.id)
      } catch (error) {
        console.error("Error in loadUserAndData:", error)
        setError("فشل تحميل بيانات المستخدم")
        setIsLoading(false)
      }
    }
    
    loadUserAndData()
  }, [router])

  const fetchUserDeductionCards = async (userId: string) => {
    if (!userId) {
      console.error("fetchUserDeductionCards: No user ID provided")
      setError("معرف المستخدم غير متوفر")
      setIsLoading(false)
      return
    }
    
    try {
      setIsLoading(true)
      setError(null)
      
      console.log("Fetching deduction cards for user:", userId)
      
      // Use server action to fetch data
      const result = await getUserDeductionCards(userId)
      console.log("Server action result:", result.success, result.message)
      
      if (!result.success) {
        console.error("Error from server action:", result.error)
        setError(result.message || "حدث خطأ أثناء جلب كروت الحسم")
        return
      }

      // Set cards data
      setCards(result.data || [])
      console.log(`Loaded ${result.data?.length || 0} deduction cards`)
    } catch (error) {
      console.error("Error fetching deduction cards:", error)
      setError("حدث خطأ أثناء استرداد بيانات كروت الحسم")
    } finally {
      setIsLoading(false)
    }
  }

  const getCardStatus = (card: DeductionCard) => {
    if (!card.is_card_active) {
      return { text: "غير نشط", variant: "secondary" }
    }
    
    if (card.activated_at && card.expires_at) {
      const now = new Date()
      const expiryDate = new Date(card.expires_at)
      
      if (now > expiryDate) {
        return { text: "منتهي", variant: "secondary" }
      } else {
        return { text: "نشط", variant: "destructive" }
      }
    }
    
    return { text: "معلق", variant: "warning" }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "غير محدد"
    return format(new Date(dateString), "d MMMM yyyy, h:mm a", { locale: ar })
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <div className="text-center">
          <p className="text-lg font-medium">جاري تحميل كروت الحسم...</p>
          <p className="text-sm text-muted-foreground mt-2">قد تستغرق العملية عدة ثوان</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container max-w-6xl py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">كروت الحسم والاستبعاد</h1>
          <p className="text-muted-foreground">عرض كروت الحسم المخصصة لك</p>
        </div>
        
        <Card className="mb-8">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
            <p className="mb-2 text-xl font-medium text-center">خطأ في جلب البيانات</p>
            <p className="mb-4 text-center text-muted-foreground">
              {error}
            </p>
            <Button onClick={() => user && fetchUserDeductionCards(user.id)} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              إعادة المحاولة
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-6xl py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">كروت الحسم والاستبعاد</h1>
        <p className="text-muted-foreground">عرض كروت الحسم المخصصة لك</p>
      </div>

      {cards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <CheckCircle className="mb-4 h-10 w-10 text-green-500" />
            <p className="mb-2 text-xl font-medium">لا توجد كروت حسم</p>
            <p className="mb-4 text-center text-muted-foreground">
              ليس لديك أي كروت حسم حالياً. استمر في الحفاظ على السلوك الإيجابي!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {cards.map((card) => {
            const status = getCardStatus(card)
            
            return (
              <Card key={card.user_deduction_card_id} className="overflow-hidden">
                <div 
                  className="h-2 w-full" 
                  style={{ backgroundColor: card.color || '#000000' }}
                />
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{card.name}</CardTitle>
                    <Badge variant={status.variant as any}>{status.text}</Badge>
                  </div>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <h4 className="font-medium">تفاصيل الكرت</h4>
                      <div className="grid grid-cols-2 gap-1 text-sm">
                        <span className="text-muted-foreground">نسبة الحسم:</span>
                        <span>{card.deduction_percentage}%</span>
                        <span className="text-muted-foreground">النقاط السلبية المطلوبة:</span>
                        <span>{card.negative_points_threshold}</span>
                        <span className="text-muted-foreground">مدة النشاط:</span>
                        <span>
                          {card.active_duration_days} يوم 
                          {card.active_duration_hours > 0 ? ` و ${card.active_duration_hours} ساعة` : ''}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">معلومات التفعيل</h4>
                      <div className="grid grid-cols-2 gap-1 text-sm">
                        <span className="text-muted-foreground">النقاط السلبية الحالية:</span>
                        <span>{card.negative_points_count}</span>
                        <span className="text-muted-foreground">تاريخ التفعيل:</span>
                        <span>{formatDate(card.activated_at)}</span>
                        <span className="text-muted-foreground">تاريخ الانتهاء:</span>
                        <span>{formatDate(card.expires_at)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                
                {card.is_card_active && card.activated_at && card.expires_at && new Date() < new Date(card.expires_at) && (
                  <CardFooter className="bg-muted/50 border-t p-3">
                    <div className="flex items-center text-sm">
                      <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>
                        ينتهي في {formatDate(card.expires_at)}
                      </span>
                    </div>
                  </CardFooter>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
} 