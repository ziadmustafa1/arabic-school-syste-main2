"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { Loader2, BarChart3, Users, Gift, AlertCircle } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export default function ReportsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("points")
  const [timeRange, setTimeRange] = useState("month")
  const [error, setError] = useState<string | null>(null)
  const [reportData, setReportData] = useState<any>({
    points: {
      totalPoints: 0,
      positivePoints: 0,
      negativePoints: 0,
      topCategories: [],
      recentTransactions: [],
    },
    users: {
      totalUsers: 0,
      usersByRole: [],
      recentUsers: [],
    },
    rewards: {
      totalRedemptions: 0,
      topRewards: [],
      recentRedemptions: [],
    },
  })
  const [isRetrying, setIsRetrying] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        setError(null)
        // Check if user is admin
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          router.push("/auth/login")
          return
        }

        const { data: userData, error: userError } = await supabase.from("users").select("role_id").eq("id", user.id).single()
        
        if (userError) {
          console.error("Error fetching user role:", userError)
          throw new Error("فشل في التحقق من صلاحيات المستخدم")
        }
        
        if (!userData || userData.role_id !== 4) {
          router.push("/")
          return
        }

        // Fetch report data based on active tab and time range
        await fetchReportData(activeTab, timeRange)
      } catch (error: any) {
        console.error("Error fetching data:", error)
        setError(error.message || "حدث خطأ أثناء تحميل بيانات التقارير")
        toast({
          title: "خطأ في تحميل البيانات",
          description: error.message || "حدث خطأ أثناء تحميل بيانات التقارير. يرجى المحاولة مرة أخرى.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [supabase, router, activeTab, timeRange])

  const fetchReportData = async (tab: string, range: string) => {
    setIsLoading(true)
    setError(null)
    
    if (isRetrying) {
      setIsRetrying(false)
    }

    // Calculate date range
    const now = new Date()
    const startDate = new Date()

    switch (range) {
      case "week":
        startDate.setDate(now.getDate() - 7)
        break
      case "month":
        startDate.setMonth(now.getMonth() - 1)
        break
      case "quarter":
        startDate.setMonth(now.getMonth() - 3)
        break
      case "year":
        startDate.setFullYear(now.getFullYear() - 1)
        break
      case "all":
        // Set to a very old date to include all data
        startDate.setFullYear(2000)
        break
      default:
        startDate.setMonth(now.getMonth() - 1) // Default to month
    }

    const startDateStr = startDate.toISOString()

    try {
      switch (tab) {
        case "points":
          await fetchPointsReport(startDateStr)
          break
        case "users":
          await fetchUsersReport(startDateStr)
          break
        case "rewards":
          await fetchRewardsReport(startDateStr)
          break
      }
    } catch (error: any) {
      console.error(`Error fetching ${tab} report:`, error)
      setError(error.message || `فشل في تحميل تقرير ${tab}`)
      
      toast({
        variant: "destructive",
        title: "خطأ في تحميل البيانات",
        description: error.message || `فشل في تحميل تقرير ${tab}. يرجى المحاولة مرة أخرى.`,
      })
      
      // Reset data for the current tab to avoid partial/stale data display
      setReportData((prev: any) => ({
        ...prev,
        [tab]: {
          ...reportData[tab],
          error: error.message
        }
      }))
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPointsReport = async (startDate: string) => {
    try {
    // Get total points statistics for the selected period
      const { data: pointsStats, error: pointsError } = await supabase
      .from("points_transactions")
      .select("points, is_positive")
      .gte("created_at", startDate)
      
      if (pointsError) throw new Error(pointsError.message)

    // Get all-time points statistics
      const { data: allPointsStats, error: allPointsError } = await supabase
      .from("points_transactions")
      .select("points, is_positive")
      
      if (allPointsError) throw new Error(allPointsError.message)

    let totalPoints = 0
    let positivePoints = 0
    let negativePoints = 0

    let allTimeTotal = 0
    let allTimePositive = 0
    let allTimeNegative = 0

      if (pointsStats && pointsStats.length > 0) {
      pointsStats.forEach((transaction) => {
        if (transaction.is_positive) {
          positivePoints += transaction.points
          totalPoints += transaction.points
        } else {
          negativePoints += transaction.points
          totalPoints -= transaction.points
        }
      })
    }

      if (allPointsStats && allPointsStats.length > 0) {
      allPointsStats.forEach((transaction) => {
        if (transaction.is_positive) {
          allTimePositive += transaction.points
          allTimeTotal += transaction.points
        } else {
          allTimeNegative += transaction.points
          allTimeTotal -= transaction.points
        }
      })
    }

      // Check if the RPC function exists first
      const { data: rpcFunctions, error: rpcCheckError } = await supabase
        .from("pg_proc")
        .select("proname")
        .eq("proname", "get_top_point_categories")
        .limit(1)
      
      let topCategories = []
      
      // Only call the RPC if it exists
      if (!rpcCheckError && rpcFunctions && rpcFunctions.length > 0) {
    // Get top categories
        const { data: categoriesData, error: categoryError } = await supabase.rpc("get_top_point_categories", {
      start_date: startDate,
    })

        if (!categoryError && categoriesData) {
          topCategories = categoriesData
        } else if (categoryError) {
          console.error("Error fetching top categories:", categoryError)
        }
      }

      // Get recent transactions with explicit foreign key specification
      const { data: recentTransactions, error: transactionsError } = await supabase
      .from("points_transactions")
        .select(`
          id,
          points,
          is_positive,
          description,
          created_at,
          user:user_id (full_name),
          category:category_id (name)
        `)
      .gte("created_at", startDate)
      .order("created_at", { ascending: false })
      .limit(10)
      
      if (transactionsError) throw new Error(transactionsError.message)

    setReportData((prev: any) => ({
      ...prev,
      points: {
        totalPoints,
        positivePoints,
        negativePoints,
        allTimeTotal,
        allTimePositive,
        allTimeNegative,
          topCategories: topCategories || [],
        recentTransactions: recentTransactions || [],
      },
    }))
    } catch (error: any) {
      console.error("Error in fetchPointsReport:", error)
      throw new Error(`فشل في تحميل تقرير النقاط: ${error.message}`)
    }
  }

  const fetchUsersReport = async (startDate: string) => {
    try {
    // Get total users (this is always all users, not time-filtered)
      const { count: totalUsers, error: countError } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      
      if (countError) throw new Error(countError.message)

    // Get users by role
      const { data: usersByRole, error: roleError } = await supabase
        .from("users")
        .select("role_id, roles!inner(name)")
        .order("role_id")
      
      if (roleError) throw new Error(roleError.message)

      // Count users by role
      const roleCountMap: Record<string, number> = {}
      const roleNameMap: Record<string, string> = {}
      
      if (usersByRole && usersByRole.length > 0) {
        usersByRole.forEach((user) => {
          const roleId = user.role_id.toString()
          if (roleCountMap[roleId]) {
            roleCountMap[roleId]++
          } else {
            roleCountMap[roleId] = 1
            roleNameMap[roleId] = user.roles.name
          }
        })
      }
      
      const roleStats = Object.keys(roleCountMap).map((roleId) => ({
        roleId: parseInt(roleId),
        name: roleNameMap[roleId] || `Role ${roleId}`,
        count: roleCountMap[roleId]
      }))

      // Get recently added users
      const { data: recentUsers, error: recentError } = await supabase
      .from("users")
        .select("id, full_name, email, role_id, created_at, roles!inner(name)")
      .gte("created_at", startDate)
      .order("created_at", { ascending: false })
      .limit(10)
      
      if (recentError) throw new Error(recentError.message)

    setReportData((prev: any) => ({
      ...prev,
      users: {
        totalUsers: totalUsers || 0,
          usersByRole: roleStats || [],
        recentUsers: recentUsers || [],
      },
    }))
    } catch (error: any) {
      console.error("Error in fetchUsersReport:", error)
      throw new Error(`فشل في تحميل تقرير المستخدمين: ${error.message}`)
    }
  }

  const fetchRewardsReport = async (startDate: string) => {
    try {
      // Get reward redemptions
      const { data: redemptions, error: redemptionsError } = await supabase
        .from("reward_redemptions")
        .select("id, reward_id, user_id, points_spent, created_at, rewards(name, points_cost)")
        .gte("created_at", startDate)
      
      if (redemptionsError) throw new Error(redemptionsError.message)

      // Calculate total redemptions and points spent
      let totalRedemptions = 0
      let totalPointsSpent = 0
      
      if (redemptions && redemptions.length > 0) {
        totalRedemptions = redemptions.length
        totalPointsSpent = redemptions.reduce((sum, redemption) => sum + redemption.points_spent, 0)
      }

    // Get top rewards
      const rewardCountMap: Record<string, { count: number; name: string; pointsCost: number }> = {}
      
      if (redemptions && redemptions.length > 0) {
        redemptions.forEach((redemption) => {
          const rewardId = redemption.reward_id.toString()
          if (rewardCountMap[rewardId]) {
            rewardCountMap[rewardId].count++
          } else {
            rewardCountMap[rewardId] = {
              count: 1,
              name: redemption.rewards?.name || `Reward ${rewardId}`,
              pointsCost: redemption.rewards?.points_cost || 0
            }
          }
        })
      }
      
      const topRewards = Object.keys(rewardCountMap)
        .map((rewardId) => ({
          rewardId: parseInt(rewardId),
          name: rewardCountMap[rewardId].name,
          count: rewardCountMap[rewardId].count,
          pointsCost: rewardCountMap[rewardId].pointsCost
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      // Get recent redemptions with user details
      const { data: recentRedemptions, error: recentError } = await supabase
        .from("reward_redemptions")
      .select("*, user:users(full_name), reward:rewards(name, points_cost)")
        .gte("created_at", startDate)
        .order("created_at", { ascending: false })
      .limit(10)
      
      if (recentError) throw new Error(recentError.message)

    setReportData((prev: any) => ({
      ...prev,
      rewards: {
          totalRedemptions,
          totalPointsSpent,
        topRewards: topRewards || [],
        recentRedemptions: recentRedemptions || [],
      },
    }))
    } catch (error: any) {
      console.error("Error in fetchRewardsReport:", error)
      throw new Error(`فشل في تحميل تقرير المكافآت: ${error.message}`)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "غير محدد";
    
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
    }
  }

  // Add a retry function
  const handleRetry = () => {
    setIsRetrying(true)
    fetchReportData(activeTab, timeRange)
  }

  // Add error display
  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>خطأ في تحميل التقارير</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        
        <Button onClick={() => fetchReportData(activeTab, timeRange)}>
          إعادة المحاولة
        </Button>
      </div>
    )
  }

  if (isLoading) {
    return (
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="mr-2">جاري تحميل التقارير...</span>
        </div>
    )
  }

  return (
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">التقارير والإحصائيات</h1>
          <p className="text-muted-foreground">عرض تقارير وإحصائيات النظام</p>
        </div>

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value)} className="w-full">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between w-full">
              <TabsList className="grid w-full md:w-auto grid-cols-3">
              <TabsTrigger value="points">
                <BarChart3 className="ml-2 h-4 w-4" />
                <span className="hidden sm:inline">النقاط</span>
              </TabsTrigger>
              <TabsTrigger value="users">
                <Users className="ml-2 h-4 w-4" />
                <span className="hidden sm:inline">المستخدمين</span>
              </TabsTrigger>
              <TabsTrigger value="rewards">
                <Gift className="ml-2 h-4 w-4" />
                <span className="hidden sm:inline">المكافآت</span>
              </TabsTrigger>
            </TabsList>

              <div className="flex items-center gap-2 mt-4 md:mt-0">
            <Label htmlFor="timeRange" className="whitespace-nowrap">
              الفترة الزمنية:
            </Label>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger id="timeRange" className="w-[180px]">
                <SelectValue placeholder="اختر الفترة الزمنية" />
              </SelectTrigger>
              <SelectContent>
                    <SelectItem value="all">كل الفترات</SelectItem>
                <SelectItem value="week">آخر أسبوع</SelectItem>
                <SelectItem value="month">آخر شهر</SelectItem>
                <SelectItem value="quarter">آخر 3 أشهر</SelectItem>
                <SelectItem value="year">آخر سنة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

            <TabsContent value="points" className="space-y-4">
              {error && activeTab === "points" ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>خطأ في تحميل البيانات</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                  <div className="mt-4">
                    <Button onClick={handleRetry} disabled={isRetrying}>
                      {isRetrying ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          جاري إعادة المحاولة...
                        </>
                      ) : (
                        "إعادة المحاولة"
                      )}
                    </Button>
                  </div>
                </Alert>
              ) : (
                <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>إجمالي النقاط</CardTitle>
                <CardDescription>إجمالي النقاط المكتسبة والمخصومة</CardDescription>
              </CardHeader>
              <CardContent>
                    <div className="text-2xl font-bold">{reportData.points.allTimeTotal}</div>
                <div className="mt-2 flex justify-between text-sm">
                  <div className="text-green-600">
                        <span className="font-semibold">+{reportData.points.allTimePositive}</span> مكتسبة
                      </div>
                      <div className="text-red-600">
                        <span className="font-semibold">-{reportData.points.allTimeNegative}</span> مخصومة
                      </div>
                    </div>
                    {timeRange !== "all" && (
                      <div className="mt-3 pt-2 border-t text-sm">
                        <div className="font-medium mb-1">
                          {timeRange === "week" ? "آخر أسبوع" :
                           timeRange === "month" ? "آخر شهر" :
                           timeRange === "quarter" ? "آخر 3 أشهر" :
                           "آخر سنة"}: {reportData.points.totalPoints}
                        </div>
                        <div className="flex justify-between">
                          <div className="text-green-600">
                            <span>+{reportData.points.positivePoints}</span>
                  </div>
                  <div className="text-red-600">
                            <span>-{reportData.points.negativePoints}</span>
                          </div>
                  </div>
                </div>
                    )}
              </CardContent>
            </Card>

            <Card className="col-span-2">
              <CardHeader className="pb-2">
                <CardTitle>أعلى فئات النقاط</CardTitle>
                <CardDescription>الفئات الأكثر استخداماً</CardDescription>
              </CardHeader>
              <CardContent>
                {reportData.points.topCategories.length === 0 ? (
                  <p className="text-center text-muted-foreground">لا توجد بيانات متاحة</p>
                ) : (
                  <div className="space-y-2">
                    {reportData.points.topCategories.slice(0, 5).map((category: any, index: number) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="ml-2 font-medium">{category.name}</span>
                          <span className="text-sm text-muted-foreground">
                            ({category.is_positive ? "إيجابي" : "سلبي"})
                          </span>
                        </div>
                        <div className="font-semibold">{category.total_points} نقطة</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle>آخر معاملات النقاط</CardTitle>
              <CardDescription>أحدث معاملات النقاط في النظام</CardDescription>
            </CardHeader>
            <CardContent>
              {reportData.points.recentTransactions.length === 0 ? (
                <p className="text-center text-muted-foreground">لا توجد معاملات حديثة</p>
              ) : (
                <div className="rounded-md border">
                  <div className="grid grid-cols-1 divide-y">
                    {reportData.points.recentTransactions.map((transaction: any) => (
                      <div key={transaction.id} className="p-4">
                        <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
                          <div>
                            <div className="font-medium">{transaction.user?.full_name}</div>
                            <div className="text-sm text-muted-foreground">{transaction.description}</div>
                            <div className="text-xs text-muted-foreground">
                              الفئة: {transaction.category?.name || "غير محدد"}
                            </div>
                          </div>
                          <div className="flex flex-col items-start gap-1 md:items-end">
                            <div
                              className={
                                transaction.is_positive ? "text-green-600 font-semibold" : "text-red-600 font-semibold"
                              }
                            >
                              {transaction.is_positive ? "+" : "-"}
                              {transaction.points} نقطة
                            </div>
                            <div className="text-xs text-muted-foreground">{formatDate(transaction.created_at)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
                </>
              )}
        </TabsContent>

            <TabsContent value="users" className="space-y-4">
              {error && activeTab === "users" ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>خطأ في تحميل البيانات</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                  <div className="mt-4">
                    <Button onClick={handleRetry} disabled={isRetrying}>
                      {isRetrying ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          جاري إعادة المحاولة...
                        </>
                      ) : (
                        "إعادة المحاولة"
                      )}
                    </Button>
                  </div>
                </Alert>
              ) : (
                <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>إجمالي المستخدمين</CardTitle>
                <CardDescription>العدد الإجمالي للمستخدمين في النظام</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.users.totalUsers}</div>
                    {timeRange !== "all" && reportData.users.newUsers > 0 && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        <span className="text-green-600">+{reportData.users.newUsers}</span>
                        <span className="mr-1">في {
                          timeRange === "week" ? "آخر أسبوع" :
                          timeRange === "month" ? "آخر شهر" :
                          timeRange === "quarter" ? "آخر 3 أشهر" :
                          "آخر سنة"
                        }</span>
                      </div>
                    )}
              </CardContent>
            </Card>

            <Card className="col-span-2">
              <CardHeader className="pb-2">
                <CardTitle>المستخدمين حسب الدور</CardTitle>
                <CardDescription>توزيع المستخدمين حسب الأدوار</CardDescription>
              </CardHeader>
              <CardContent>
                {reportData.users.usersByRole.length === 0 ? (
                  <p className="text-center text-muted-foreground">لا توجد بيانات متاحة</p>
                ) : (
                  <div className="space-y-2">
                    {reportData.users.usersByRole.map((role: any, index: number) => (
                      <div key={index} className="flex items-center justify-between">
                              <div className="font-medium">{role.name}</div>
                        <div className="font-semibold">{role.count} مستخدم</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle>أحدث المستخدمين</CardTitle>
              <CardDescription>المستخدمين الذين تم تسجيلهم مؤخراً</CardDescription>
            </CardHeader>
            <CardContent>
              {reportData.users.recentUsers.length === 0 ? (
                <p className="text-center text-muted-foreground">لا يوجد مستخدمين جدد</p>
              ) : (
                <div className="rounded-md border">
                  <div className="grid grid-cols-1 divide-y">
                    {reportData.users.recentUsers.map((user: any) => (
                      <div key={user.id} className="p-4">
                        <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
                          <div>
                            <div className="font-medium">{user.full_name}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                            <div className="text-xs text-muted-foreground">الدور: {user.role?.name || "غير محدد"}</div>
                          </div>
                          <div className="text-xs text-muted-foreground">{formatDate(user.created_at)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
                </>
              )}
        </TabsContent>

            <TabsContent value="rewards" className="space-y-4">
              {error && activeTab === "rewards" ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>خطأ في تحميل البيانات</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                  <div className="mt-4">
                    <Button onClick={handleRetry} disabled={isRetrying}>
                      {isRetrying ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          جاري إعادة المحاولة...
                        </>
                      ) : (
                        "إعادة المحاولة"
                      )}
                    </Button>
                  </div>
                </Alert>
              ) : (
                <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>إجمالي الاستبدالات</CardTitle>
                <CardDescription>عدد المكافآت التي تم استبدالها</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.rewards.totalRedemptions}</div>
                    {timeRange !== "all" && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        <span>{reportData.rewards.periodRedemptions} استبدال</span>
                        <span className="mr-1">في {
                          timeRange === "week" ? "آخر أسبوع" :
                          timeRange === "month" ? "آخر شهر" :
                          timeRange === "quarter" ? "آخر 3 أشهر" :
                          "آخر سنة"
                        }</span>
                      </div>
                    )}
              </CardContent>
            </Card>

            <Card className="col-span-2">
              <CardHeader className="pb-2">
                <CardTitle>أكثر المكافآت استبدالاً</CardTitle>
                <CardDescription>المكافآت الأكثر شعبية</CardDescription>
              </CardHeader>
              <CardContent>
                {reportData.rewards.topRewards.length === 0 ? (
                  <p className="text-center text-muted-foreground">لا توجد بيانات متاحة</p>
                ) : (
                  <div className="space-y-2">
                    {reportData.rewards.topRewards.slice(0, 5).map((reward: any, index: number) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="font-medium">{reward.name}</div>
                        <div className="font-semibold">{reward.count} مرة</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle>أحدث الاستبدالات</CardTitle>
              <CardDescription>آخر المكافآت التي تم استبدالها</CardDescription>
            </CardHeader>
            <CardContent>
              {reportData.rewards.recentRedemptions.length === 0 ? (
                <p className="text-center text-muted-foreground">لا توجد استبدالات حديثة</p>
              ) : (
                <div className="rounded-md border">
                  <div className="grid grid-cols-1 divide-y">
                    {reportData.rewards.recentRedemptions.map((redemption: any) => (
                      <div key={redemption.id} className="p-4">
                        <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
                          <div>
                            <div className="font-medium">{redemption.user?.full_name}</div>
                            <div className="text-sm text-muted-foreground">
                              استبدل: {redemption.reward?.name} ({redemption.reward?.points_cost} نقطة)
                            </div>
                            <div className="text-xs text-muted-foreground">
                              الحالة:{" "}
                              {redemption.status === "pending"
                                ? "قيد الانتظار"
                                : redemption.status === "approved"
                                  ? "تمت الموافقة"
                                  : redemption.status === "delivered"
                                    ? "تم التسليم"
                                    : redemption.status}
                            </div>
                          </div>
                                <div className="text-xs text-muted-foreground">{formatDate(redemption.created_at)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
                </>
              )}
        </TabsContent>
          </Tabs>
        </div>
      </div>
  )
}
