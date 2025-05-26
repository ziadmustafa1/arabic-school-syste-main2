import { getCurrentUser } from "@/lib/utils/auth"
import { getDashboardUrl } from "@/lib/utils/auth"
import { redirect } from "next/navigation"
import { SelectedChildProvider } from "../context/selected-child-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Suspense } from "react"

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get the current user and verify they are a parent
  const user = await getCurrentUser()
  
  if (user.role_id !== 2) {
    // If not a parent, redirect to their appropriate dashboard
    redirect(getDashboardUrl(user.role_id))
  }
  
  // Return dashboard layout with parent-specific context provider
  return (
    <DashboardLayout>
      <Suspense fallback={<div>جاري التحميل...</div>}>
        <SelectedChildProvider>
          {children}
        </SelectedChildProvider>
      </Suspense>
    </DashboardLayout>
  )
} 