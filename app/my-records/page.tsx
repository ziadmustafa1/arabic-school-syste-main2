import { Metadata } from "next"
import { getUserRecords } from "@/lib/actions/records"
import { getCurrentUser } from "@/lib/actions/get-current-user"
import { RecordsClient } from "./records-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { PageHeader } from "@/components/page-header"
import { Container } from "@/components/container"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ROLES } from "@/lib/constants"

export const metadata: Metadata = {
  title: "سجلاتي | منصة المدرسة",
  description: "عرض سجلات الإنجازات الخاصة بك",
}

export default async function MyRecordsPage() {
  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  const records = await getUserRecords(user.id)
  const isAdmin = user.role_id === ROLES.ADMIN

  return (
    <DashboardLayout>
      <Container>
        <PageHeader 
          title="سجلاتي"
          description="عرض سجلات الإنجازات الخاصة بك مع التفاصيل"
          actions={isAdmin && (
            <Button asChild>
              <Link href="/admin/records/new">إضافة سجل جديد</Link>
            </Button>
          )}
        />

        <RecordsClient 
          records={records} 
          userId={user.id}
        />
      </Container>
    </DashboardLayout>
  )
} 