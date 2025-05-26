import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Home, BookOpen, Award, AlertTriangle, Send, MessageSquare, Bell, FileText, Settings, CreditCard, Gift } from "lucide-react"

// Add proper interface for subject data
interface SubjectData {
  subject_id: number;
  subjects: {
    id: number;
    name: string;
    description: string | null;
  };
}

async function getTeacherPointsStats(userId: string) {
  const supabase = await createClient()
  
  // Get positive points given by teacher
  const { data: positivePoints, error: positiveError } = await supabase
    .from("points_transactions")
    .select("points")
    .eq("created_by", userId)
    .eq("is_positive", true)
    .select("points")
  
  // Get negative points given by teacher
  const { data: negativePoints, error: negativeError } = await supabase
    .from("points_transactions")
    .select("points")
    .eq("created_by", userId)
    .eq("is_positive", false)
    .select("points")
  
  // Calculate totals
  const totalPositivePoints = positivePoints?.reduce((sum, record) => sum + record.points, 0) || 0
  const totalNegativePoints = negativePoints?.reduce((sum, record) => sum + record.points, 0) || 0
  
  return {
    positivePoints: totalPositivePoints,
    negativePoints: totalNegativePoints,
    totalTransactions: (positivePoints?.length || 0) + (negativePoints?.length || 0)
  }
}

export default async function TeacherDashboard() {
  const supabase = await createClient()

  // Get current user
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    redirect("/auth/login")
  }

  // Get user data
  const { data: userData, error } = await supabase
    .from("users")
    .select("*, roles(name)")
    .eq("id", session.user.id)
    .single()

  if (error || !userData) {
    redirect("/auth/login")
  }

  // Check if user is a teacher
  if (userData.role_id !== 3) {
    redirect("/")
  }

  // Get subjects
  const { data: subjects } = await supabase
    .from("teacher_subject")
    .select("subject_id, subjects(*)")
    .eq("teacher_id", session.user.id)
  
  // Get points statistics
  const pointsStats = await getTeacherPointsStats(session.user.id)

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">المواد الدراسية</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subjects?.length || 0}</div>
            <p className="text-xs text-muted-foreground">عدد المواد التي تقوم بتدريسها</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">النقاط الإيجابية الممنوحة</CardTitle>
            <Award className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pointsStats.positivePoints}</div>
            <p className="text-xs text-muted-foreground">عدد النقاط الإيجابية التي منحتها للطلاب</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">النقاط السلبية المخصومة</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pointsStats.negativePoints}</div>
            <p className="text-xs text-muted-foreground">عدد النقاط السلبية التي خصمتها من الطلاب</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">المواد الدراسية</h2>
          <Button variant="outline" size="sm" asChild>
            <a href="/teacher/subjects">عرض الكل</a>
          </Button>
        </div>
        {subjects && subjects.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {subjects.map((subject: any) => (
              <Card key={subject.subject_id}>
                <CardHeader>
                  <CardTitle>{subject.subjects?.name || "غير معروف"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{subject.subjects?.description || "لا يوجد وصف للمادة"}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">لا توجد مواد دراسية مرتبطة بحسابك حالياً</p>
            </CardContent>
          </Card>
        )}
      </div>
      
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">النقاط</h2>
          <div className="flex space-x-2 space-x-reverse">
            <Button variant="outline" size="sm" asChild>
              <a href="/teacher/positive-points">إضافة نقاط إيجابية</a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/teacher/negative-points">خصم نقاط سلبية</a>
            </Button>
          </div>
        </div>
        <Card>
          <CardContent className="py-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">إجمالي عمليات النقاط:</span>
                <span>{pointsStats.totalTransactions} عملية</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">إجمالي النقاط الإيجابية:</span>
                <span className="text-green-600">{pointsStats.positivePoints} نقطة</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">إجمالي النقاط السلبية:</span>
                <span className="text-red-600">{pointsStats.negativePoints} نقطة</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
