import { Metadata } from "next"
import { PageHeader } from "@/components/page-header"
import { Container } from "@/components/container"
import { getCurrentUser } from "@/lib/actions/get-current-user"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ROLES, TABLES } from "@/lib/constants"
import { AdminRecordsClient } from "./admin-records-client"
import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Award, 
  GraduationCap, 
  Layers, 
  Trophy,
  CreditCard
} from "lucide-react"

export const metadata: Metadata = {
  title: "إدارة السجلات | منصة المدرسة",
  description: "إدارة سجلات الإنجازات للمستخدمين",
}

export default async function AdminRecordsPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    return null
  }
  
  // Only admin can access this page
  if (user.role_id !== ROLES.ADMIN) {
    redirect("/")
  }
  
  // Fetch initial records data server-side
  let initialRecords = [];
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from(TABLES.USER_RECORDS)
      .select(`
        *,
        user:user_id (
          id,
          full_name
        )
      `)
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      initialRecords = data;
    }
  } catch (error) {
    console.error("Error pre-fetching records:", error);
  }
  
  return (
    <Container>
        <PageHeader 
          title="إدارة السجلات"
          description="إدارة سجلات الإنجازات للمستخدمين"
          actions={
            <Button asChild>
              <Link href="/admin/records/new">إضافة سجل جديد</Link>
            </Button>
          }
        />
        
        <Tabs defaultValue="records" className="mb-8">
          <div className="flex justify-center mb-6">
            <TabsList className="grid grid-cols-5 w-fit">
              <TabsTrigger value="records" className="flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                <span>السجلات</span>
              </TabsTrigger>
              <TabsTrigger value="academic" className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                <span>أكاديمي</span>
              </TabsTrigger>
              <TabsTrigger value="attendance" className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                <span>الحضور</span>
              </TabsTrigger>
              <TabsTrigger value="achievements" className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                <span>الإنجازات</span>
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span>المدفوعات</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="records">
            <AdminRecordsClient 
              adminId={user.id} 
              initialRecords={initialRecords}
            />
          </TabsContent>

          <TabsContent value="academic">
            <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg">
              <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium">السجلات الأكاديمية</h3>
              <p className="text-muted-foreground mt-2 mb-6">
                هذه الميزة قيد التطوير وستتوفر قريباً
              </p>
              <Button variant="outline">الاطلاع على التوثيق</Button>
            </div>
          </TabsContent>

          <TabsContent value="attendance">
            <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg">
              <Layers className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium">سجلات الحضور</h3>
              <p className="text-muted-foreground mt-2 mb-6">
                هذه الميزة قيد التطوير وستتوفر قريباً
              </p>
              <Button variant="outline">الاطلاع على التوثيق</Button>
            </div>
          </TabsContent>

          <TabsContent value="achievements">
            <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg">
              <Award className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium">سجلات الإنجازات</h3>
              <p className="text-muted-foreground mt-2 mb-6">
                هذه الميزة قيد التطوير وستتوفر قريباً
              </p>
              <Button variant="outline">الاطلاع على التوثيق</Button>
            </div>
          </TabsContent>

          <TabsContent value="payments">
            <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg">
              <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium">سجلات المدفوعات</h3>
              <p className="text-muted-foreground mt-2 mb-6">
                هذه الميزة قيد التطوير وستتوفر قريباً
              </p>
              <Button variant="outline">الاطلاع على التوثيق</Button>
            </div>
          </TabsContent>
        </Tabs>
      </Container>
  )
} 