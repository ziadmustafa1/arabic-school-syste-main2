import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Home,
  Users,
  Award,
  AlertTriangle,
  Send,
  Gift,
  Medal,
  CreditCard,
  MessageSquare,
  Bell,
  FileText,
  Settings,
} from "lucide-react"

export default async function ParentDashboard() {
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

  // Check if user is a parent
  if (userData.role_id !== 2) {
    redirect("/")
  }

  // Get children
  const { data: children } = await supabase
    .from("parent_student")
    .select("student_id, users!parent_student_student_id_fkey(*)")
    .eq("parent_id", session.user.id)

  // Get positive points
  const positivePointsQuery = await supabase
    .from("points_transactions")
    .select("points", { count: "exact" })
    .eq("user_id", session.user.id)
    .eq("is_positive", true)

  const totalPositive = positivePointsQuery.data?.reduce((sum, current) => sum + (current.points || 0), 0) || 0

  // Get negative points
  const negativePointsQuery = await supabase
    .from("points_transactions")
    .select("points", { count: "exact" })
    .eq("user_id", session.user.id)
    .eq("is_positive", false)

  const totalNegative = negativePointsQuery.data?.reduce((sum, current) => sum + (current.points || 0), 0) || 0

  const netPoints = totalPositive - totalNegative

  // Navigation items for parent
  const navItems = [
    { title: "الرئيسية", href: "/parent", icon: <Home className="h-5 w-5" /> },
    { title: "متابعة الأبناء", href: "/parent/children", icon: <Users className="h-5 w-5" /> },
    { title: "النقاط الإيجابية", href: "/parent/positive-points", icon: <Award className="h-5 w-5" /> },
    { title: "النقاط السلبية", href: "/parent/negative-points", icon: <AlertTriangle className="h-5 w-5" /> },
    { title: "الشارات والإنجازات", href: "/parent/badges", icon: <Medal className="h-5 w-5" /> },
    { title: "تحويل النقاط", href: "/parent/transfer", icon: <Send className="h-5 w-5" /> },
    { title: "المكافآت والجوائز", href: "/parent/rewards", icon: <Gift className="h-5 w-5" /> },
    { title: "شحن الرصيد", href: "/parent/recharge", icon: <CreditCard className="h-5 w-5" /> },
    { title: "بطاقات الشحن", href: "/parent/my-cards", icon: <CreditCard className="h-5 w-5" /> },
    { title: "الرسائل", href: "/parent/messages", icon: <MessageSquare className="h-5 w-5" /> },
    { title: "الإشعارات", href: "/parent/notifications", icon: <Bell className="h-5 w-5" /> },
    { title: "كشف الحساب", href: "/parent/statement", icon: <FileText className="h-5 w-5" /> },
    { title: "الإعدادات", href: "/parent/settings", icon: <Settings className="h-5 w-5" /> },
  ]

  return (
    <DashboardLayout
      navItems={navItems}
      roleName={userData.roles?.name || "ولي أمر"}
      userName={userData.full_name}
      userCode={userData.user_code}
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي النقاط</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{netPoints}</div>
            <p className="text-xs text-muted-foreground">الرصيد الحالي من النقاط</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">عدد الأبناء</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{children?.length || 0}</div>
            <p className="text-xs text-muted-foreground">عدد الأبناء المرتبطين بحسابك</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">النقاط الإيجابية</CardTitle>
            <Award className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{totalPositive}</div>
            <p className="text-xs text-muted-foreground">مجموع النقاط الإيجابية المكتسبة</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">النقاط السلبية</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{totalNegative}</div>
            <p className="text-xs text-muted-foreground">مجموع النقاط السلبية المخصومة</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <h2 className="mb-4 text-xl font-bold">الأبناء</h2>
        {children && children.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {children.map((child) => (
              <Card key={child.student_id}>
                <CardHeader>
                  <CardTitle>{child.users.full_name}</CardTitle>
                  <CardDescription>{child.users.user_code}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>لا توجد معلومات إضافية</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">لا يوجد أبناء مرتبطين بحسابك حالياً</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
