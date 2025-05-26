"use client"

import * as React from "react"
import { Check, ChevronsUpDown, User, UserRound, GraduationCap, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// تعريف واجهة المستخدم
export interface UserItem {
  id: string
  name: string
  role_id: number
  role_name?: string
  identifier?: string
}

// تعريف خصائص المكون
interface UserSelectorProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  showRoleBadge?: boolean
  className?: string
  roles?: number[] // أرقام الأدوار المراد تضمينها، 1: طالب، 2: ولي أمر، 3: مدرس، 4: مدير
}

export function UserSelector({
  value,
  onChange,
  placeholder = "اختر مستخدم...",
  disabled = false,
  showRoleBadge = true,
  className,
  roles,
}: UserSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [users, setUsers] = React.useState<UserItem[]>([])
  const [activeTab, setActiveTab] = React.useState<string>("all")
  const [loading, setLoading] = React.useState<boolean>(false)
  const [selectedUser, setSelectedUser] = React.useState<UserItem | null>(null)

  const getRoleIcon = (roleId: number) => {
    switch (roleId) {
      case 1: // طالب
        return <GraduationCap className="h-4 w-4 ml-2 text-blue-500" />
      case 2: // ولي أمر
        return <Users className="h-4 w-4 ml-2 text-green-500" />
      case 3: // مدرس
        return <User className="h-4 w-4 ml-2 text-purple-500" />
      case 4: // مدير
        return <UserRound className="h-4 w-4 ml-2 text-amber-500" />
      default:
        return <User className="h-4 w-4 ml-2 text-gray-500" />
    }
  }

  const getRoleName = (roleId: number) => {
    switch (roleId) {
      case 1:
        return "طالب"
      case 2:
        return "ولي أمر"
      case 3:
        return "مدرس"
      case 4:
        return "مدير"
      default:
        return "غير معروف"
    }
  }

  const getRoleBadgeColor = (roleId: number) => {
    switch (roleId) {
      case 1: // طالب
        return "bg-blue-100 text-blue-800 hover:bg-blue-100"
      case 2: // ولي أمر
        return "bg-green-100 text-green-800 hover:bg-green-100"
      case 3: // مدرس
        return "bg-purple-100 text-purple-800 hover:bg-purple-100"
      case 4: // مدير
        return "bg-amber-100 text-amber-800 hover:bg-amber-100"
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100"
    }
  }

  // استرجاع بيانات المستخدم المحدد عند تغيير القيمة
  React.useEffect(() => {
    async function fetchSelectedUser() {
      if (!value) {
        setSelectedUser(null)
        return
      }

      setLoading(true)
      const supabase = createClient()

      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, full_name, role_id, user_code")
          .eq("id", value)
          .single()

        if (error) {
          console.error("Error fetching selected user:", error)
          return
        }

        if (data) {
          setSelectedUser({
            id: data.id,
            name: data.full_name,
            role_id: data.role_id,
            role_name: getRoleName(data.role_id),
            identifier: data.user_code
          })
        }
      } catch (error) {
        console.error("Error fetching selected user:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSelectedUser()
  }, [value])

  // تحميل المستخدمين عند فتح القائمة
  React.useEffect(() => {
    if (open) {
      fetchUsers()
    }
  }, [open, activeTab])

  // استرجاع المستخدمين من قاعدة البيانات
  const fetchUsers = async () => {
    setLoading(true)
    try {
      // معالجة تهيئة supabase باستخدام await
      const supabase = await createClient()

      let query = supabase
        .from("users")
        .select("id, full_name, role_id, user_code")
        .order("full_name", { ascending: true })

      // تصفية حسب الدور المحدد
      if (activeTab !== "all") {
        const roleId = parseInt(activeTab)
        query = query.eq("role_id", roleId)
      }

      // تصفية حسب الأدوار المسموح بها
      if (roles && roles.length > 0) {
        query = query.in("role_id", roles)
      }

      const { data, error } = await query.limit(100)

      if (error) {
        console.error("Error fetching users:", error)
        return
      }

      if (data) {
        const formattedUsers = data.map(user => ({
          id: user.id,
          name: user.full_name,
          role_id: user.role_id,
          role_name: getRoleName(user.role_id),
          identifier: user.user_code
        }))
        setUsers(formattedUsers)
      }
    } catch (error) {
      console.error("Error in fetchUsers:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          {selectedUser ? (
            <div className="flex items-center gap-2 truncate">
              {getRoleIcon(selectedUser.role_id)}
              <span className="truncate">{selectedUser.name}</span>
              {selectedUser.identifier && (
                <span className="text-gray-500 text-xs mr-1">({selectedUser.identifier})</span>
              )}
            </div>
          ) : (
            <span>{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command className="w-full">
          <CommandInput placeholder="ابحث عن مستخدم..." dir="rtl" />
          <Tabs 
            defaultValue="all"
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full border-b"
          >
            <TabsList className="grid grid-cols-4 w-full rounded-none">
              <TabsTrigger value="all">الكل</TabsTrigger>
              <TabsTrigger value="1">طلاب</TabsTrigger>
              <TabsTrigger value="2">أولياء أمور</TabsTrigger>
              <TabsTrigger value="3">مدرسين</TabsTrigger>
            </TabsList>
          </Tabs>
          <CommandEmpty>لا توجد نتائج.</CommandEmpty>
          <CommandList>
            {loading ? (
              <div className="flex justify-center items-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : (
              <CommandGroup>
                {users.map((user) => (
                  <CommandItem
                    key={user.id}
                    onSelect={() => {
                      onChange(user.id)
                      setOpen(false)
                    }}
                    className="flex items-center gap-2"
                  >
                    {getRoleIcon(user.role_id)}
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center gap-1">
                        <span className="truncate">{user.name}</span>
                        {user.identifier && (
                          <span className="text-gray-500 text-xs">({user.identifier})</span>
                        )}
                      </div>
                    </div>
                    {showRoleBadge && (
                      <Badge variant="outline" className={cn("ml-2 text-xs", getRoleBadgeColor(user.role_id))}>
                        {user.role_name}
                      </Badge>
                    )}
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === user.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 