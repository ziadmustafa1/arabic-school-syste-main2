"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { batchAddPoints } from "@/app/actions/points-enhanced"
import { getCategories } from "@/app/actions/points-categories"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Plus, TrendingUp, TrendingDown, Users, Award } from "lucide-react"
import { MultiUserSelector } from "@/components/ui/multi-user-selector"

type RestrictedPoint = {
  id: number
  user_id: string
  category_id: number
  points: number
  created_at: string
  is_resolved: boolean
  created_by: string
  user_full_name: string
  user_code: string
  category_name: string
}

export default function PointsManagementPage() {
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPoints: 0,
    positivePoints: 0,
    negativePoints: 0,
    activeUsers: 0,
  })
  const [formData, setFormData] = useState({
    userCodes: "",
    points: 0,
    isPositive: true,
    categoryId: "",
    description: "",
  })
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        
        // Fetch point categories using server action
        const categoriesResult = await getCategories();
        
        if (!categoriesResult.success) {
          console.error("Error fetching categories:", categoriesResult.error);
          toast({
            title: "خطأ في تحميل الفئات",
            description: categoriesResult.error || "حدث خطأ أثناء تحميل فئات النقاط",
            variant: "destructive",
          });
        } else {
          // Set categories
          setCategories(categoriesResult.data || []);
        }

        try {
          // Attempt to fetch statistics
          const { data: statsData, error: statsError } = await supabase.rpc("get_points_system_stats")

          if (statsError) {
            console.error("Stats error:", statsError)
            // Set default stats values if RPC fails
            setStats({
              totalUsers: 0,
              totalPoints: 0,
              positivePoints: 0,
              negativePoints: 0,
              activeUsers: 0,
            })
          } else if (statsData && statsData[0]) {
            setStats({
              totalUsers: statsData[0].total_users || 0,
              totalPoints: statsData[0].total_points || 0,
              positivePoints: statsData[0].positive_points || 0,
              negativePoints: statsData[0].negative_points || 0,
              activeUsers: statsData[0].active_users || 0,
            })
          }
        } catch (statsError) {
          console.error("Error fetching stats:", statsError)
          // Set default stats values if RPC throws an exception
          setStats({
            totalUsers: 0,
            totalPoints: 0,
            positivePoints: 0,
            negativePoints: 0,
            activeUsers: 0,
          })
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "خطأ في تحميل البيانات",
          description: "حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, []) // Remove supabase from dependency array

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === "points" ? Number(value) : value,
    }))
  }

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, isPositive: checked }))
  }

  const handleSelectChange = (value: string) => {
    if (value === "none") {
      // Handle "none" option (previously an empty string)
      setFormData(prev => ({ ...prev, categoryId: "" }));
      return;
    }
    
    if (value) {
      const selectedCategory = categories.find(category => category.id.toString() === value);
      if (selectedCategory) {
        setFormData(prev => ({ 
          ...prev, 
          categoryId: value,
          points: selectedCategory.default_points,
          isPositive: selectedCategory.is_positive
        }));
      } else {
        setFormData(prev => ({ ...prev, categoryId: value }));
      }
    } else {
      setFormData(prev => ({ ...prev, categoryId: value }));
    }
  }

  const handleMultiUserChange = (userIds: string[]) => {
    setSelectedUserIds(userIds)
  }

  const handleUserCodesChange = (codes: string) => {
    setFormData(prev => ({ ...prev, userCodes: codes }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!formData.userCodes.trim()) {
        throw new Error("يرجى إدخال رمز مستخدم واحد على الأقل")
      }

      if (formData.points <= 0) {
        throw new Error("يجب أن تكون قيمة النقاط أكبر من صفر")
      }

      const formDataObj = new FormData()
      formDataObj.append("userCodes", formData.userCodes)
      formDataObj.append("points", formData.points.toString())
      formDataObj.append("isPositive", formData.isPositive.toString())
      formDataObj.append("categoryId", formData.categoryId)
      formDataObj.append("description", formData.description)

      const result = await batchAddPoints(formDataObj)

      if (!result.success) {
        throw new Error(result.message)
      }

      toast({
        title: "تمت العملية بنجاح ✓",
        description: result.message || "تمت إضافة/خصم النقاط للمستخدمين المحددين",
        variant: "default",
      })

      // Reset form
      setFormData({
        userCodes: "",
        points: 0,
        isPositive: true,
        categoryId: "",
        description: "",
      })

      // Show additional info if there are missing user codes
      if (result.data?.missingUserCodes && result.data.missingUserCodes.length > 0) {
        toast({
          title: "تنبيه - بعض الرموز غير صالحة",
          description: `لم يتم العثور على بعض رموز المستخدمين: ${result.data.missingUserCodes.join(", ")}`,
          variant: "destructive",
        })
      }
      
      // Show additional info if points were successfully added
      if (result.data?.processedCount) {
        toast({
          title: "ملخص العملية",
          description: `تم إضافة ${formData.isPositive ? "نقاط إيجابية" : "نقاط سلبية"} لـ ${result.data.processedCount} مستخدم بنجاح`,
          variant: "default",
        })
      }
    } catch (error: any) {
      toast({
        title: "فشلت العملية",
        description: error.message || "حدث خطأ أثناء تنفيذ العملية. يرجى التحقق من البيانات والمحاولة مرة أخرى",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="mr-2">جاري تحميل البيانات...</span>
        </div>
    )
  }

  return (
    <div className="container mx-auto p-2 sm:p-4">
        <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">إدارة النقاط</h1>

        <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-4 sm:mb-6">
          <Card>
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-sm font-medium">إجمالي المستخدمين</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="flex items-center justify-between">
                <Users className="h-5 w-5 text-muted-foreground" />
                <p className="text-xl sm:text-2xl font-bold">{stats.totalUsers}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-sm font-medium">إجمالي النقاط</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="flex items-center justify-between">
                <Award className="h-5 w-5 text-muted-foreground" />
                <p className="text-xl sm:text-2xl font-bold">{stats.totalPoints}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-sm font-medium">النقاط الإيجابية</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="flex items-center justify-between">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <p className="text-xl sm:text-2xl font-bold text-green-500">{stats.positivePoints}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-sm font-medium">النقاط السلبية</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="flex items-center justify-between">
                <TrendingDown className="h-5 w-5 text-red-500" />
                <p className="text-xl sm:text-2xl font-bold text-red-500">{stats.negativePoints}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="add" className="mb-4 sm:mb-6">
          <TabsList className="mb-4 w-full flex flex-wrap">
            <TabsTrigger value="add" className="flex-1 text-xs sm:text-sm">إضافة نقاط</TabsTrigger>
            <TabsTrigger value="restrictions" className="flex-1 text-xs sm:text-sm">النقاط المقيدة</TabsTrigger>
            <TabsTrigger value="history" className="flex-1 text-xs sm:text-sm">سجل النقاط</TabsTrigger>
          </TabsList>

          <TabsContent value="add">
            <Card>
                <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-4 pb-2">
                <CardTitle className="text-base sm:text-lg">إضافة/خصم نقاط متعددة</CardTitle>
                <CardDescription className="text-xs sm:text-sm">أضف أو اخصم نقاط لعدة مستخدمين دفعة واحدة</CardDescription>
                </CardHeader>
              <CardContent className="px-3 sm:px-6 py-2 sm:py-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="userCodes" className="text-sm">رموز المستخدمين</Label>
                    <Textarea
                      id="userCodes"
                      name="userCodes"
                      placeholder="أدخل رموز المستخدمين مفصولة بفواصل (مثال: ST1234, ST5678)"
                      value={formData.userCodes}
                      onChange={handleChange}
                      className="min-h-[80px] text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      أدخل رموز المستخدمين مفصولة بفواصل. يمكنك إضافة نقاط للطلاب أو المعلمين أو أولياء الأمور.
                    </p>
                  </div>

                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="categoryId" className="text-sm">فئة النقاط</Label>
                      <Select
                        value={formData.categoryId || "none"}
                        onValueChange={handleSelectChange}
                      >
                      <SelectTrigger className="text-sm h-9">
                        <SelectValue placeholder="اختر فئة النقاط" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-sm">بدون فئة</SelectItem>
                          {categories.map(category => (
                          <SelectItem key={category.id} value={category.id.toString()} className="text-sm">
                              {category.name} ({category.default_points} نقطة)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="points" className="text-sm">عدد النقاط</Label>
                    <Input
                      id="points"
                      name="points"
                      type="number"
                      min="0"
                      placeholder="أدخل عدد النقاط"
                      value={formData.points || ""}
                      onChange={handleChange}
                      className="text-sm h-9"
                    />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 flex-row-reverse">
                      <Label htmlFor="isPositive" className="text-sm">إضافة نقاط (تشغيل) / خصم نقاط (إيقاف)</Label>
                    <Switch
                      id="isPositive"
                      checked={formData.isPositive}
                      onCheckedChange={handleSwitchChange}
                    />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formData.isPositive
                        ? "سيتم إضافة نقاط إيجابية للمستخدمين المحددين"
                        : "سيتم خصم نقاط من المستخدمين المحددين"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm">الوصف (اختياري)</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="أدخل وصفاً للعملية"
                      value={formData.description}
                      onChange={handleChange}
                      className="text-sm"
                    />
                  </div>
                </form>
                </CardContent>
              <CardFooter className="flex justify-center sm:justify-end px-3 sm:px-6 pb-3 pt-0">
                <Button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto text-sm"
                >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      جاري المعالجة...
                      </>
                    ) : (
                    <>تنفيذ العملية</>
                    )}
                  </Button>
                </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="restrictions">
            <RestrictionsManagementView />
          </TabsContent>

          <TabsContent value="history">
            <PointsHistoryView />
          </TabsContent>
        </Tabs>
      </div>
  )
}

function PointsHistoryView() {
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [transactions, setTransactions] = useState<any[]>([])
  const [filter, setFilter] = useState({
    period: "week",
    category: "",
    type: "all",
  })

  useEffect(() => {
    fetchTransactions()
  }, [filter])

  async function fetchTransactions() {
    setIsLoading(true)
    try {
      let query = supabase
        .from("points_transactions")
        .select(
          `
          id,
          points,
          is_positive,
          description,
          created_at,
          users!points_transactions_user_id_fkey(id, full_name, user_code),
          creator:users!points_transactions_created_by_fkey(full_name),
          point_categories(id, name)
        `,
        )
        .order("created_at", { ascending: false })
        .limit(100)

      // Apply period filter
      const now = new Date()
      let startDate: Date
      switch (filter.period) {
        case "day":
          startDate = new Date(now.setHours(0, 0, 0, 0))
          query = query.gte("created_at", startDate.toISOString())
          break
        case "week":
          startDate = new Date(now.setDate(now.getDate() - 7))
          query = query.gte("created_at", startDate.toISOString())
          break
        case "month":
          startDate = new Date(now.setMonth(now.getMonth() - 1))
          query = query.gte("created_at", startDate.toISOString())
          break
        case "year":
          startDate = new Date(now.setFullYear(now.getFullYear() - 1))
          query = query.gte("created_at", startDate.toISOString())
          break
      }

      // Apply category filter
      if (filter.category) {
        query = query.eq("category_id", filter.category)
      }

      // Apply type filter
      if (filter.type === "positive") {
        query = query.eq("is_positive", true)
      } else if (filter.type === "negative") {
        query = query.eq("is_positive", false)
      }

      const { data, error } = await query

      if (error) throw error

      setTransactions(data || [])
    } catch (error) {
      console.error("Error fetching transactions:", error)
      toast({
        title: "خطأ في تحميل البيانات",
        description: "حدث خطأ أثناء تحميل سجل النقاط. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilter((prev) => ({ ...prev, [key]: value }))
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

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="mr-2">جاري تحميل البيانات...</span>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-4 pb-2">
        <CardTitle className="text-base sm:text-lg">سجل معاملات النقاط</CardTitle>
        <CardDescription className="text-xs sm:text-sm">عرض سجل معاملات النقاط في النظام</CardDescription>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 py-2 sm:py-4">
        <div className="mb-4 sm:mb-6 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <div className="w-full">
            <Label htmlFor="period" className="mb-2 block text-sm">
              الفترة الزمنية
            </Label>
            <Select value={filter.period} onValueChange={(value) => handleFilterChange("period", value)}>
              <SelectTrigger id="period" className="text-sm h-9">
                <SelectValue placeholder="اختر الفترة الزمنية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day" className="text-sm">اليوم</SelectItem>
                <SelectItem value="week" className="text-sm">آخر أسبوع</SelectItem>
                <SelectItem value="month" className="text-sm">آخر شهر</SelectItem>
                <SelectItem value="year" className="text-sm">آخر سنة</SelectItem>
                <SelectItem value="all_time" className="text-sm">الكل</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full">
            <Label htmlFor="type" className="mb-2 block text-sm">
              نوع المعاملة
            </Label>
            <Select value={filter.type} onValueChange={(value) => handleFilterChange("type", value)}>
              <SelectTrigger id="type" className="text-sm h-9">
                <SelectValue placeholder="اختر نوع المعاملة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-sm">الكل</SelectItem>
                <SelectItem value="positive" className="text-sm">إيجابي</SelectItem>
                <SelectItem value="negative" className="text-sm">سلبي</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full">
            <Button
              variant="outline"
              className="mt-8 w-full text-sm h-9"
              onClick={() => {
                setFilter({
                  period: "week",
                  category: "",
                  type: "all",
                })
              }}
            >
              إعادة تعيين الفلتر
            </Button>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">لا توجد معاملات في السجل</div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 sm:p-3 text-right">المستخدم</th>
                    <th className="p-2 sm:p-3 text-right">النقاط</th>
                    <th className="p-2 sm:p-3 text-right hidden md:table-cell">الوصف</th>
                    <th className="p-2 sm:p-3 text-right hidden md:table-cell">الفئة</th>
                    <th className="p-2 sm:p-3 text-right hidden sm:table-cell">بواسطة</th>
                    <th className="p-2 sm:p-3 text-right">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-t">
                      <td className="p-2 sm:p-3">
                        <div className="font-medium text-sm">{transaction.users?.full_name}</div>
                        <div className="text-xs text-muted-foreground">{transaction.users?.user_code}</div>
                      </td>
                      <td className="p-2 sm:p-3">
                        <span
                          className={
                            transaction.is_positive
                              ? "text-green-600 font-medium"
                              : "text-red-600 font-medium"
                          }
                        >
                          {transaction.is_positive ? "+" : "-"}
                          {transaction.points}
                        </span>
                      </td>
                      <td className="p-2 sm:p-3 hidden md:table-cell">{transaction.description}</td>
                      <td className="p-2 sm:p-3 hidden md:table-cell">{transaction.point_categories?.name || "-"}</td>
                      <td className="p-2 sm:p-3 hidden sm:table-cell">{transaction.creator?.full_name || "-"}</td>
                      <td className="p-2 sm:p-3 whitespace-nowrap text-xs sm:text-sm">{formatDate(transaction.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RestrictionsManagementView() {
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [restrictions, setRestrictions] = useState<RestrictedPoint[]>([])
  const [isResolving, setIsResolving] = useState(false)
  const [selectedRestriction, setSelectedRestriction] = useState<number | null>(null)

  useEffect(() => {
    fetchRestrictions()
  }, [])

  async function fetchRestrictions() {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("restricted_points")
        .select(`
          id,
          user_id,
          category_id,
          points,
          created_at,
          is_resolved,
          created_by,
          users:user_id(full_name, user_code),
          point_categories:category_id(name)
        `)
        .eq("is_resolved", false)
        .order("created_at", { ascending: false })

      if (error) throw error

      // Transform the data for easier rendering
      const formattedData = data?.map(item => ({
        id: item.id,
        user_id: item.user_id,
        category_id: item.category_id,
        points: item.points,
        created_at: item.created_at,
        is_resolved: item.is_resolved,
        created_by: item.created_by,
        user_full_name: item.users?.full_name || "غير معروف",
        user_code: item.users?.user_code || "غير معروف",
        category_name: item.point_categories?.name || "غير معروف"
      })) || []

      setRestrictions(formattedData)
    } catch (error) {
      console.error("Error fetching restrictions:", error)
      toast({
        title: "خطأ في تحميل البيانات",
        description: "حدث خطأ أثناء تحميل قيود النقاط. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resolveRestriction = async (restrictionId: number) => {
    setIsResolving(true)
    setSelectedRestriction(restrictionId)
    
    try {
      // Update the restriction to mark it as resolved
      const { error: updateError } = await supabase
        .from("restricted_points")
        .update({ is_resolved: true })
        .eq("id", restrictionId)
      
      if (updateError) throw updateError
      
      // Get the restriction details to notify the user
      const { data: restrictionData } = await supabase
        .from("restricted_points")
        .select(`
          user_id,
          points,
          category_id,
          point_categories:category_id(name)
        `)
        .eq("id", restrictionId)
        .single()
      
      if (restrictionData) {
        // Add a notification for the student
        await supabase.from("notifications").insert({
          user_id: restrictionData.user_id,
          title: "تم رفع القيد",
          content: `تم رفع القيد عن ${restrictionData.points} نقطة من فئة "${restrictionData.point_categories?.name || ''}" ويمكنك الآن دفع هذه النقاط.`
        })
      }
      
      toast({
        title: "تم رفع القيد بنجاح",
        description: "تم رفع قيد النقاط وإخطار الطالب بذلك.",
      })
      
      // Refresh the list
      fetchRestrictions()
    } catch (error) {
      console.error("Error resolving restriction:", error)
      toast({
        title: "خطأ في رفع القيد",
        description: "حدث خطأ أثناء محاولة رفع القيد. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      })
    } finally {
      setIsResolving(false)
      setSelectedRestriction(null)
    }
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

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="mr-2">جاري تحميل البيانات...</span>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-4 pb-2">
        <CardTitle className="text-base sm:text-lg">إدارة قيود النقاط</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          يمكنك من هنا عرض وإدارة قيود النقاط المفروضة على الطلاب ورفع القيود التي تم حلها
        </CardDescription>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 py-2 sm:py-4">
        {restrictions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">لا توجد قيود نقاط نشطة</div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 sm:p-3 text-right">الطالب</th>
                    <th className="p-2 sm:p-3 text-right">فئة النقاط</th>
                    <th className="p-2 sm:p-3 text-right">النقاط</th>
                    <th className="p-2 sm:p-3 text-right hidden sm:table-cell">تاريخ القيد</th>
                    <th className="p-2 sm:p-3 text-right">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {restrictions.map((restriction) => (
                    <tr key={restriction.id} className="border-t">
                      <td className="p-2 sm:p-3">
                        <div className="font-medium text-sm">{restriction.user_full_name}</div>
                        <div className="text-xs text-muted-foreground">{restriction.user_code}</div>
                      </td>
                      <td className="p-2 sm:p-3 text-sm">{restriction.category_name}</td>
                      <td className="p-2 sm:p-3 text-destructive font-medium">{restriction.points}</td>
                      <td className="p-2 sm:p-3 text-xs sm:text-sm hidden sm:table-cell">{formatDate(restriction.created_at)}</td>
                      <td className="p-2 sm:p-3">
                        <Button 
                          size="sm" 
                          onClick={() => resolveRestriction(restriction.id)}
                          disabled={isResolving && selectedRestriction === restriction.id}
                          className="text-xs h-8 w-full sm:w-auto"
                        >
                          {isResolving && selectedRestriction === restriction.id ? (
                            <>
                              <Loader2 className="ml-1 h-3 w-3 animate-spin" />
                              جاري الرفع...
                            </>
                          ) : (
                            "رفع القيد"
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
