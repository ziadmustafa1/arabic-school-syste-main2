"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Medal, Info, Award, Trophy, Sparkles, Crown } from "lucide-react"
import { getUserMedals, getAllMedals } from "@/app/actions/medals"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Medal {
  id: number
  name: string
  description: string | null
  image_url: string | null
  min_points: number
  max_points: number
  awarded_at?: string
}

// Medal color mapping based on point thresholds
const getMedalColor = (minPoints: number) => {
  if (minPoints >= 5000) return { bg: "bg-gradient-to-r from-purple-500 to-blue-500", text: "text-white", icon: "text-yellow-300" };
  if (minPoints >= 2000) return { bg: "bg-gradient-to-r from-amber-500 to-yellow-500", text: "text-white", icon: "text-yellow-300" };
  if (minPoints >= 1000) return { bg: "bg-gradient-to-r from-gray-400 to-gray-300", text: "text-gray-800", icon: "text-gray-100" };
  return { bg: "bg-gradient-to-r from-amber-700 to-amber-600", text: "text-white", icon: "text-amber-200" };
};

// Medal icon based on tier
const getMedalIcon = (minPoints: number, className = "h-6 w-6") => {
  if (minPoints >= 5000) return <Crown className={className} />;
  if (minPoints >= 2000) return <Trophy className={className} />;
  if (minPoints >= 1000) return <Medal className={className} />;
  return <Medal className={className} />;
};

