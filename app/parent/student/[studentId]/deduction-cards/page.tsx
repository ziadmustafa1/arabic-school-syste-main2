"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { useParams } from "next/navigation"
import Link from "next/link"

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
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle, Clock, ChevronRight } from "lucide-react"
import { Loading } from "@/components/ui/loading"
import { toast } from "sonner"

interface DeductionCard {
  id: string
  name: string
  color: string
  description: string
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

interface StudentInfo {
  id: string
  name: string
  avatar_url?: string
}

export default function ParentStudentDeductionCardsPage() {
  const [cards, setCards] = useState<DeductionCard[]>([])
  const [student, setStudent] = useState<StudentInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [schemaError, setSchemaError] = useState<string | null>(null)
  const params = useParams()
  const studentId = params.studentId as string
  const supabase = createClient()

  useEffect(() => {
    if (studentId) {
      fetchStudentInfo()
      fetchStudentDeductionCards()
    }
  }, [studentId])

  const fetchStudentInfo = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, avatar_url")
        .eq("id", studentId)
        .single()

      if (error) throw error
      setStudent(data)
    } catch (error) {
      console.error("Error fetching student info:", error)
      toast.error("حدث خطأ أثناء استرداد بيانات الطالب")
    }
  }

  const fetchStudentDeductionCards = async () => {
    try {
      setIsLoading(true)
      setSchemaError(null)
      
      const { data, error } = await supabase
        .from("user_deduction_cards")
        .select(`
          id,
          negative_points_count,
          activated_at,
          expires_at,
          is_active,
          deduction_cards:deduction_card_id(
            id,
            name,
            color,
            description,
            negative_points_threshold,
            deduction_percentage,
            active_duration_days,
            active_duration_hours,
            is_active
          )
        `)
        .eq("user_id", studentId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Full error details:", error)
        if (error.code === "42P01" || error.message?.includes("relation") || error.message?.includes("does not exist")) {
          setSchemaError("لا يمكن الوصول إلى بيانات كروت الحسم. يرجى التواصل مع إدارة النظام.")
        } else {
          throw new Error(`خطأ في قاعدة البيانات: ${error.message || error.code || "غير معروف"}`)
        }
      }

      // Transform the data to make it easier to use
      const transformedCards = data?.map(card => ({
        id: card.deduction_cards.id,
        name: card.deduction_cards.name,
        color: card.deduction_cards.color,
        description: card.deduction_cards.description,
        negative_points_threshold: card.deduction_cards.negative_points_threshold,
        deduction_percentage: card.deduction_cards.deduction_percentage,
        active_duration_days: card.deduction_cards.active_duration_days,
        active_duration_hours: card.deduction_cards.active_duration_hours,
        is_active: card.deduction_cards.is_active,
        user_deduction_card_id: card.id,
        negative_points_count: card.negative_points_count,
        activated_at: card.activated_at,
        expires_at: card.expires_at,
        is_card_active: card.is_active
      })) || []
      
      setCards(transformedCards)
    } catch (error) {
      console.error("Error fetching deduction cards:", error)
      toast.error(`حدث خطأ أثناء استرداد بيانات كروت الحسم: ${error.message || "خطأ غير معروف"}`)
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
    return <Loading text="جاري تحميل كروت الحسم..." />
  }

  if (schemaError) {
    return (
      <div className="container max-w-6xl py-6">
        <div className="mb-4 flex items-center">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/parent/student/${studentId}`}>
              <ChevronRight className="mr-1 h-4 w-4" />
              العودة للطالب
            </Link>
          </Button>
        </div>
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            كروت الحسم والاستبعاد {student && `للطالب ${student.name}`}
          </h1>
          <p className="text-muted-foreground">عرض كروت الحسم المخصصة للطالب</p>
        </div>
        
        <Card className="mb-8">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
            <p className="mb-2 text-xl font-medium text-center">خطأ في قاعدة البيانات</p>
            <p className="mb-4 text-center text-muted-foreground">
              {schemaError}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-6xl py-6">
      <div className="mb-4 flex items-center">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/parent/student/${studentId}`}>
            <ChevronRight className="mr-1 h-4 w-4" />
            العودة للطالب
          </Link>
        </Button>
      </div>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          كروت الحسم والاستبعاد {student && `للطالب ${student.name}`}
        </h1>
        <p className="text-muted-foreground">عرض كروت الحسم المخصصة للطالب</p>
      </div>

      {cards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <CheckCircle className="mb-4 h-10 w-10 text-green-500" />
            <p className="mb-2 text-xl font-medium">لا توجد كروت حسم</p>
            <p className="mb-4 text-center text-muted-foreground">
              ليس لدى الطالب أي كروت حسم حالياً. استمر في تشجيعه على السلوك الإيجابي!
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