"use client"

import { useState, useEffect } from "react"
import { getUserPointsAnalytics } from "@/app/actions/points-enhanced"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import { Loader2, TrendingUp, TrendingDown } from "lucide-react"

interface PointsAnalyticsProps {
  userId?: string
}

export function PointsAnalytics({ userId }: PointsAnalyticsProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      try {
        const result = await getUserPointsAnalytics(userId)
        if (result.success) {
          setAnalyticsData(result.data)
        } else {
          toast({
            title: "خطأ في تحميل البيانات",
            description: result.message || "حدث خطأ أثناء تحميل بيانات النقاط",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error fetching points analytics:", error)
        toast({
          title: "خطأ في تحميل البيانات",
          description: "حدث خطأ أثناء تحميل بيانات النقاط",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [userId])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date)
  }

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="mr-2">جاري تحميل بيانات النقاط...</span>
      </div>
    )
  }

  if (!analyticsData) {
    return <div className="text-center py-8 text-muted-foreground">لا توجد بيانات متاحة</div>
  }

  // Calculate positive and negative totals
  const positiveTotal = analyticsData.categoriesData
    .filter((cat: any) => cat.is_positive)
    .reduce((sum: number, cat: any) => sum + Number(cat.total_points), 0)

  const negativeTotal = analyticsData.categoriesData
    .filter((cat: any) => !cat.is_positive)
    .reduce((sum: number, cat: any) => sum + Number(cat.total_points), 0)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">إجمالي النقاط</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalPoints}</div>
            <p className="text-xs text-muted-foreground">الرصيد الحالي من النقاط</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">النقاط المكتسبة</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{positiveTotal}</div>
            <p className="text-xs text-muted-foreground">إجمالي النقاط الإيجابية</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">النقاط المخصومة</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{negativeTotal}</div>
            <p className="text-xs text-muted-foreground">إجمالي النقاط السلبية</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="categories">الفئات</TabsTrigger>
          <TabsTrigger value="history">السجل</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>تطور النقاط</CardTitle>
              <CardDescription>تطور النقاط خلال الأشهر الستة الماضية</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsData.monthlyData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">لا توجد بيانات متاحة</div>
              ) : (
                <div className="h-[300px] w-full">
                  <div className="flex h-full flex-col justify-between">
                    <div className="flex h-full w-full items-end gap-2">
                      {analyticsData.monthlyData.map((month: any, index: number) => (
                        <div key={index} className="relative flex h-full w-full flex-col justify-end">
                          {month.positive_points > 0 && (
                            <div
                              className="w-full bg-green-500 transition-all"
                              style={{
                                height: `${(month.positive_points / Math.max(...analyticsData.monthlyData.map((m: any) => Math.max(m.positive_points, m.negative_points)))) * 100}%`,
                              }}
                            ></div>
                          )}
                          {month.negative_points > 0 && (
                            <div
                              className="w-full bg-destructive transition-all"
                              style={{
                                height: `${(month.negative_points / Math.max(...analyticsData.monthlyData.map((m: any) => Math.max(m.positive_points, m.negative_points)))) * 100}%`,
                              }}
                            ></div>
                          )}
                          <div className="absolute bottom-0 w-full text-center text-xs">
                            {month.month.substring(0, 3)}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex justify-between text-xs text-muted-foreground">
                      <div className="flex items-center">
                        <div className="mr-1 h-3 w-3 rounded-full bg-green-500"></div>
                        <span>النقاط المكتسبة</span>
                      </div>
                      <div className="flex items-center">
                        <div className="mr-1 h-3 w-3 rounded-full bg-destructive"></div>
                        <span>النقاط المخصومة</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>النقاط حسب الفئة</CardTitle>
              <CardDescription>توزيع النقاط على مختلف الفئات</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsData.categoriesData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">لا توجد بيانات متاحة</div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <h3 className="mb-2 font-medium">النقاط الإيجابية</h3>
                      {analyticsData.categoriesData
                        .filter((cat: any) => cat.is_positive)
                        .map((category: any, index: number) => (
                          <div key={index} className="mb-2">
                            <div className="flex justify-between text-sm">
                              <span>{category.category_name || "بدون فئة"}</span>
                              <span className="font-medium text-green-500">{category.total_points}</span>
                            </div>
                            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full bg-green-500"
                                style={{
                                  width: `${(category.total_points / positiveTotal) * 100}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        ))}
                    </div>
                    <div>
                      <h3 className="mb-2 font-medium">النقاط السلبية</h3>
                      {analyticsData.categoriesData
                        .filter((cat: any) => !cat.is_positive)
                        .map((category: any, index: number) => (
                          <div key={index} className="mb-2">
                            <div className="flex justify-between text-sm">
                              <span>{category.category_name || "بدون فئة"}</span>
                              <span className="font-medium text-destructive">{category.total_points}</span>
                            </div>
                            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full bg-destructive"
                                style={{
                                  width: `${(category.total_points / negativeTotal) * 100}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>آخر المعاملات</CardTitle>
              <CardDescription>آخر 10 معاملات للنقاط</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsData.recentTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">لا توجد معاملات حديثة</div>
              ) : (
                <div className="rounded-md border">
                  <div className="grid grid-cols-1 divide-y">
                    {analyticsData.recentTransactions.map((transaction: any) => (
                      <div key={transaction.id} className="p-4">
                        <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
                          <div>
                            <div className="font-medium">{transaction.description}</div>
                            <div className="text-xs text-muted-foreground">
                              الفئة: {transaction.point_categories?.name || "بدون فئة"}
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
