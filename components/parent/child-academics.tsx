"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { Loader2, BookOpen, LineChart, GraduationCap, BookMarked } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Subject {
  id: number
  name: string
  teacher_name: string
}

interface Grade {
  id: number
  subject_id: number
  subject_name: string
  exam_name: string
  score: number
  max_score: number
  percentage: number
  grade: string
  exam_date: string
}

interface ChildAcademicsProps {
  childId: string
}

export function ChildAcademics({ childId }: ChildAcademicsProps) {
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [currentSemester, setCurrentSemester] = useState<string>("الفصل الأول")

  useEffect(() => {
    const fetchAcademicData = async () => {
      try {
        // Get student's subjects
        const { data: subjectsData, error: subjectsError } = await supabase.rpc("get_student_subjects", {
          student_uuid: childId,
        })

        if (subjectsError) throw subjectsError
        setSubjects(subjectsData || [])

        // Get student's grades
        const { data: gradesData, error: gradesError } = await supabase.rpc("get_student_grades", {
          student_uuid: childId,
          semester_param: currentSemester,
        })

        if (gradesError) throw gradesError
        setGrades(gradesData || [])
      } catch (error) {
        console.error("Error fetching academic data:", error)
        toast({
          title: "خطأ في تحميل البيانات",
          description: "حدث خطأ أثناء تحميل البيانات الأكاديمية",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchAcademicData()
  }, [childId, supabase, currentSemester])

  // Calculate average grade percentage
  const calculateAveragePercentage = () => {
    if (grades.length === 0) return 0
    const sum = grades.reduce((total, grade) => total + grade.percentage, 0)
    return Math.round(sum / grades.length)
  }

  // Group grades by subject
  const gradesBySubject = grades.reduce(
    (acc, grade) => {
      if (!acc[grade.subject_id]) {
        acc[grade.subject_id] = []
      }
      acc[grade.subject_id].push(grade)
      return acc
    },
    {} as Record<number, Grade[]>,
  )

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="mr-2">جاري تحميل البيانات الأكاديمية...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">المتوسط العام</CardTitle>
            <LineChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{calculateAveragePercentage()}%</div>
            <Progress value={calculateAveragePercentage()} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">عدد المواد</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subjects.length}</div>
            <p className="text-xs text-muted-foreground">المواد المسجلة في الفصل الحالي</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">عدد الاختبارات</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{grades.length}</div>
            <p className="text-xs text-muted-foreground">الاختبارات المسجلة في الفصل الحالي</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookMarked className="h-5 w-5" />
              الدرجات الأكاديمية
            </CardTitle>
            <div className="space-x-2">
              <Tabs value={currentSemester} onValueChange={setCurrentSemester}>
                <TabsList>
                  <TabsTrigger value="الفصل الأول">الفصل الأول</TabsTrigger>
                  <TabsTrigger value="الفصل الثاني">الفصل الثاني</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          <CardDescription>درجات الطالب في المواد المختلفة</CardDescription>
        </CardHeader>
        <CardContent>
          {subjects.length > 0 ? (
            <div className="space-y-6">
              {subjects.map((subject) => (
                <div key={subject.id} className="rounded-lg border p-4">
                  <h3 className="mb-2 text-lg font-medium">{subject.name}</h3>
                  <p className="mb-4 text-sm text-muted-foreground">المعلم: {subject.teacher_name}</p>

                  {gradesBySubject[subject.id] && gradesBySubject[subject.id].length > 0 ? (
                    <div className="space-y-4">
                      {gradesBySubject[subject.id].map((grade) => (
                        <div key={grade.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{grade.exam_name}</span>
                            <span className="text-sm">
                              {grade.score} / {grade.max_score} ({grade.percentage}%)
                            </span>
                          </div>
                          <Progress value={grade.percentage} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-sm text-muted-foreground">لا توجد درجات مسجلة لهذه المادة</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">لا توجد مواد مسجلة للطالب في الفصل الحالي</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
