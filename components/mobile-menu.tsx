"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Home, User, Bell, MessageSquare, Award, Calendar, BookOpen, Settings, MenuIcon, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

interface MobileMenuProps {
  userRole?: "student" | "teacher" | "parent" | "admin"
}

const iconComponents = {
  Home,
  User,
  Bell,
  MessageSquare,
  Award,
  Calendar,
  BookOpen,
  Settings
}

type IconName = keyof typeof iconComponents

interface MenuItem {
  title: string
  href: string
  icon: IconName
  roles: string[]
}

// Separating menu data from component rendering
const menuItemsData: MenuItem[] = [
  {
    title: "الرئيسية",
    href: "/{role}",
    icon: "Home",
    roles: ["student", "teacher", "parent", "admin"],
  },
  {
    title: "الملف الشخصي",
    href: "/profile",
    icon: "User",
    roles: ["student", "teacher", "parent", "admin"],
  },
  {
    title: "الإشعارات",
    href: "/notifications",
    icon: "Bell",
    roles: ["student", "teacher", "parent", "admin"],
  },
  {
    title: "الرسائل",
    href: "/messages",
    icon: "MessageSquare",
    roles: ["student", "teacher", "parent", "admin"],
  },
  {
    title: "الشارات والأوسمة",
    href: "/badges",
    icon: "Award",
    roles: ["student", "teacher", "parent", "admin"],
  },
  {
    title: "الشارات",
    href: "/student/badges",
    icon: "Award",
    roles: ["student"],
  },
  {
    title: "كشف النقاط",
    href: "/student/statement",
    icon: "BookOpen",
    roles: ["student"],
  },
  {
    title: "الحضور",
    href: "/student/attendance",
    icon: "Calendar",
    roles: ["student"],
  },
  {
    title: "المكافآت",
    href: "/student/rewards",
    icon: "Award",
    roles: ["student"],
  },
  {
    title: "الأبناء",
    href: "/parent/children",
    icon: "User",
    roles: ["parent"],
  },
  {
    title: "الحضور",
    href: "/parent/attendance",
    icon: "Calendar",
    roles: ["parent"],
  },
  {
    title: "الحضور",
    href: "/teacher/attendance",
    icon: "Calendar",
    roles: ["teacher"],
  },
  {
    title: "إدارة الصفوف",
    href: "/admin/classes",
    icon: "Settings",
    roles: ["admin"],
  },
  {
    title: "فئات النقاط",
    href: "/admin/points-categories",
    icon: "Settings",
    roles: ["admin"],
  },
  {
    title: "بطاقات الشحن",
    href: "/admin/cards",
    icon: "Settings",
    roles: ["admin"],
  },
  {
    title: "الشارات المميزة",
    href: "/admin/emblems",
    icon: "Award",
    roles: ["admin"],
  },
  {
    title: "إدارة الطبقات",
    href: "/admin/tiers",
    icon: "Award",
    roles: ["admin"],
  },
  {
    title: "التقارير",
    href: "/admin/reports",
    icon: "BookOpen",
    roles: ["admin"],
  },
]

export function MobileMenu({ userRole = "student" }: MobileMenuProps) {
  const [open, setOpen] = React.useState(false)
  const pathname = usePathname()

  // Memoize menu items to prevent unnecessary recalculation
  const menuItems = React.useMemo(() => {
    const items = menuItemsData.filter(item => item.roles.includes(userRole))
      .map(item => ({
        ...item,
        href: item.href.replace("{role}", userRole),
      }))
    
    return items
  }, [userRole])

  // Only render the content when the menu is open
  const renderMenuContent = React.useCallback(() => {
    if (!open) return null
    
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">القائمة</h2>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setOpen(false)} 
            className="h-11 w-11 min-h-[44px] min-w-[44px]"
          >
            <X className="h-6 w-6" />
            <span className="sr-only">إغلاق</span>
          </Button>
        </div>
        <nav className="flex-1 overflow-auto py-3">
          {menuItems.map((item, index) => {
            const IconComponent = iconComponents[item.icon]
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-4 px-5 py-4 text-base transition-colors hover:bg-accent hover:text-accent-foreground relative",
                  pathname === item.href && "bg-accent/50 text-accent-foreground font-medium",
                )}
                aria-current={pathname === item.href ? "page" : undefined}
              >
                {pathname === item.href && (
                  <motion.div
                    layoutId="activeItem"
                    className="absolute right-0 w-1.5 h-full bg-primary rounded-l-md"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ 
                      duration: 0.2,
                      type: "spring",
                      stiffness: 300,
                      damping: 30
                    }}
                  />
                )}
                <span className="flex items-center justify-center w-8 h-8">
                  <IconComponent className="h-6 w-6" />
                </span>
                <span>{item.title}</span>
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t">
          <Link href="/api/auth/logout">
            <Button variant="outline" className="w-full h-12 text-base">
              تسجيل الخروج
            </Button>
          </Link>
        </div>
      </div>
    )
  }, [open, menuItems, pathname])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden h-11 w-11 min-h-[44px] min-w-[44px]"
          aria-label="فتح القائمة"
        >
          <MenuIcon className="h-6 w-6" />
          <span className="sr-only">فتح القائمة</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="p-0 w-72 sm:w-80">
        <AnimatePresence>
          {renderMenuContent()}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  )
}
