"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Loader2, Users, School, Calendar } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import { ClassTeachers } from "@/app/components/class/class-teachers"

export default function ClassDetailsPage() {
  const { id } = useParams()
  const classId = typeof id === 'string' ? parseInt(id) : 0
  const [classData, setClassData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function loadClassData() {
      if (!classId) {
        setError("معرف الفصل غير صالح")
        setLoading(false)
        return
      }
      
      setLoading(true)
      try {
        // Get class details
        const { data, error: classError } = await supabase
          .from("classes")
          .select("*, teacher:teacher_id(id, full_name, user_code)")
          .eq("id", classId)
          .single()
        
        if (classError) {
          throw classError
        }
        
        setClassData(data)
      } catch (err: any) {
        console.error("Error loading class data:", err)
        setError(err.message || "حدث خطأ أثناء تحميل بيانات الفصل")
        toast({
          variant: "destructive",
          title: "خطأ في تحميل البيانات",
          description: err.message || "حدث خطأ أثناء تحميل بيانات الفصل",
        })
      } finally {
        setLoading(false)
      }
    }
    
    loadClassData()
  }, [classId, supabase])
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">جاري تحميل بيانات الفصل...</p>
        </div>
      </div>
    )
  }
  
  if (error || !classData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <p className="text-xl text-destructive mb-2">حدث خطأ</p>
          <p className="text-muted-foreground">{error || "لم يتم العثور على بيانات الفصل"}</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-right">بيانات الفصل {classData.name}</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">اسم الفصل</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classData.name}</div>
            <p className="text-xs text-muted-foreground">المرحلة الدراسية: {classData.grade || "غير محدد"}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">المعلم المسؤول</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classData.teacher?.full_name || "غير محدد"}</div>
            <p className="text-xs text-muted-foreground">الرمز: {classData.teacher?.user_code || "غير محدد"}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">العام الدراسي</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classData.academic_year || "غير محدد"}</div>
            <p className="text-xs text-muted-foreground">الفصل الدراسي: {classData.semester || "غير محدد"}</p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="teachers" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="teachers">المعلمون المسؤولون</TabsTrigger>
          <TabsTrigger value="students">قائمة الطلاب</TabsTrigger>
          <TabsTrigger value="schedule">الجدول الدراسي</TabsTrigger>
        </TabsList>
        
        <TabsContent value="teachers">
          <ClassTeachers classId={classId} />
        </TabsContent>
        
        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle className="text-right">طلاب الفصل</CardTitle>
              <CardDescription className="text-right">قائمة بطلاب الفصل الدراسي</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-12">ستكون هذه الميزة متاحة قريبًا</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle className="text-right">الجدول الدراسي</CardTitle>
              <CardDescription className="text-right">جدول الحصص الدراسية للفصل</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-12">ستكون هذه الميزة متاحة قريبًا</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 