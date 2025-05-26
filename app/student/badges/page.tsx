"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Medal, BadgeAlert } from "lucide-react"
import { getUserBadges, getAllBadges } from "@/app/actions/badges"

interface Badge {
  id: number
  name: string
  description: string | null
  image_url: string | null
  min_points: number
  max_points: number
  badge_type: string
  awarded_at?: string
}

export default function BadgesPage() {
  const supabase = createClient()
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([])
  const [availableBadges, setAvailableBadges] = useState<Badge[]>([])
  const [userPoints, setUserPoints] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: user } = await supabase.auth.getUser()

        if (user && user.user) {
          // Get user's current points
          const { data: pointsData } = await supabase.rpc("get_user_points_balance", {
            user_id_param: user.user.id
          })
          
          setUserPoints(pointsData || 0)
          
          // Get user's badges
          const userBadgesResult = await getUserBadges(user.user.id)
          if (userBadgesResult.success) {
            setEarnedBadges(userBadgesResult.data)
          } else {
            toast({
              title: "خطأ في تحميل الشارات",
              description: userBadgesResult.message,
              variant: "destructive",
            })
          }
          
          // Get all available badges
          const allBadgesResult = await getAllBadges()
          if (allBadgesResult.success) {
            // Filter out badges the user already has
            const earnedBadgeIds = userBadgesResult.success ? 
              userBadgesResult.data.map(badge => badge.id) : []
            
            const notEarnedBadges = allBadgesResult.data.filter(
              badge => !earnedBadgeIds.includes(badge.id)
            )
            
            setAvailableBadges(notEarnedBadges)
          }
        }
      } catch (error) {
        console.error("Error fetching badges:", error)
        toast({
          title: "خطأ في تحميل البيانات",
          description: "حدث خطأ أثناء تحميل الشارات. يرجى المحاولة مرة أخرى.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [supabase])

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="mt-2">جاري تحميل الشارات...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-2">الشارات والإنجازات</h1>
      <p className="text-muted-foreground mb-6">
        اجمع الشارات لإظهار إنجازاتك وتقدمك في المدرسة. رصيدك الحالي: {userPoints} نقطة
      </p>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">شاراتك المكتسبة</h2>
        {earnedBadges.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {earnedBadges.map((badge) => (
            <Card key={badge.id} className="overflow-hidden">
              <div className="aspect-square w-full bg-muted flex items-center justify-center p-6">
                {badge.image_url ? (
                  <img
                    src={badge.image_url || "/placeholder.svg"}
                    alt={badge.name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Medal className="h-16 w-16 text-primary" />
                )}
              </div>
              <CardHeader>
                <CardTitle>{badge.name}</CardTitle>
                <CardDescription>
                    تم الحصول عليها في {new Date(badge.awarded_at as string).toLocaleDateString("ar-SA")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p>{badge.description || "لا يوجد وصف متاح"}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  نوع الشارة: {badge.badge_type === "achievement" ? "إنجاز" : "مستوى"}
                </p>
                  <p className="text-sm text-muted-foreground">
                    الحد الأدنى من النقاط: {badge.min_points} نقطة
                  </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center p-8">
          <CardContent>
            <Medal className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="mt-4 text-lg">لا توجد شارات مكتسبة حالياً</p>
            <p className="text-muted-foreground">استمر في اكتساب النقاط للحصول على شارات وإنجازات</p>
          </CardContent>
        </Card>
      )}
      </div>

      <Separator className="my-6" />

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">شارات يمكنك الحصول عليها</h2>
        {availableBadges.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {availableBadges.map((badge) => (
              <Card key={badge.id} className="overflow-hidden border-dashed">
                <div className="aspect-square w-full bg-muted/50 flex items-center justify-center p-6">
                  <BadgeAlert className="h-16 w-16 text-muted-foreground/70" />
                </div>
                <CardHeader>
                  <CardTitle>{badge.name}</CardTitle>
                  <CardDescription>
                    تبقى {badge.min_points - userPoints} نقطة للحصول عليها
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p>{badge.description || "لا يوجد وصف متاح"}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    نوع الشارة: {badge.badge_type === "achievement" ? "إنجاز" : "مستوى"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    الحد الأدنى من النقاط: {badge.min_points} نقطة
                  </p>
                  <div className="mt-2 w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ 
                        width: `${Math.min(100, (userPoints / badge.min_points) * 100)}%` 
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center p-8">
            <CardContent>
              <BadgeAlert className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="mt-4 text-lg">لقد حصلت على جميع الشارات المتاحة!</p>
              <p className="text-muted-foreground">تهانينا على هذا الإنجاز الرائع</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">كيفية الحصول على الشارات</h2>
        <Card>
          <CardContent className="p-6">
            <ul className="list-disc list-inside space-y-2 pr-4">
              <li>شارات المستوى: تُمنح عند الوصول إلى عدد معين من النقاط</li>
              <li>شارات الإنجاز: تُمنح عند إكمال مهام أو تحديات محددة</li>
              <li>يمكنك عرض الشارات في ملفك الشخصي</li>
              <li>بعض الشارات تمنحك مزايا خاصة في النظام</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
