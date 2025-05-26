"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { ArrowLeftCircle, Calculator, CreditCard, Loader2, Save, Home, Tag, Plus } from "lucide-react"
import Link from "next/link"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface Role {
  id: number
  name: string
  code: string
}

interface UsageLimit {
  id: number
  role_id: number
  weekly_limit: number
  created_at: string
  updated_at: string
  role?: Role
}

export default function CardLimitsPage() {
  const [roles, setRoles] = useState<Role[]>([
    { id: 1, name: "طالب", code: "student" },
    { id: 2, name: "ولي أمر", code: "parent" },
    { id: 3, name: "معلم", code: "teacher" },
    { id: 4, name: "مدير", code: "admin" }
  ])
  const [limits, setLimits] = useState<UsageLimit[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const client = createClient()
      
      // First check if the card_usage_limits table exists
      try {
        // Attempt to fetch limits
        const { data: limitsData, error: limitsError } = await client
          .from("card_usage_limits")
          .select("*")
          .limit(1)
        
        // If there's an error that's not a "not found" error, throw it
        if (limitsError && !limitsError.message.includes("does not exist")) {
          throw limitsError
        }
        
        // If table doesn't exist, create default limits in memory
        if (limitsError && limitsError.message.includes("does not exist")) {
          // Just use default limits without saving to DB
          const defaultLimits: UsageLimit[] = roles.map((role, index) => ({
            id: index + 1,
            role_id: role.id,
            weekly_limit: role.id === 4 ? 50 : (role.id === 3 ? 20 : 10),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            role: role
          }))
          
          setLimits(defaultLimits)
          return
        }
        
        // If we got here, the table exists, so load the data properly
        const { data: rolesData } = await client
          .from("roles")
          .select("*")
          .order("id")
        
        // Get the roles
        if (rolesData && rolesData.length > 0) {
          setRoles(rolesData)
        }

        // Get the limits with roles
        const { data: fullLimitsData } = await client
          .from("card_usage_limits")
          .select("*, role:roles(id, name, code)")
          .order("role_id")
        
        if (fullLimitsData && fullLimitsData.length > 0) {
          setLimits(fullLimitsData)
        } else {
          // If no limits exist, create default ones
          const defaultLimits: UsageLimit[] = roles.map((role, index) => ({
            id: index + 1,
            role_id: role.id,
            weekly_limit: role.id === 4 ? 50 : (role.id === 3 ? 20 : 10),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            role: role
          }))
          
          setLimits(defaultLimits)
        }
      } catch (dbError) {
        console.error("Database error:", dbError)
        // If there's a database error, still provide some default limits
        const defaultLimits: UsageLimit[] = roles.map((role, index) => ({
          id: index + 1,
          role_id: role.id,
          weekly_limit: role.id === 4 ? 50 : (role.id === 3 ? 20 : 10),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          role: role
        }))
        
        setLimits(defaultLimits)
      }
    } catch (error) {
      console.error("Error loading data:", error)
      // Still provide default limits
      const defaultLimits: UsageLimit[] = roles.map((role, index) => ({
        id: index + 1,
        role_id: role.id,
        weekly_limit: role.id === 4 ? 50 : (role.id === 3 ? 20 : 10),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        role: role
      }))
      
      setLimits(defaultLimits)
      
      toast({
        title: "ملاحظة",
        description: "تم تحميل البيانات الافتراضية. قد تواجه مشكلة في حفظ التغييرات.",
        variant: "default",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLimitChange = (id: number, value: number) => {
    setLimits(prev => 
      prev.map(limit => 
        limit.id === id ? { ...limit, weekly_limit: value } : limit
      )
    )
    setHasChanges(true)
  }

  const saveLimits = async () => {
    setSaving(true)
    try {
      const adminClient = createClient()
      
      // Update each limit
      for (const limit of limits) {
        const { error } = await adminClient
          .from("card_usage_limits")
          .update({
            weekly_limit: limit.weekly_limit,
            updated_at: new Date().toISOString()
          })
          .eq("id", limit.id)
        
        if (error) throw error
      }
      
      toast({
        title: "تم حفظ التغييرات",
        description: "تم تحديث حدود استخدام الكروت الأسبوعية بنجاح",
      })
      
      setHasChanges(false)
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء حفظ البيانات",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Helper function to get Arabic role name
  const getRoleNameArabic = (code: string) => {
    switch (code) {
      case 'student': return 'طالب'
      case 'parent': return 'ولي أمر'
      case 'teacher': return 'معلم'
      case 'admin': return 'مدير'
      default: return code
    }
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-6 pb-16 sm:pb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-6 gap-3 sm:gap-0">
        <h1 className="text-xl sm:text-2xl font-bold">إدارة حدود استخدام الكروت</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" asChild className="text-xs sm:text-sm h-10 sm:h-10 w-full sm:w-auto">
                  <Link href="/admin/cards" className="flex items-center justify-center h-full">
                    <ArrowLeftCircle className="ml-1 sm:ml-2 h-4 w-4 sm:h-4 sm:w-4" />
                    <span className="sm:inline">العودة إلى إدارة الكروت</span>
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">العودة إلى إدارة الكروت</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  disabled={saving || !hasChanges} 
                  onClick={saveLimits}
                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm h-10 sm:h-10 w-full sm:w-auto"
                >
                  {saving ? (
                    <Loader2 className="ml-1 sm:ml-2 h-4 w-4 sm:h-4 sm:w-4 animate-spin" />
                  ) : (
                    <Save className="ml-1 sm:ml-2 h-4 w-4 sm:h-4 sm:w-4" />
                  )}
                  <span className="sm:inline">حفظ التغييرات</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">حفظ التغييرات</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <Card>
        <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
          <CardTitle className="flex items-center gap-1 sm:gap-2 text-base sm:text-lg">
            <Calculator className="h-4 w-4 sm:h-5 sm:w-5" />
            الحد الأسبوعي لاستخدام كروت الشحن
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            قم بتحديد الحد الأقصى لعدد كروت الشحن التي يمكن استخدامها أسبوعياً لكل نوع من المستخدمين
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 py-2 sm:py-3">
          {loading ? (
            <div className="flex justify-center items-center py-6 sm:py-8">
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {limits.map(limit => (
                <div key={limit.id} className="space-y-2 p-3 sm:p-4 border rounded-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                    <Label htmlFor={`limit-${limit.id}`} className="text-base sm:text-lg font-medium">
                      {getRoleNameArabic(limit.role?.code || '')}
                    </Label>
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      الحد الحالي: {limit.weekly_limit} كرت أسبوعياً
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      id={`limit-${limit.id}`}
                      type="number"
                      min="1"
                      max="100"
                      value={limit.weekly_limit}
                      onChange={(e) => handleLimitChange(limit.id, parseInt(e.target.value) || 1)}
                      className="w-20 sm:w-32 h-8 sm:h-9 text-xs sm:text-sm"
                    />
                    <span className="text-xs sm:text-sm">كرت في الأسبوع</span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    هذا هو الحد الأقصى لعدد كروت الشحن التي يمكن لـ {getRoleNameArabic(limit.role?.code || '')} استخدامها خلال أسبوع واحد.
                  </p>
                </div>
              ))}

              {hasChanges && (
                <div className="flex justify-end mt-3 sm:mt-4">
                  <Button 
                    disabled={saving} 
                    onClick={saveLimits}
                    className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9"
                  >
                    {saving ? (
                      <Loader2 className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    ) : (
                      <Save className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                    حفظ التغييرات
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mobile Bottom Navigation */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-background border-t flex justify-around items-center h-14 z-50">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/admin/dashboard" className="flex flex-col items-center justify-center p-2 min-w-[60px]">
                <Home className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs mt-1">الرئيسية</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">لوحة التحكم</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/admin/cards" className="flex flex-col items-center justify-center p-2 min-w-[60px]">
                <CreditCard className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs mt-1">الكروت</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">إدارة الكروت</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                disabled={saving || !hasChanges} 
                onClick={saveLimits}
                variant="default"
                className="rounded-full h-12 w-12 flex items-center justify-center shadow-lg p-0"
              >
                <Save className="h-6 w-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">حفظ التغييرات</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/admin/cards/manage" className="flex flex-col items-center justify-center p-2 min-w-[60px]">
                <Tag className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs mt-1">الإدارة</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">إدارة الكروت</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/admin/cards/categories" className="flex flex-col items-center justify-center p-2 min-w-[60px]">
                <Plus className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs mt-1">التصنيفات</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">تصنيفات الكروت</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
} 