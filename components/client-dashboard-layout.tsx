"use client"

import { DashboardLayout } from "./dashboard-layout"

// This is a client component wrapper to use the DashboardLayout in server components
export default function ClientDashboardLayout({ children }: { children: React.ReactNode }) {
  // This wrapper fixes the loading order issue
  return <DashboardLayout>{children}</DashboardLayout>
} 