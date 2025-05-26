"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import Link from "next/link"

interface ClassItem {
  id: number
  name: string
  description?: string
  grade_level?: string
  academic_year?: string
  semester?: string
  created_at: string
}

export default function TeacherClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadClasses() {
      try {
        setIsLoading(true)
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          toast({
            title: "خطأ في التحقق",
            description: "يرجى تسجيل الدخول من جديد",
            variant: "destructive",
          })
          return
        }

        // First, test a simple query to check connection
        try {
          const { data: testData, error: testError } = await supabase
            .from('classes')
            .select('count')
            .limit(1)
          
          if (testError) {
            console.error("Test query failed:", testError)
            throw new Error("Database connection test failed: " + (testError.message || JSON.stringify(testError)))
          }
          console.log("Test query successful")
        } catch (testErr) {
          console.error("Test query caught error:", testErr)
          throw testErr
        }

        // Get class IDs for this teacher
        const { data: classTeachersData, error: teacherClassesError } = await supabase
          .from("class_teacher")
          .select("*")
          .eq("teacher_id", user.id)
        
        if (teacherClassesError) {
          console.error("Error loading teacher classes:", teacherClassesError)
          toast({
            title: "خطأ في تحميل البيانات",
            description: "حدث خطأ أثناء محاولة تحميل الصفوف",
            variant: "destructive",
          })
          return
        }

        if (!classTeachersData || classTeachersData.length === 0) {
          // No classes found, but not an error
          setClasses([])
          return
        }
        
        // Extract class IDs and ensure they're valid
        const classIds = classTeachersData
          .map(item => item.class_id)
          .filter(id => id !== null && id !== undefined)
        
        if (classIds.length === 0) {
          console.log("No valid class IDs found")
          setClasses([])
          return
        }
        
        // Get class details - use the same approach as admin page
        const { data: classesData, error: classesError } = await supabase
          .from("classes")
          .select("*")
          .in("id", classIds)
        
        if (classesError) {
          console.error("Error loading class details:", classesError)
          toast({
            title: "خطأ في تحميل البيانات",
            description: "حدث خطأ أثناء محاولة تحميل تفاصيل الصفوف",
            variant: "destructive",
          })
          return
        }
        
        console.log("Classes data received:", classesData?.length || 0)
        setClasses(classesData || [])
        
      } catch (error: any) {
        console.error("Error loading classes:", error?.message || error)
        toast({
          title: "خطأ غير متوقع",
          description: "حدث خطأ غير متوقع أثناء تحميل البيانات",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadClasses()
  }, [supabase])

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">الصفوف الدراسية</h1>

      {isLoading ? (
        <div className="text-center p-8">جاري التحميل...</div>
      ) : classes.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((classItem) => (
            <Card key={classItem.id}>
              <CardHeader>
                <CardTitle>{classItem.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  {classItem.description || "لا يوجد وصف للصف"}
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/teacher/attendance/${classItem.id}`}>
                      الحضور
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/teacher/attendance/${classItem.id}/with-periods`}>
                      الحضور (حسب الحصص)
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center p-8">
            <p className="text-muted-foreground">لا توجد صفوف مرتبطة بحسابك حالياً</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 