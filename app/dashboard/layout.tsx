"use client"

import { cookies } from "next/headers"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { DashboardLayout as MainDashboardLayout } from "@/components/dashboard-layout"
import { MobileNavigation as MainMobileNavigation } from "@/components/mobile-navigation"
import { redirect } from "next/navigation"

export default async function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth/login")
  }

  // Get user role from metadata
  const userRole = session.user.user_metadata.role || "student"

  return (
    <div className="min-h-screen bg-background">
      <MainDashboardLayout userRole={userRole}>
        <div className="pb-16 md:pb-0">{children}</div>
      </MainDashboardLayout>
      <MainMobileNavigation userRole={userRole} />
    </div>
  )
}

import type React from "react"
import NextLink from "next/link"
import { usePathname } from "next/navigation"
import { Home, Users, BookOpen, Award, Bell, MessageSquare, User, LogOut, Calendar, BarChart } from "lucide-react"

export function DashboardLayout({
  children,
  userRole,
}: {
  children: React.ReactNode
  userRole: string
}) {
  const pathname = usePathname()

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`)
  }

  const navItems = [
    {
      label: "الرئيسية",
      href: "/dashboard",
      icon: <Home className="h-5 w-5" />,
      roles: ["admin", "teacher", "student", "parent"],
    },
    {
      label: "المستخدمين",
      href: "/admin/users",
      icon: <Users className="h-5 w-5" />,
      roles: ["admin"],
    },
    {
      label: "الصفوف",
      href: "/admin/classes",
      icon: <BookOpen className="h-5 w-5" />,
      roles: ["admin"],
    },
    {
      label: "الصفوف",
      href: "/teacher/classes",
      icon: <BookOpen className="h-5 w-5" />,
      roles: ["teacher"],
    },
    {
      label: "الحضور",
      href: "/teacher/attendance",
      icon: <Calendar className="h-5 w-5" />,
      roles: ["teacher"],
    },
    {
      label: "النقاط",
      href: "/teacher/points",
      icon: <Award className="h-5 w-5" />,
      roles: ["teacher"],
    },
    {
      label: "الحضور",
      href: "/student/attendance",
      icon: <Calendar className="h-5 w-5" />,
      roles: ["student"],
    },
    {
      label: "النقاط",
      href: "/student/points",
      icon: <Award className="h-5 w-5" />,
      roles: ["student"],
    },
    {
      label: "المكافآت",
      href: "/student/rewards",
      icon: <Award className="h-5 w-5" />,
      roles: ["student"],
    },
    {
      label: "أبنائي",
      href: "/parent/children",
      icon: <Users className="h-5 w-5" />,
      roles: ["parent"],
    },
    {
      label: "الحضور",
      href: "/parent/attendance",
      icon: <Calendar className="h-5 w-5" />,
      roles: ["parent"],
    },
    {
      label: "التقارير",
      href: "/admin/reports",
      icon: <BarChart className="h-5 w-5" />,
      roles: ["admin"],
    },
    {
      label: "الإشعارات",
      href: "/notifications",
      icon: <Bell className="h-5 w-5" />,
      roles: ["admin", "teacher", "student", "parent"],
    },
    {
      label: "الرسائل",
      href: "/messages",
      icon: <MessageSquare className="h-5 w-5" />,
      roles: ["admin", "teacher", "student", "parent"],
    },
    {
      label: "الملف الشخصي",
      href: "/profile",
      icon: <User className="h-5 w-5" />,
      roles: ["admin", "teacher", "student", "parent"],
    },
    {
      label: "تسجيل الخروج",
      href: "/logout",
      icon: <LogOut className="h-5 w-5" />,
      roles: ["admin", "teacher", "student", "parent"],
    },
  ]

  const filteredNavItems = navItems.filter((item) => item.roles.includes(userRole || ""))

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      {/* Sidebar for desktop */}
      <div className="hidden md:flex flex-col w-64 bg-white shadow-md">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold text-center">نظام المدرسة</h1>
        </div>
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {filteredNavItems.map((item) => (
              <li key={item.href}>
                <NextLink
                  href={item.href}
                  className={`flex items-center gap-3 p-2 rounded-md transition-colors ${
                    isActive(item.href) ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </NextLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <main className="p-4">{children}</main>
      </div>
    </div>
  )
}

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"
import CustomNextLink from "next/link"

interface MobileNavigationProps {
  userRole: string
}

export function MobileNavigation({ userRole }: MobileNavigationProps) {
  const navItems = [
    {
      label: "الرئيسية",
      href: "/dashboard",
      roles: ["admin", "teacher", "student", "parent"],
    },
    {
      label: "المستخدمين",
      href: "/admin/users",
      roles: ["admin"],
    },
    {
      label: "الصفوف",
      href: "/admin/classes",
      roles: ["admin"],
    },
    {
      label: "الصفوف",
      href: "/teacher/classes",
      roles: ["teacher"],
    },
    {
      label: "الحضور",
      href: "/teacher/attendance",
      roles: ["teacher"],
    },
    {
      label: "النقاط",
      href: "/teacher/points",
      roles: ["teacher"],
    },
    {
      label: "الحضور",
      href: "/student/attendance",
      roles: ["student"],
    },
    {
      label: "النقاط",
      href: "/student/points",
      roles: ["student"],
    },
    {
      label: "المكافآت",
      href: "/student/rewards",
      roles: ["student"],
    },
    {
      label: "أبنائي",
      href: "/parent/children",
      roles: ["parent"],
    },
    {
      label: "الحضور",
      href: "/parent/attendance",
      roles: ["parent"],
    },
    {
      label: "التقارير",
      href: "/admin/reports",
      roles: ["admin"],
    },
    {
      label: "الإشعارات",
      href: "/notifications",
      roles: ["admin", "teacher", "student", "parent"],
    },
    {
      label: "الرسائل",
      href: "/messages",
      roles: ["admin", "teacher", "student", "parent"],
    },
    {
      label: "الملف الشخصي",
      href: "/profile",
      roles: ["admin", "teacher", "student", "parent"],
    },
    {
      label: "تسجيل الخروج",
      href: "/logout",
      roles: ["admin", "teacher", "student", "parent"],
    },
  ]

  const filteredNavItems = navItems.filter((item) => item.roles.includes(userRole || ""))

  return (
    <Sheet>
      <SheetTrigger className="md:hidden">
        <Menu />
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>نظام المدرسة</SheetTitle>
          <SheetDescription>اختر ما تريد فعله من القائمة.</SheetDescription>
        </SheetHeader>
        <div className="mt-4">
          {filteredNavItems.map((item) => (
            <CustomNextLink
              key={item.href}
              href={item.href}
              className="flex items-center space-x-2 py-2 text-sm font-medium hover:underline"
            >
              <span>{item.label}</span>
            </CustomNextLink>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
