"use client"

import { useState, useEffect } from "react"
import { getCurrentUser } from "@/lib/utils/auth-compat"
import { createClient } from "@/lib/supabase/client"
import { Loader2, BarChart3, Trophy } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { TABLES } from "@/lib/constants"
import { StudentRecordsClient } from "./student-records-client"

export default function StudentRecordsPage() {
  const [user, setUser] = useState<any>(null)
  const [records, setRecords] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("month")
  const [activeTab, setActiveTab] = useState("records")
  const supabase = createClient()
  const [pointsData, setPointsData] = useState({
    totalPoints: 0,
    positivePoints: 0,
    negativePoints: 0,
    allTimeTotal: 0,
    allTimePositive: 0,
    allTimeNegative: 0,
    topCategories: [] as Array<{
      id: number;
      name: string;
      is_positive: boolean;
      total_points: number;
    }>
  })

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
        
        // Calculate date range
        const now = new Date()
        const startDate = new Date()

        switch (timeRange) {
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
        
        // Get points transactions
        const { data: pointsData, error: pointsError } = await supabase
          .from("points_transactions")
          .select("*, category:point_categories(name)")
          .eq("user_id", userData.id)
          .gte("created_at", startDateStr)
          .order("created_at", { ascending: false })
          .limit(30)
        
        if (pointsError) {
          console.error("Error fetching points transactions:", pointsError)
          throw new Error("فشل في جلب معاملات النقاط")
        }
        
        // Calculate totals
        let totalPoints = 0
        let positivePoints = 0
        let negativePoints = 0

        if (pointsData && pointsData.length > 0) {
          pointsData.forEach((transaction) => {
            if (transaction.is_positive) {
              positivePoints += transaction.points
              totalPoints += transaction.points
            } else {
              negativePoints += transaction.points
              totalPoints -= transaction.points
            }
          })
        }
        
        // Get all-time points statistics
        const { data: allPointsStats, error: allPointsError } = await supabase
          .from("points_transactions")
          .select("points, is_positive")
          .eq("user_id", userData.id)
      
        if (allPointsError) {
          console.error("Error fetching all-time points:", allPointsError)
        }

        // Get top point categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from("points_transactions")
          .select("points, is_positive, category:point_categories(id, name)")
          .eq("user_id", userData.id)
          .not("category", "is", null)
          
        type CategoryData = {
          points: number;
          is_positive: boolean;
          category: {
            id: number;
            name: string;
          };
        }
        
        let topCategories: Array<{
          id: number;
          name: string;
          is_positive: boolean;
          total_points: number;
        }> = []
        
        if (!categoriesError && categoriesData) {
          // Group by category and count total points
          const categoryMap = new Map<number, {
            id: number;
            name: string;
            is_positive: boolean;
            total_points: number;
          }>();
          
          (categoriesData as unknown as CategoryData[]).forEach(transaction => {
            if (transaction.category) {
              const id = transaction.category.id;
              const name = transaction.category.name;
              const points = transaction.points;
              const isPositive = transaction.is_positive;
              
              if (!categoryMap.has(id)) {
                categoryMap.set(id, {
                  id,
                  name,
                  is_positive: isPositive,
                  total_points: 0
                });
              }
              
              const category = categoryMap.get(id);
              if (category) {
                category.total_points += points;
              }
            }
          });
          
          // Convert map to array and sort by total points
          topCategories = Array.from(categoryMap.values())
            .sort((a, b) => b.total_points - a.total_points)
            .slice(0, 5);
        }

        let allTimeTotal = 0
        let allTimePositive = 0
        let allTimeNegative = 0

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
        
        // Fetch user records
        const { data: userRecords, error: recordsError } = await supabase
          .from(TABLES.USER_RECORDS)
          .select("*")
          .eq("user_id", userData.id)
          .order("created_at", { ascending: false })
        
        if (recordsError) {
          console.error("Error fetching user records:", recordsError)
        }
        
        // Set transactions and records
        setTransactions(pointsData || [])
        setRecords(userRecords || [])
        
        // Set points data
        setPointsData({
          totalPoints,
          positivePoints,
          negativePoints,
          allTimeTotal,
          allTimePositive,
          allTimeNegative,
          topCategories
        })
        
      } catch (error: any) {
        console.error("Error loading records data:", error)
        toast({
          title: "خطأ في تحميل البيانات",
          description: error.message || "حدث خطأ أثناء محاولة تحميل بيانات السجلات",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    loadData()
  }, [supabase, timeRange])
  
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
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="mr-2">جاري تحميل البيانات...</span>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">سجلاتي</h1>
        <p className="text-muted-foreground">عرض سجل الإنجازات والنقاط الخاصة بك</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>إجمالي النقاط</CardTitle>
            <CardDescription>إجمالي النقاط المكتسبة والمخصومة</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pointsData.allTimeTotal}</div>
            <div className="mt-2 flex justify-between text-sm">
              <div className="text-green-600">
                <span className="font-semibold">+{pointsData.allTimePositive}</span> مكتسبة
              </div>
              <div className="text-red-600">
                <span className="font-semibold">-{pointsData.allTimeNegative}</span> مخصومة
              </div>
            </div>
            {timeRange !== "all" && (
              <div className="mt-3 pt-2 border-t text-sm">
                <div className="font-medium mb-1">
                  {timeRange === "week" ? "آخر أسبوع" :
                   timeRange === "month" ? "آخر شهر" :
                   timeRange === "quarter" ? "آخر 3 أشهر" :
                   "آخر سنة"}: {pointsData.totalPoints}
                </div>
                <div className="flex justify-between">
                  <div className="text-green-600">
                    <span>+{pointsData.positivePoints}</span>
                  </div>
                  <div className="text-red-600">
                    <span>-{pointsData.negativePoints}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>الإنجازات</CardTitle>
            <CardDescription>سجل الإنجازات الخاص بك</CardDescription>
          </CardHeader>
          <CardContent>
            {records.length === 0 ? (
              <p className="text-center text-muted-foreground">لا توجد إنجازات مسجلة حتى الآن</p>
            ) : (
              <div className="text-2xl font-bold flex items-center">
                <Trophy className="w-6 h-6 mr-2 text-yellow-500" />
                {records.length} إنجاز
              </div>
            )}
            <div className="mt-2">
              <p className="text-sm text-muted-foreground">
                هذا هو سجل إنجازاتك الإلكتروني. كل إنجاز يتم تسجيله هنا ويمنحك نقاطًا قيمة.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <TabsList className="mb-4 md:mb-0">
            <TabsTrigger value="records">
              <Trophy className="ml-2 h-4 w-4" />
              <span>الإنجازات</span>
            </TabsTrigger>
            <TabsTrigger value="points">
              <BarChart3 className="ml-2 h-4 w-4" />
              <span>النقاط</span>
            </TabsTrigger>
          </TabsList>

          {activeTab === "points" && (
            <div className="flex items-center gap-2">
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
          )}
        </div>
        
        <TabsContent value="records">
          <StudentRecordsClient 
            userId={user?.id} 
            initialRecords={records} 
          />
        </TabsContent>

        <TabsContent value="points">
          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle>آخر معاملات النقاط</CardTitle>
              <CardDescription>أحدث معاملات النقاط في النظام</CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-center text-muted-foreground">لا توجد معاملات حديثة</p>
              ) : (
                <div className="rounded-md border">
                  <div className="grid grid-cols-1 divide-y">
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="p-4">
                        <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
                          <div>
                            <div className="text-sm">{transaction.description}</div>
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
        </TabsContent>
      </Tabs>
    </div>
  )
} 