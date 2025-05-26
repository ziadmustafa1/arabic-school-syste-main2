"use client"

import { useState, useEffect } from "react"
import { getCurrentUser } from "@/lib/utils/auth-compat"
import { createClient } from "@/lib/supabase/client"
import { Loader2, TrendingUp, TrendingDown } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TABLES } from "@/lib/constants"
import { StudentRecordsClient } from "@/app/student/records/student-records-client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function TeacherRecordsPage() {
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
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    category: "سلوكي",
    description: "",
    points_value: 10,
    is_positive: false,
  })
  const [showNewRecordDialog, setShowNewRecordDialog] = useState(false)

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
        
        // Get teacher's related activities
        const { data: teacherRecords, error: recordsError } = await supabase
          .from(TABLES.USER_RECORDS)
          .select("*")
          .eq("user_id", userData.id)
          .order("created_at", { ascending: false })
        
        if (recordsError) {
          console.error("Error fetching user records:", recordsError)
          toast({
            title: "خطأ في تحميل البيانات",
            description: "حدث خطأ أثناء محاولة تحميل سجلات المعلم",
            variant: "destructive",
          })
        }
        
        // Set transactions and records
        setRecords(teacherRecords || [])
        
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

  const handleCreateRecord = async () => {
    if (!formData.title) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى إدخال عنوان للسجل",
        variant: "destructive",
      })
      return
    }

    if (formData.points_value <= 0) {
      toast({
        title: "خطأ في البيانات",
        description: "يجب أن تكون قيمة النقاط أكبر من الصفر",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)

      // Generate a unique record code
      const recordCode = `REC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      
      // Create the record
      const { data: newRecord, error } = await supabase
        .from(TABLES.USER_RECORDS)
        .insert({
          record_code: recordCode,
          user_id: user.id,
          title: formData.title,
          category: formData.category,
          description: formData.description,
          points_value: formData.points_value,
          is_positive: formData.is_positive,
          valid_from: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error

      toast({
        title: "تم إنشاء السجل بنجاح",
        description: `تم إنشاء سجل جديد بقيمة ${formData.points_value} نقطة`,
      })

      // Reset form and close dialog
      setFormData({
        title: "",
        category: "سلوكي",
        description: "",
        points_value: 10,
        is_positive: false,
      })
      setShowNewRecordDialog(false)

      // Refresh records
      const { data: teacherRecords } = await supabase
        .from(TABLES.USER_RECORDS)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
      
      setRecords(teacherRecords || [])
    } catch (error) {
      console.error("Error creating record:", error)
      toast({
        title: "خطأ في إنشاء السجل",
        description: "حدث خطأ أثناء محاولة إنشاء السجل",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === "points_value" ? Number(value) : value,
    }))
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }))
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
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">سجلاتي</h1>
        
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="اختر الفترة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">آخر أسبوع</SelectItem>
              <SelectItem value="month">آخر شهر</SelectItem>
              <SelectItem value="quarter">آخر 3 أشهر</SelectItem>
              <SelectItem value="year">آخر سنة</SelectItem>
              <SelectItem value="all">كل السجلات</SelectItem>
            </SelectContent>
          </Select>
          
          <Dialog open={showNewRecordDialog} onOpenChange={setShowNewRecordDialog}>
            <DialogTrigger asChild>
              <Button>إضافة سجل جديد</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>إضافة سجل جديد</DialogTitle>
                <DialogDescription>
                  أضف سجل نقاط إيجابي أو سلبي لحسابك
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="title" className="text-right">
                    العنوان
                  </Label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="عنوان السجل"
                    className="col-span-3"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category" className="text-right">
                    الفئة
                  </Label>
                  <Select 
                    name="category" 
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="اختر الفئة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="تعليمي">تعليمي</SelectItem>
                      <SelectItem value="سلوكي">سلوكي</SelectItem>
                      <SelectItem value="مجتمعي">مجتمعي</SelectItem>
                      <SelectItem value="احترافي">احترافي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="points_value" className="text-right">
                    النقاط
                  </Label>
                  <Input
                    id="points_value"
                    name="points_value"
                    type="number"
                    value={formData.points_value}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
      </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="is_positive" className="text-right">
                    نوع السجل
                  </Label>
                  <div className="flex items-center gap-4 col-span-3">
                    <Label htmlFor="is_positive-positive" className="flex items-center gap-2 cursor-pointer">
                      <input
                        id="is_positive-positive"
                        type="radio"
                        name="is_positive"
                        checked={formData.is_positive === true}
                        onChange={() => setFormData(prev => ({ ...prev, is_positive: true }))}
                      />
                      <span className="flex items-center">
                        <TrendingUp className="h-4 w-4 text-green-500 ml-1" />
                        إيجابي
                      </span>
                    </Label>
                    <Label htmlFor="is_positive-negative" className="flex items-center gap-2 cursor-pointer">
                      <input
                        id="is_positive-negative"
                        type="radio"
                        name="is_positive"
                        checked={formData.is_positive === false}
                        onChange={() => setFormData(prev => ({ ...prev, is_positive: false }))}
                      />
                      <span className="flex items-center">
                        <TrendingDown className="h-4 w-4 text-destructive ml-1" />
                        سلبي
                      </span>
                    </Label>
                  </div>
        </div>
        
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="description" className="text-right">
                    الوصف
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="وصف السجل..."
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleCreateRecord} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      جاري الإنشاء...
                    </>
                  ) : (
                    "إنشاء السجل"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 mb-4">
          <TabsTrigger value="records">سجلات النقاط</TabsTrigger>
          <TabsTrigger value="activities">النشاطات والأحداث</TabsTrigger>
          <TabsTrigger value="statistics">إحصائيات</TabsTrigger>
        </TabsList>
        
        <TabsContent value="records" className="space-y-4">
          {user && <StudentRecordsClient userId={user.id} initialRecords={records} />}
        </TabsContent>
        
        <TabsContent value="activities">
          <Card>
            <CardHeader>
              <CardTitle>نشاطات المعلم</CardTitle>
              <CardDescription>سجل نشاطاتك في النظام</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="p-4 text-center text-muted-foreground">
                  سيتم عرض سجل نشاطاتك هنا قريباً
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="statistics">
          <Card>
            <CardHeader>
              <CardTitle>إحصائيات</CardTitle>
              <CardDescription>ملخص لنشاطاتك وأدائك</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="p-4 text-center text-muted-foreground">
                  سيتم عرض إحصائيات أدائك هنا قريباً
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 