"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { 
  AlertTriangle, 
  Loader2, 
  Search,
  Check,
  Plus
} from "lucide-react"

export default function NegativePointsPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [students, setStudents] = useState<any[]>([])
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [categories, setCategories] = useState<any[]>([])
  const [formData, setFormData] = useState({
    categoryId: "none",
    points: 0,
    description: "",
  })

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch students
        const { data: studentsData, error: studentsError } = await supabase
          .from("users")
          .select("id, full_name, user_code")
          .eq("role_id", 1) // Only students
          .order("full_name")

        if (studentsError) throw studentsError

        // Fetch negative point categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from("point_categories")
          .select("*")
          .eq("is_positive", false)
          .order("name")

        if (categoriesError) throw categoriesError

        setStudents(studentsData || [])
        setCategories(categoriesData || [])
      } catch (error: any) {
        toast({
          title: "خطأ في تحميل البيانات",
          description: error.message,
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [supabase])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === "points" ? Number(value) : value,
    }))
  }

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, categoryId: value }))
    
    // If a category is selected, use its default points
    if (value) {
      const selectedCategory = categories.find((category) => category.id.toString() === value)
      if (selectedCategory) {
        setFormData((prev) => ({ ...prev, points: selectedCategory.default_points }))
      }
    } else {
      setFormData((prev) => ({ ...prev, points: 0 }))
    }
  }

  const toggleStudent = (studentId: string) => {
    if (selectedStudents.includes(studentId)) {
      setSelectedStudents(selectedStudents.filter((id) => id !== studentId))
    } else {
      setSelectedStudents([...selectedStudents, studentId])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (selectedStudents.length === 0) {
      toast({
        title: "لم يتم اختيار طلاب",
        description: "يرجى اختيار طالب واحد على الأقل لإكمال العملية",
        variant: "destructive",
      })
      return
    }

    if (!formData.categoryId && formData.points <= 0) {
      toast({
        title: "بيانات غير صالحة",
        description: "يرجى اختيار فئة نقاط أو إدخال قيمة للنقاط لإكمال العملية",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Get current user
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error("يجب تسجيل الدخول")
      
      // Determine points to deduct based on category
      let pointsToDeduct = formData.points
      if (formData.categoryId !== "none") {
        const selectedCategory = categories.find((c) => c.id.toString() === formData.categoryId)
        if (selectedCategory && (!formData.points || formData.points === 0)) {
          pointsToDeduct = selectedCategory.default_points
        }
      }

      // Create transactions for each student
      const transactions = selectedStudents.map((studentId) => ({
        user_id: studentId,
        points: pointsToDeduct,
        is_positive: false,
        created_by: userData.user.id,
        description: formData.description,
        category_id: formData.categoryId !== "none" ? formData.categoryId : null,
      }))

      const { error: pointsError } = await supabase.from("points_transactions").insert(transactions)
      if (pointsError) throw pointsError

      // Add notifications for all students
      const notifications = selectedStudents.map((studentId) => ({
        user_id: studentId,
        title: "خصم نقاط",
        content: `تم خصم ${pointsToDeduct} نقطة ${formData.description ? `(${formData.description})` : ""}`,
      }))

      await supabase.from("notifications").insert(notifications)

      toast({
        title: "تمت العملية بنجاح ✓",
        description: `تم خصم ${pointsToDeduct} نقطة لـ ${selectedStudents.length} طالب. تم إرسال إشعار للطلاب المعنيين.`,
        variant: "default",
      })

      // Reset form
      setFormData({
        categoryId: "none",
        points: 0,
        description: "",
      })
      setSelectedStudents([])
    } catch (error: any) {
      console.error("Error deducting points:", error)
      toast({
        title: "فشلت العملية",
        description: error.message || "حدث خطأ أثناء محاولة خصم النقاط. الرجاء المحاولة مرة أخرى.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter students based on search query
  const filteredStudents = students.filter(
    (student) =>
      student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.user_code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="mr-2">جاري تحميل البيانات...</span>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold">خصم نقاط سلبية</h1>
        <p className="text-muted-foreground mb-6">خصم نقاط من الطلاب بناءً على المخالفات أو السلوك غير المرغوب</p>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Points Form */}
          <Card>
            <CardHeader>
              <CardTitle>خصم نقاط</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="categoryId">فئة النقاط</Label>
                  <Select value={formData.categoryId} onValueChange={handleSelectChange}>
                    <SelectTrigger id="categoryId">
                      <SelectValue placeholder="اختر فئة النقاط" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون فئة</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name} ({category.default_points} نقطة)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="points">
                    عدد النقاط {formData.categoryId && "(اختياري، سيتم استخدام القيمة الافتراضية للفئة)"}
                  </Label>
                  <Input
                    id="points"
                    name="points"
                    type="number"
                    min="0"
                    value={formData.points}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">سبب خصم النقاط (اختياري)</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="أدخل سبب خصم النقاط"
                    value={formData.description}
                    onChange={handleChange}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting || selectedStudents.length === 0}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      جاري الخصم...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="ml-2 h-4 w-4" />
                      خصم النقاط ({selectedStudents.length} طالب)
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Students Selection */}
          <Card>
            <CardHeader>
              <CardTitle>اختيار الطلاب</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="البحث عن طالب..."
                    className="pr-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-2 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  تم اختيار {selectedStudents.length} من أصل {students.length} طالب
                </span>
                {selectedStudents.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedStudents([])}>
                    إلغاء الاختيار
                  </Button>
                )}
              </div>

              <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-md p-2">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-muted transition-colors ${
                        selectedStudents.includes(student.id) ? "bg-primary/10" : ""
                      }`}
                      onClick={() => toggleStudent(student.id)}
                    >
                      <div className="flex items-center">
                        <div
                          className={`h-5 w-5 border rounded-md mr-2 flex items-center justify-center ${
                            selectedStudents.includes(student.id)
                              ? "bg-primary border-primary"
                              : "border-input"
                          }`}
                        >
                          {selectedStudents.includes(student.id) && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <span className="font-medium">{student.full_name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{student.user_code}</span>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center text-muted-foreground">لا توجد نتائج مطابقة للبحث</div>
                )}
              </div>

              {students.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-4 w-full" 
                  onClick={() => setSelectedStudents(students.map(s => s.id))}
                >
                  <Plus className="ml-2 h-4 w-4" />
                  اختيار جميع الطلاب
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
} 