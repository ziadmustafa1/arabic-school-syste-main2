"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client" 
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import { Loader2, User, AlertCircle } from "lucide-react"

interface Student {
  id: string
  full_name: string
  user_code: string
  deduction_cards_count: number
}

export default function ParentChildrenDeductionCardsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    try {
      setIsLoading(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast({
          title: "خطأ",
          description: "لم يتم العثور على بيانات المستخدم",
          variant: "destructive"
        })
        return
      }
      
      // Get the parent's children
      const { data: childrenData, error: childrenError } = await supabase
        .from("parent_student")
        .select(`
          student:student_id (
            id,
            full_name,
            user_code
          )
        `)
        .eq("parent_id", user.id)
      
      if (childrenError) throw childrenError
      
      if (!childrenData || childrenData.length === 0) {
        setStudents([])
        setIsLoading(false)
        return
      }
      
      // Get deduction cards count for each child
      const studentsWithCards = await Promise.all(
        childrenData.map(async (item) => {
          const { count } = await supabase
            .from("user_deduction_cards")
            .select("*", { count: "exact", head: true })
            .eq("user_id", item.student.id)
            .eq("is_active", true)
          
          return {
            id: item.student.id,
            full_name: item.student.full_name,
            user_code: item.student.user_code,
            deduction_cards_count: count || 0
          }
        })
      )
      
      setStudents(studentsWithCards)
    } catch (error) {
      console.error("Error fetching students:", error)
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء استرداد بيانات الطلاب",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-12 flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin mb-4" />
        <p className="text-lg">جاري تحميل بيانات الطلاب...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">كروت الحسم والاستبعاد للأبناء</h1>

      {students.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">لا يوجد أبناء مرتبطين بحسابك</p>
            <p className="text-muted-foreground mt-2">
              يرجى ربط حسابك بأبنائك أولاً من صفحة "أبنائي"
            </p>
            <Button className="mt-4" onClick={() => router.push("/parent/children")}>
              الذهاب إلى صفحة الأبناء
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {students.map((student) => (
            <Card key={student.id} className={student.deduction_cards_count > 0 ? "border-red-300" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {student.full_name}
                </CardTitle>
                <CardDescription>كود الطالب: {student.user_code}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <AlertCircle className={student.deduction_cards_count > 0 ? "text-red-500" : "text-gray-400"} />
                  <span>
                    {student.deduction_cards_count > 0
                      ? `يوجد ${student.deduction_cards_count} كروت حسم نشطة`
                      : "لا يوجد كروت حسم نشطة"}
                  </span>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => router.push(`/parent/student/${student.id}/deduction-cards`)}
                >
                  عرض تفاصيل كروت الحسم
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
} 