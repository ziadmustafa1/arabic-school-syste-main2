"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Medal, Info, Award, Trophy, Sparkles, ArrowRight, Crown } from "lucide-react"
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

export default function MedalsPage() {
  const supabase = createClient()
  const [earnedMedals, setEarnedMedals] = useState<Medal[]>([])
  const [availableMedals, setAvailableMedals] = useState<Medal[]>([])
  const [userPoints, setUserPoints] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMedal, setSelectedMedal] = useState<Medal | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: user } = await supabase.auth.getUser()

        if (user && user.user) {
          // Get user's current points
          const { data: pointsData, error: pointsError } = await supabase.rpc("get_user_points_balance", {
            user_id_param: user.user.id
          })
          
          console.log("Points data from RPC:", pointsData)
          
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
              console.log("Calculated points balance:", total)
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

  // Calculate next medal to work toward
  const getNextMedal = () => {
    if (!availableMedals.length) return null;
    
    // Sort by min_points and find the next medal that requires more points than the user has
    const sortedMedals = [...availableMedals].sort((a, b) => a.min_points - b.min_points);
    return sortedMedals.find(medal => medal.min_points > userPoints) || sortedMedals[0];
  }

  const nextMedal = getNextMedal();
  
  // Calculate progress toward next medal
  const calculateProgressToNextMedal = () => {
    if (!nextMedal) return 100;
    
    // Find previous medal threshold or use 0
    const prevMedalPoints = earnedMedals.length > 0 
      ? Math.max(...earnedMedals.map(m => m.min_points)) 
      : 0;
    
    const pointsNeeded = nextMedal.min_points - prevMedalPoints;
    const pointsGained = userPoints - prevMedalPoints;
    
    return Math.min(Math.floor((pointsGained / pointsNeeded) * 100), 100);
  }

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
      
      {/* Stats Cards with improved spacing and visual hierarchy */}
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
      
      {/* Next Medal Section */}
      {nextMedal && (
        <Card className="mb-10 shadow-md overflow-hidden border-primary/20">
          <CardHeader className="pb-3 bg-gradient-to-r from-indigo-100 to-blue-50">
            <CardTitle className="text-lg font-bold flex items-center">
              <ArrowRight className="h-5 w-5 ml-2 text-indigo-500" />
              الميدالية القادمة
            </CardTitle>
            <CardDescription>
              استمر في تحصيل النقاط للحصول على الميدالية القادمة
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="flex-shrink-0">
                <div className={cn("w-24 h-24 rounded-full flex items-center justify-center", getMedalColor(nextMedal.min_points).bg)}>
                  {nextMedal.image_url ? (
                    <img 
                      src={nextMedal.image_url} 
                      alt={nextMedal.name} 
                      className="h-16 w-16 object-contain"
                    />
                  ) : (
                    getMedalIcon(nextMedal.min_points, "h-12 w-12 " + getMedalColor(nextMedal.min_points).icon)
                  )}
                </div>
              </div>
              
              <div className="flex-grow w-full">
                <h3 className="text-xl font-bold mb-2">{nextMedal.name}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {nextMedal.description || "وسام مميز للطلاب المتفوقين"}
                </p>
                
                <div className="space-y-2 w-full">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{userPoints} / {nextMedal.min_points} نقطة</span>
                    <span className="text-primary">{calculateProgressToNextMedal()}% مكتمل</span>
                  </div>
                  <Progress value={calculateProgressToNextMedal()} className="h-2.5 w-full" />
                  <p className="text-xs text-muted-foreground mt-2">
                    تحتاج إلى <span className="font-semibold text-primary">{nextMedal.min_points - userPoints}</span> نقطة إضافية للحصول على هذه الميدالية
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
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
                <Button variant="outline" className="mt-2">
                  اكتشف كيف تحصل على ميداليات
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {earnedMedals.map((medal) => {
                const medalColor = getMedalColor(medal.min_points);
                return (
                  <Card 
                    key={medal.id} 
                    className="overflow-hidden shadow-md hover:shadow-lg transition-shadow border-2 border-primary/10 cursor-pointer"
                    onClick={() => setSelectedMedal(medal)}
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
                    <CardContent className="pt-3">
                      <p className="text-sm text-muted-foreground">
                        {medal.description || "وسام مميز للطلاب المتفوقين"}
                      </p>
                    </CardContent>
                    <CardFooter className="pt-0 border-t text-xs text-muted-foreground border-dashed">
                      اضغط للمزيد من التفاصيل
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
        
        <Separator className="my-8" />
        
        <div>
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <Sparkles className="ml-2 h-6 w-6 text-purple-500" />
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
                <Button variant="default" className="mt-2">
                  استعرض ميدالياتك
                </Button>
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
                    <CardContent className="pt-3">
                      <div className="space-y-2">
                        <Progress value={progressPercentage} className="h-2" />
                        <p className="text-xs text-right text-muted-foreground">
                          {progressPercentage}% مكتمل
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground mt-3">
                        {medal.description || "وسام مميز للطلاب المتفوقين"}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Medal Detail Dialog - you would need to add a dialog/modal component here */}
      {selectedMedal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedMedal(null)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full m-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start">
              <h3 className="text-xl font-bold">{selectedMedal.name}</h3>
              <button className="text-gray-500 hover:text-gray-700" onClick={() => setSelectedMedal(null)}>×</button>
            </div>
            <div className="flex items-center justify-center my-4">
              {selectedMedal.image_url ? (
                <img src={selectedMedal.image_url} alt={selectedMedal.name} className="h-24 w-24 object-contain" />
              ) : (
                getMedalIcon(selectedMedal.min_points, "h-24 w-24 text-primary")
              )}
            </div>
            <p className="mb-3">{selectedMedal.description || "وسام مميز للطلاب المتفوقين"}</p>
            <div className="text-sm">
              <p><span className="font-medium">الحد الأدنى من النقاط:</span> {selectedMedal.min_points}</p>
              <p><span className="font-medium">الحد الأقصى من النقاط:</span> {selectedMedal.max_points}</p>
              {selectedMedal.awarded_at && (
                <p><span className="font-medium">تاريخ الحصول:</span> {new Date(selectedMedal.awarded_at).toLocaleDateString("ar-SA")}</p>
              )}
            </div>
            <Button className="w-full mt-4" onClick={() => setSelectedMedal(null)}>إغلاق</Button>
          </div>
        </div>
      )}
    </div>
  )
} 