export default function TeacherMedalsPage() {
  const supabase = createClient()
  const [earnedMedals, setEarnedMedals] = useState<Medal[]>([])
  const [availableMedals, setAvailableMedals] = useState<Medal[]>([])
  const [userPoints, setUserPoints] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: user } = await supabase.auth.getUser()

        if (user && user.user) {
          // Get user's current points
          const { data: pointsData, error: pointsError } = await supabase.rpc("get_user_points_balance", {
            user_id_param: user.user.id
          })
          
          if (pointsData !== null && !pointsError) {
            setUserPoints(pointsData)
          } else {
            console.error("Error fetching points balance:", pointsError)
            // Fallback to manual calculation
            const { data: transactions, error: txError } = await supabase
              .from("points_transactions")
              .select("points, is_positive")
              .eq("user_id", user.user.id)

            if (!txError && transactions) {
              const total = transactions.reduce((sum, tx) => 
                tx.is_positive ? sum + tx.points : sum - tx.points, 0)
              setUserPoints(total)
            }
          }
          
          // Get user's medals
          const userMedalsResult = await getUserMedals(user.user.id)
          if (userMedalsResult.success) {
            setEarnedMedals(userMedalsResult.data)
          } else {
            toast({
              title: "خطأ في تحميل الميداليات",
              description: userMedalsResult.message,
              variant: "destructive",
            })
          }
          
          // Get all available medals
          const allMedalsResult = await getAllMedals()
          if (allMedalsResult.success) {
            // Filter out medals the user already has
            const earnedMedalIds = userMedalsResult.success ? 
              userMedalsResult.data.map(medal => medal.id) : []
            
            const notEarnedMedals = allMedalsResult.data.filter(
              medal => !earnedMedalIds.includes(medal.id)
            )
            
            setAvailableMedals(notEarnedMedals)
          }
        }
      } catch (error) {
        console.error("Error fetching medals data:", error)
        toast({
          title: "خطأ في تحميل البيانات",
          description: "حدث خطأ أثناء تحميل بيانات الميداليات",
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
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="mr-2">جاري التحميل...</span>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <Medal className="ml-2 h-8 w-8 text-primary" />
        الميداليات والأوسمة
      </h1>
      
      {/* Stats Cards */}
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mb-10">
        <Card className="shadow-md overflow-hidden border-primary/20">
          <CardHeader className="pb-3 bg-gradient-to-r from-amber-100 to-amber-50">
            <CardTitle className="text-lg font-bold flex items-center">
              <Trophy className="h-5 w-5 ml-2 text-amber-500" />
              نقاطي الحالية
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-primary">{userPoints}</div>
            <p className="text-sm text-muted-foreground mt-1">إجمالي النقاط المكتسبة</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-md overflow-hidden border-primary/20">
          <CardHeader className="pb-3 bg-gradient-to-r from-blue-100 to-blue-50">
            <CardTitle className="text-lg font-bold flex items-center">
              <Medal className="h-5 w-5 ml-2 text-blue-500" />
              ميدالياتي
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-primary">{earnedMedals.length}</div>
            <p className="text-sm text-muted-foreground mt-1">الميداليات التي حصلت عليها</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-md overflow-hidden border-primary/20">
          <CardHeader className="pb-3 bg-gradient-to-r from-purple-100 to-purple-50">
            <CardTitle className="text-lg font-bold flex items-center">
              <Sparkles className="h-5 w-5 ml-2 text-purple-500" />
              الميداليات المتاحة
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-primary">{availableMedals.length}</div>
            <p className="text-sm text-muted-foreground mt-1">الميداليات التي يمكن الحصول عليها</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Earned Medals Section */}
      <div className="space-y-10">
        <div>
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <Medal className="ml-2 h-6 w-6 text-blue-500" />
            ميدالياتي
          </h2>
          
          {earnedMedals.length === 0 ? (
            <Card className="bg-muted/50 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Info className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-xl font-medium text-center mb-2">
                  لم تحصل على أي ميداليات بعد
                </p>
                <p className="text-muted-foreground text-center max-w-md mb-4">
                  استمر في المشاركة والتفاعل مع النظام للحصول على ميداليات وأوسمة
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {earnedMedals.map((medal) => {
                const medalColor = getMedalColor(medal.min_points);
                return (
                  <Card 
                    key={medal.id} 
                    className="overflow-hidden shadow-md hover:shadow-lg transition-shadow border-2 border-primary/10"
                  >
                    <div className={cn("aspect-square w-full flex items-center justify-center p-6", medalColor.bg)}>
                      {medal.image_url ? (
                        <img
                          src={medal.image_url}
                          alt={medal.name}
                          className="h-28 w-28 object-contain"
                        />
                      ) : (
                        getMedalIcon(medal.min_points, "h-28 w-28 " + medalColor.icon)
                      )}
                    </div>
                    <CardHeader className={cn("pb-0 border-t", medalColor.bg, medalColor.text)}>
                      <Badge variant="outline" className="mb-1 bg-white/90 text-gray-800 self-start">
                        {medal.min_points} نقطة
                      </Badge>
                      <CardTitle className="text-xl">{medal.name}</CardTitle>
                      {medal.awarded_at && (
                        <CardDescription className={cn("text-sm", medalColor.text, "opacity-90")}>
                          تم الحصول عليها في {new Date(medal.awarded_at).toLocaleDateString("ar-SA")}
                        </CardDescription>
                      )}
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Available Medals Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <Award className="ml-2 h-6 w-6 text-purple-500" />
            الميداليات المتاحة
          </h2>
          
          {availableMedals.length === 0 ? (
            <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 shadow-md">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Trophy className="h-16 w-16 text-amber-500 mb-4" />
                <p className="text-xl font-medium text-center mb-2">
                  🎉 أحسنت! لقد حصلت على جميع الميداليات المتاحة
                </p>
                <p className="text-muted-foreground text-center max-w-md mb-4">
                  تابع التقدم والمشاركة في النظام للحصول على المزيد من الميداليات الجديدة التي سيتم إضافتها قريباً
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {availableMedals.map((medal) => {
                const medalColor = getMedalColor(medal.min_points);
                const progressPercentage = Math.min(Math.floor((userPoints / medal.min_points) * 100), 99);
                
                return (
                  <Card key={medal.id} className="overflow-hidden shadow-md opacity-85 hover:opacity-100 transition-all border border-dashed">
                    <div className="aspect-square w-full bg-muted/25 flex items-center justify-center p-6">
                      {medal.image_url ? (
                        <img
                          src={medal.image_url}
                          alt={medal.name}
                          className="h-20 w-20 object-contain grayscale"
                        />
                      ) : (
                        getMedalIcon(medal.min_points, "h-20 w-20 text-muted-foreground")
                      )}
                    </div>
                    <CardHeader className="pb-0">
                      <Badge variant="outline" className="mb-1 self-start">
                        {medal.min_points} نقطة مطلوبة
                      </Badge>
                      <CardTitle>{medal.name}</CardTitle>
                      <CardDescription>
                        متبقي {medal.min_points - userPoints} نقطة للحصول عليها
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{userPoints} / {medal.min_points}</span>
                          <span>{progressPercentage}%</span>
                        </div>
                        <Progress value={progressPercentage} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 