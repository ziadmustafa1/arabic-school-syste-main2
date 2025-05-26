"use client"

import React from "react"
import { DashboardLayout } from "@/components/dashboard-layout"

interface AdminLayoutProps {
  children: React.ReactNode;
}

// This is a compatibility wrapper around DashboardLayout for admin pages
// that import AdminLayout from '@/components/layouts/admin-layout'
// Updated for Vercel deployment
export function AdminLayout({ children }: AdminLayoutProps) {
  return <DashboardLayout>{children}</DashboardLayout>
} 