"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Gift, Award, AlertCircle, Copy, Sparkles, Clock, CheckCircle, BadgeCheck, Tag, Coins, Info, MessageCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getRewardsForUser } from "@/app/actions/get-rewards"
import { redeemReward } from "@/app/actions/points"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface Reward {
  id: number
  name: string
  description: string | null
  points_cost: number
  available_quantity: number | null
  image_url: string | null
  role_id?: number | null
  created_at?: string | null
  updated_at?: string | null
  created_by?: string
}

export default function ParentRewardsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [rewards, setRewards] = useState<Reward[]>([])
  const [userPoints, setUserPoints] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null)
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [userRewards, setUserRewards] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("available")
  const [rewardsTab, setRewardsTab] = useState("pending")
  const [codeCopied, setCodeCopied] = useState<string | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setIsLoading(true)
      setError(null)
      
      // Use the server action to get rewards that bypasses RLS
      const response = await getRewardsForUser()
      
      if (!response.success) {
        console.error("Error from server action:", response.message)
        setError(response.message)
        toast({
          title: "خطأ في تحميل البيانات",
          description: response.message,
          variant: "destructive",
        })
        return
      }
      
      if (response.data) {
        setRewards(response.data.rewards || [])
        setUserPoints(response.data.userPoints || 0)
        setUserRewards(response.data.userRewards || [])
      } else {
        setError("لم يتم استلام بيانات من الخادم")
        toast({
          title: "خطأ في تحميل البيانات",
          description: "لم يتم استلام بيانات من الخادم",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Error fetching data:", error)
      setError(error.message || "حدث خطأ أثناء تحميل المكافآت. يرجى المحاولة مرة أخرى.")
      toast({
        title: "خطأ في تحميل البيانات",
        description: error.message || "حدث خطأ أثناء تحميل المكافآت. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRedeemReward = async (reward: Reward) => {
    setSelectedReward(reward)
    setShowDialog(true)
  }

  const confirmRedemption = async () => {
    if (!selectedReward) return

    setIsRedeeming(true)
    try {
      console.log("Starting reward redemption for:", selectedReward.id)
      
      // Create a FormData object to pass to the server action
      const formData = new FormData()
      formData.append("rewardId", selectedReward.id.toString())
      
      // Call the redeemReward server action
      console.log("Calling redeemReward with formData:", formData.get("rewardId"))
      const result = await redeemReward(formData)
      console.log("Redemption result:", result)
      
      if (result.success) {
        // Show success message after redemption
        setShowConfirmation(true)
        setTimeout(() => {
          setShowConfirmation(false)
        }, 3000)
        
        toast({
          title: "تم استبدال المكافأة بنجاح",
          description: result.message,
        })
        
        // Show redemption code if available
        if (result.redemptionCode) {
          toast({
            title: "رمز الاستبدال الخاص بك",
            description: (
              <div className="flex flex-col gap-2">
                <code className="bg-gray-100 rounded px-2 py-1 text-sm font-mono">
                  {result.redemptionCode}
                </code>
                <p className="text-xs">احتفظ بهذا الرمز. ستحتاجه عند استلام المكافأة.</p>
              </div>
            ),
            duration: 10000, // Show for longer (10 seconds)
          })
        }
        
        // Refresh data after successful redemption
        fetchData()
        setShowDialog(false)
        // Switch to the redeemed tab
        setActiveTab("redeemed")
      } else {
        toast({
          title: "خطأ في استبدال المكافأة",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error redeeming reward:", error)
      toast({
        title: "خطأ في استبدال المكافأة",
        description: "حدث خطأ أثناء استبدال المكافأة. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      })
    } finally {
      setIsRedeeming(false)
    }
  }

  // Add function to copy redemption code
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCodeCopied(code)
    setTimeout(() => setCodeCopied(null), 2000)
    
    toast({
      title: "تم النسخ",
      description: "تم نسخ رمز الاستبدال إلى الحافظة",
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  قيد الانتظار
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>جاري التحقق من المكافأة، يُرجى الانتظار خلال 24 ساعة</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      case "approved":
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="bg-green-100 text-green-800 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  تمت الموافقة
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>تمت الموافقة على المكافأة وسيتم تجهيزها قريباً</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      case "rejected":
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="bg-red-100 text-red-800 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  مرفوض
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>تم رفض المكافأة، يرجى مراجعة الإدارة</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      case "delivered":
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="bg-blue-100 text-blue-800 flex items-center gap-1">
                  <BadgeCheck className="h-3 w-3" />
                  تم التسليم
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>تم تسليم المكافأة بنجاح</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[70vh] flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <span className="text-lg font-medium">جاري تحميل المكافآت...</span>
          <p className="text-sm text-muted-foreground mt-2">يرجى الانتظار قليلاً</p>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-8 max-w-4xl">
          <div className="bg-destructive/5 rounded-lg p-8 border border-destructive/20">
            <div className="flex flex-col items-center text-center gap-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <h2 className="text-xl font-bold">خطأ في تحميل البيانات</h2>
              <p className="text-muted-foreground max-w-md">{error}</p>
              <Button className="mt-2" onClick={fetchData}>
                إعادة المحاولة
              </Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Filter pending and completed rewards
  const pendingRewards = userRewards.filter(item => item.status === "pending" || item.status === "approved");
  const completedRewards = userRewards.filter(item => item.status === "delivered" || item.status === "rejected");

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 max-w-7xl">
        {showConfirmation && (
          <div className="fixed top-0 left-0 right-0 z-50 w-full p-4 bg-green-500 text-white flex items-center justify-center">
            <CheckCircle className="h-6 w-6 mr-2" />
            <span className="font-medium">تم استبدال المكافأة بنجاح!</span>
          </div>
        )}
        
        {/* Header with points balance */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-primary">المكافآت</h1>
              <p className="text-muted-foreground mt-1">استبدل نقاطك بمكافآت قيمة واستمتع بتجربة مميزة</p>
            </div>
            <div className="flex items-center bg-gradient-to-r from-primary/90 to-primary rounded-lg shadow-md px-6 py-3 text-white">
              <Coins className="h-6 w-6 mr-2" />
              <div>
                <div className="text-sm opacity-90">رصيد النقاط</div>
                <div className="text-2xl font-bold">{userPoints}</div>
              </div>
            </div>
          </div>

          {/* Tabs for Available and Redeemed Rewards */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 h-14">
              <TabsTrigger value="available" className="text-base py-3 text-lg">
                <Gift className="h-5 w-5 ml-2" />
                    المكافآت المتاحة
              </TabsTrigger>
              <TabsTrigger value="redeemed" className="text-base py-3 text-lg">
                <Award className="h-5 w-5 ml-2" />
                المكافآت المستبدلة
                {userRewards.length > 0 && (
                  <Badge variant="secondary" className="mr-2">{userRewards.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Available Rewards Content */}
            <TabsContent value="available" className="space-y-8">
              {rewards.length === 0 ? (
                <div className="bg-muted/30 border rounded-xl p-8 text-center">
                  <div className="flex flex-col items-center">
                    <Gift className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-medium mb-2">لا توجد مكافآت متاحة</h3>
                    <p className="text-muted-foreground max-w-md">لا توجد مكافآت متاحة حالياً. يرجى التحقق مرة أخرى لاحقاً.</p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {rewards.map((reward, index) => {
                    // Calculate percentage of points user has towards this reward
                    const percentage = Math.min(Math.round((userPoints / reward.points_cost) * 100), 100);
                    
                    return (
                      <Card 
                        key={reward.id}
                        className={`overflow-hidden transition-all duration-300 hover:shadow-md h-full ${userPoints >= reward.points_cost ? 'border-primary/20' : 'border-muted'}`}
                      >
                        <CardHeader className="pb-3 flex flex-row justify-between items-start">
                          <div>
                            <CardTitle className="text-xl font-bold">{reward.name}</CardTitle>
                            <CardDescription className="mt-1 line-clamp-2">{reward.description}</CardDescription>
                          </div>
                          <Badge variant={userPoints >= reward.points_cost ? "default" : "outline"} className="ml-1">
                            <Tag className="h-3 w-3 ml-1" />
                            {reward.points_cost} نقطة
                          </Badge>
                        </CardHeader>
                        <CardContent className="flex flex-col h-full">
                          <div className="relative mb-4 overflow-hidden rounded-lg bg-gradient-to-b from-muted/50 to-muted flex items-center justify-center h-48">
                            {reward.image_url ? (
                              <img
                                src={reward.image_url}
                                alt={reward.name}
                                className="h-full w-full object-contain transform transition-transform duration-300 hover:scale-105"
                                onError={(e) => {
                                  // Replace with a placeholder image when there's an error loading the image
                                  e.currentTarget.src = "https://placehold.co/400x300?text=صورة+غير+متوفرة";
                                  e.currentTarget.onerror = null; // Prevent infinite error loop
                                }}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Gift className="h-20 w-20 text-primary/30" />
                              </div>
                            )}
                            {userPoints >= reward.points_cost && (
                              <div className="absolute top-2 right-2">
                                <Badge variant="secondary" className="bg-green-100 text-green-800 flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  يمكن الاستبدال
                                </Badge>
                              </div>
                            )}
                          </div>

                          {/* Add a prominent redemption button below the image for eligible rewards */}
                          {userPoints >= reward.points_cost && (
                            <div className="mb-4">
                              <Button
                                className="w-full py-5 text-lg font-bold bg-primary hover:bg-primary/90 shadow-md shadow-primary/30 transition-all duration-300 hover:-translate-y-1"
                                variant="default"
                                onClick={() => handleRedeemReward(reward)}
                                disabled={reward.available_quantity === null || reward.available_quantity <= 0}
                                size="lg"
                              >
                                استبدال المكافأة الآن 🎁
                              </Button>
                            </div>
                          )}

                          {userPoints < reward.points_cost && (
                            <div className="mb-4 space-y-2">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="font-medium">التقدم نحو المكافأة</span>
                                <span className="text-muted-foreground">{percentage}%</span>
                              </div>
                              <Progress value={percentage} className="h-2" />
                              <p className="text-sm text-center text-primary">
                                لديك {userPoints} من أصل {reward.points_cost} نقطة مطلوبة
                              </p>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between text-sm mt-auto">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center">
                                    <Sparkles className="h-4 w-4 text-amber-500 ml-1" />
                                    <span className="font-medium">المتوفر:</span>
                                    <span className="ml-1">{reward.available_quantity === null ? "غير متوفر" : reward.available_quantity + " وحدة"}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>عدد الوحدات المتاحة من هذه المكافأة</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </CardContent>
                        <CardFooter>
                          <Button
                            className={`w-full`}
                            variant="outline"
                            onClick={() => handleRedeemReward(reward)}
                            disabled={userPoints < reward.points_cost || reward.available_quantity === null || reward.available_quantity <= 0}
                            size="default"
                          >
                            {userPoints < reward.points_cost
                              ? "نقاط غير كافية"
                              : reward.available_quantity === null || reward.available_quantity <= 0
                                ? "غير متوفر"
                                : "عرض التفاصيل"}
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Redeemed Rewards Content */}
            <TabsContent value="redeemed">
              {userRewards.length === 0 ? (
                <div className="bg-muted/30 border rounded-xl p-8 text-center">
                  <div className="flex flex-col items-center">
                    <Award className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-medium mb-2">لا توجد مكافآت مستبدلة</h3>
                    <p className="text-muted-foreground max-w-md">لم تقم باستبدال أي مكافآت بعد. استبدل بعض المكافآت القيمة باستخدام نقاطك.</p>
                    <Button 
                      className="mt-4" 
                      variant="outline"
                      onClick={() => setActiveTab("available")}
                      size="lg"
                    >
                      <Gift className="ml-2 h-4 w-4" />
                      استعرض المكافآت المتاحة
                    </Button>
                  </div>
                  </div>
                ) : (
                <div className="space-y-8">
                  {/* Toggle between pending and completed rewards */}
                  <div className="flex justify-center mb-6">
                    <Tabs value={rewardsTab} onValueChange={setRewardsTab} className="w-full max-w-md">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="pending" className="text-base py-3">
                          <Clock className="h-4 w-4 ml-2" />
                          قيد المعالجة
                          {pendingRewards.length > 0 && (
                            <Badge variant="secondary" className="mr-2">{pendingRewards.length}</Badge>
                          )}
                        </TabsTrigger>
                        <TabsTrigger value="completed" className="text-base py-3">
                          <CheckCircle className="h-4 w-4 ml-2" />
                          المكتملة
                          {completedRewards.length > 0 && (
                            <Badge variant="secondary" className="mr-2">{completedRewards.length}</Badge>
                          )}
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  {/* Pending/Active rewards section */}
                  {rewardsTab === "pending" && (
                    pendingRewards.length > 0 ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        {pendingRewards.map((item) => (
                          <Card key={item.id} className="overflow-hidden border-yellow-200 bg-yellow-50/30 hover:shadow-md transition-all duration-300">
                            <CardContent className="p-5">
                              <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-lg">
                                  {item.reward.image_url ? (
                                    <img 
                                      src={item.reward.image_url} 
                                      alt={item.reward.name}
                                      className="h-12 w-12 object-contain"
                                      onError={(e) => {
                                        e.currentTarget.src = "";
                                        e.currentTarget.style.display = "none";
                                      }}
                                    />
                                  ) : (
                                    <Award className="h-8 w-8 text-yellow-600" />
                                  )}
                                </div>
                                <div className="flex-grow">
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-lg font-bold">{item.reward.name}</h4>
                                    {getStatusBadge(item.status)}
          </div>
                                  <p className="text-sm text-muted-foreground mb-3">{item.reward.description}</p>
                                  
                                  {item.status === "pending" && (
                                    <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800 mb-3">
                                      <Clock className="h-4 w-4" />
                                      <AlertDescription>
                                        جاري التحقق من المكافأة، يُرجى الانتظار خلال 24 ساعة
                                      </AlertDescription>
                                    </Alert>
                                  )}
                                  
                                  {item.redemption_code && (
                                    <div className="bg-white border rounded-md p-4 flex flex-col md:flex-row md:justify-between items-start md:items-center mt-3 mb-3 gap-2">
                                      <div className="text-sm font-medium">رمز الاستبدال:</div>
                                      <div className="flex items-center bg-yellow-50 rounded px-3 py-2 border border-yellow-200 w-full md:w-auto">
                                        <code className="text-sm font-mono font-bold ml-2">
                                          {item.redemption_code}
                                        </code>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 w-7 rounded-full ml-1"
                                          onClick={() => handleCopyCode(item.redemption_code)}
                                        >
                                          {codeCopied === item.redemption_code ? (
                                            <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                          ) : (
                                            <Copy className="h-3.5 w-3.5" />
                                          )}
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                  <div className="text-xs text-muted-foreground mt-2 flex items-center">
                                    <Clock className="h-3 w-3 ml-1" />
                                    تاريخ الاستبدال: {formatDate(item.redeemed_at)}
                                  </div>
                                </div>
                              </div>
              </CardContent>
            </Card>
                        ))}
                        </div>
                    ) : (
                      <div className="text-center py-8 bg-muted/30 rounded-lg">
                        <Clock className="h-12 w-12 mx-auto text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-medium">لا توجد مكافآت قيد المعالجة</h3>
                        <p className="text-muted-foreground">
                          ليس لديك أي مكافآت قيد المعالجة حالياً
                        </p>
                      </div>
                    )
                  )}

                  {/* Completed rewards section */}
                  {rewardsTab === "completed" && (
                    completedRewards.length > 0 ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        {completedRewards.map((item) => (
                          <Card key={item.id} className={`overflow-hidden hover:shadow-md transition-all duration-300 ${
                            item.status === "delivered" ? "border-green-200 bg-green-50/30" : "border-red-200 bg-red-50/30"
                          }`}>
                            <CardContent className="p-5">
                              <div className="flex flex-col md:flex-row gap-4">
                                <div className={`flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-lg ${
                                  item.status === "delivered" ? "bg-green-100" : "bg-red-100"
                                }`}>
                                  {item.reward.image_url ? (
                                    <img 
                                      src={item.reward.image_url} 
                                      alt={item.reward.name}
                                      className="h-12 w-12 object-contain"
                                      onError={(e) => {
                                        e.currentTarget.src = "";
                                        e.currentTarget.style.display = "none";
                                      }}
                                    />
                                  ) : (
                                    item.status === "delivered" ? (
                                      <BadgeCheck className="h-8 w-8 text-green-600" />
                                    ) : (
                                      <AlertCircle className="h-8 w-8 text-red-600" />
                                    )
                                  )}
                                </div>
                                <div className="flex-grow">
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-lg font-bold">{item.reward.name}</h4>
                                    {getStatusBadge(item.status)}
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-3">{item.reward.description}</p>
                                  
                                  <div className="flex flex-col gap-2 text-xs">
                                    <div className="flex items-center text-muted-foreground">
                                      <Clock className="h-3 w-3 ml-1" />
                                      تاريخ الاستبدال: {formatDate(item.redeemed_at)}
                                    </div>
                                    
                                    {item.status === "delivered" && item.delivered_at && (
                                      <div className="flex items-center text-green-600">
                                        <BadgeCheck className="h-3 w-3 ml-1" />
                                        تاريخ التسليم: {formatDate(item.delivered_at)}
                                      </div>
                                    )}
                                  </div>
                                  
                                  {item.admin_notes && (
                                    <div className="text-sm bg-white rounded-md p-3 mt-3 border flex items-start">
                                      <MessageCircle className="h-4 w-4 ml-2 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <span className="font-medium">ملاحظات: </span>
                                        {item.admin_notes}
                                      </div>
                                    </div>
                                  )}
                                </div>
                  </div>
                </CardContent>
              </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-muted/30 rounded-lg">
                        <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-medium">لا توجد مكافآت مكتملة</h3>
                        <p className="text-muted-foreground">
                          ليس لديك أي مكافآت مكتملة حالياً
                        </p>
                      </div>
                    )
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Add a note about rewards available for all user types */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 ml-2 flex-shrink-0" />
            <div>
              <h3 className="text-md font-medium text-blue-800">المكافآت متاحة لجميع المستخدمين</h3>
              <p className="text-sm text-blue-600 mt-1">
                تتوفر المكافآت لكل المستخدمين (الطلاب، أولياء الأمور، المدرسين) بناءً على دور المستخدم في النظام.
              </p>
          </div>
        </div>
      </div>

        {/* Redemption Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="sm:max-w-md">
          <DialogHeader>
              <DialogTitle className="text-center text-xl">تأكيد استبدال المكافأة</DialogTitle>
              <DialogDescription className="text-center">
                هل أنت متأكد من رغبتك في استبدال هذه المكافأة؟
              </DialogDescription>
          </DialogHeader>
            <div className="flex flex-col items-center justify-center gap-4 py-4">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                {selectedReward?.image_url ? (
                  <img 
                    src={selectedReward.image_url} 
                    alt={selectedReward.name}
                    className="h-16 w-16 object-contain"
                    onError={(e) => {
                      e.currentTarget.src = "";
                      e.currentTarget.style.display = "none";
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        const gift = document.createElement('div');
                        gift.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary"><path d="M20 12v10H4V12"></path><polyline points="2 7 12 2 22 7"></polyline><path d="M12 22V7"></path><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>';
                        parent.appendChild(gift);
                      }
                    }}
                  />
                ) : (
                  <Gift className="h-10 w-10 text-primary" />
                )}
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold">{selectedReward?.name}</h3>
                <p className="text-sm text-muted-foreground mt-2">{selectedReward?.description}</p>
              </div>
              <div className="grid grid-cols-3 gap-4 w-full mt-3">
                <div className="rounded-lg bg-primary/5 px-3 py-2 text-center">
                  <div className="text-xs text-muted-foreground">التكلفة</div>
                  <div className="font-bold text-lg text-primary">{selectedReward?.points_cost}</div>
                </div>
                <div className="rounded-lg bg-secondary/5 px-3 py-2 text-center">
                  <div className="text-xs text-muted-foreground">رصيدك</div>
                  <div className="font-bold text-lg">{userPoints}</div>
                </div>
                <div className="rounded-lg bg-muted px-3 py-2 text-center">
                  <div className="text-xs text-muted-foreground">المتبقي</div>
                  <div className="font-bold text-lg">{Math.max(0, userPoints - (selectedReward?.points_cost || 0))}</div>
                </div>
              </div>
              
              <Alert className="mt-2 bg-blue-50 border-blue-200 text-blue-800">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  سيتم إرسال إشعار لإدارة المدرسة للموافقة على طلبك
                </AlertDescription>
                </Alert>
            </div>
            <DialogFooter className="flex-col sm:flex-row sm:justify-center sm:space-x-2 gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)} disabled={isRedeeming} className="mt-2 sm:mt-0 sm:ml-2">
              إلغاء
            </Button>
              <Button onClick={confirmRedemption} disabled={isRedeeming} className="min-w-[120px]" size="lg">
              {isRedeeming ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري الاستبدال...
                </>
              ) : (
                "تأكيد الاستبدال"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </DashboardLayout>
  )
} 