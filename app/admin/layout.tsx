import { Suspense } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { verifyAdminAccess } from "@/lib/utils/admin-auth"
import { DashboardLayout } from "@/components/dashboard-layout"
import AdminLoadingSkeleton from "@/components/loading-skeletons/admin-skeleton"

// IMPORTANT: Individual admin pages should NOT wrap their content in DashboardLayout
// as it's already provided by this layout component
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    // Use the admin auth utility to verify access
    await verifyAdminAccess()
    
    return (
      <DashboardLayout>
        <Suspense fallback={<AdminLoadingSkeleton />}>
          {children}
        </Suspense>
      </DashboardLayout>
    )
  } catch (error) {
    // If verification throws an error, redirect to home
    console.error("Admin access verification error:", error)
    redirect("/")
  }
} 