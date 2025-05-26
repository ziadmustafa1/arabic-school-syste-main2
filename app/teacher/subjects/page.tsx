"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"

interface Subject {
  id: number;
  name: string;
  description: string | null;
  grade_level: string | null;
  created_at: string;
}

export default function TeacherSubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadSubjects() {
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

        // Get subjects for this teacher
        const { data, error } = await supabase
          .from("teacher_subject")
          .select(`
            subject_id,
            subjects (
              id,
              name,
              description,
              grade_level,
              created_at
            )
          `)
          .eq("teacher_id", user.id)
        
        if (error) {
          console.error("Error loading subjects:", error)
          toast({
            title: "خطأ في تحميل البيانات",
            description: "حدث خطأ أثناء محاولة تحميل المواد الدراسية",
            variant: "destructive",
          })
          return
        }

        // Transform data to a more usable format
        const formattedSubjects = data?.map((item: any) => item.subjects) || []
        setSubjects(formattedSubjects as Subject[])
        
      } catch (error) {
        console.error("Error:", error)
        toast({
          title: "خطأ غير متوقع",
          description: "حدث خطأ غير متوقع أثناء تحميل البيانات",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadSubjects()
  }, [supabase])

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">المواد الدراسية</h1>

      {isLoading ? (
        <div className="text-center p-8">جاري التحميل...</div>
      ) : subjects.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject: any) => (
            <Card key={subject.id}>
              <CardHeader>
                <CardTitle>{subject.name || "غير معروف"}</CardTitle>
                {subject.grade_level && (
                  <CardDescription>الصف: {subject.grade_level}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  {subject.description || "لا يوجد وصف للمادة"}
                </p>
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/teacher/classes?subject=${subject.id}`}>الصفوف</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center p-8">
            <p className="text-muted-foreground">لا توجد مواد دراسية مرتبطة بحسابك حالياً</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 