"use client"

import { useState, useEffect } from "react"
import { getMyCards } from "@/app/actions/student"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { CreditCard, Loader2, Calendar, Tag } from "lucide-react"

interface RechargeCard {
  id: number
  code: string
  points: number
  is_used: boolean
  status: string
  valid_from: string
  valid_until: string | null
  category_id: number | null
  category?: {
    id: number
    name: string
    description: string | null
  }
}

export default function TeacherMyCardsPage() {
  const [cards, setCards] = useState<RechargeCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const result = await getMyCards()
      
      if (!result.success) {
        throw new Error(result.error)
      }
      
      setCards(result.data || [])
    } catch (error) {
      console.error("Error loading cards:", error)
      toast({
        title: "خطأ في تحميل البيانات",
        description: "حدث خطأ أثناء تحميل بيانات كروت الشحن الخاصة بك",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const isExpired = (card: RechargeCard) => {
    if (!card.valid_until) return false
    const now = new Date()
    return new Date(card.valid_until) < now
  }

  const isNotStarted = (card: RechargeCard) => {
    const now = new Date()
    return new Date(card.valid_from) > now
  }

  const isActive = (card: RechargeCard) => {
    return card.status === "active" && !isExpired(card) && !isNotStarted(card)
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">كروت الشحن الخاصة بي</h1>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : cards.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Card key={card.id} className={`overflow-hidden transition-all ${isActive(card) ? "" : "opacity-60"}`}>
              <div className={`h-2 ${card.is_used ? "bg-red-500" : isActive(card) ? "bg-green-500" : "bg-orange-500"}`} />
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="flex items-center gap-2 font-mono text-lg">
                    <CreditCard className="h-5 w-5" />
                    {card.code}
                  </CardTitle>
                  <span className="font-bold text-lg">{card.points} نقطة</span>
                </div>
                <CardDescription className="flex items-center gap-1 mt-1">
                  <Tag className="h-3.5 w-3.5" />
                  {card.category ? card.category.name : "بدون تصنيف"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">الحالة:</span>
                    <span className={`font-medium ${card.is_used ? "text-red-500" : isNotStarted(card) ? "text-orange-500" : isExpired(card) ? "text-red-500" : "text-green-500"}`}>
                      {card.is_used 
                        ? "تم استخدامه" 
                        : isNotStarted(card) 
                          ? "لم يبدأ بعد" 
                          : isExpired(card) 
                            ? "منتهي الصلاحية" 
                            : "متاح للاستخدام"}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> الصلاحية:
                    </span>
                    <span>
                      من {new Date(card.valid_from).toLocaleDateString("ar-EG")}
                    </span>
                  </div>
                  
                  {card.valid_until && (
                    <div className="flex justify-end text-sm">
                      <span>
                        إلى {new Date(card.valid_until).toLocaleDateString("ar-EG")}
                      </span>
                    </div>
                  )}
                  
                  {card.category?.description && (
                    <p className="text-sm text-muted-foreground mt-2 border-t pt-2">
                      {card.category.description}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="mt-4 text-lg">لا توجد كروت شحن مخصصة لك حالياً</p>
            <p className="text-muted-foreground">عندما يتم تخصيص كروت شحن لك، ستظهر هنا</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 