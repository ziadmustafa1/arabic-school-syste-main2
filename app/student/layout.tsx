import { getCurrentUser } from "@/lib/utils/auth"
import { getDashboardUrl } from "@/lib/utils/auth"
import { redirect } from "next/navigation"
import ClientDashboardLayout from "@/components/client-dashboard-layout"

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get the current user and verify they are a student
  const user = await getCurrentUser()
  
  if (user.role_id !== 1) {
    // If not a student, redirect to their appropriate dashboard
    redirect(getDashboardUrl(user.role_id))
  }
  
  // Pass the children to the client component
  return <ClientDashboardLayout>{children}</ClientDashboardLayout>
} 