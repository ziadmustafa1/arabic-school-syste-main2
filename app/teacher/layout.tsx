import { getCurrentUser } from "@/lib/utils/auth"
import { getDashboardUrl } from "@/lib/utils/auth"
import { redirect } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Suspense } from "react"

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get the current user and verify they are a teacher
  const user = await getCurrentUser()
  
  if (user.role_id !== 3) {
    // If not a teacher, redirect to their appropriate dashboard
    redirect(getDashboardUrl(user.role_id))
  }
  
  // Return dashboard layout with teacher-specific content
  return (
    <DashboardLayout>
      <Suspense fallback={<div>جاري التحميل...</div>}>
        {children}
      </Suspense>
    </DashboardLayout>
  )
} 