"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { createClientAdminClient } from "@/lib/supabase/client-admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { 
  CreditCard, 
  Download, 
  Filter,
  Loader2, 
  Search, 
  ArrowLeftCircle,
  Check, 
  X,
  Calendar,
  User,
  Tag,
  PlusCircle,
  Home,
  Calculator
} from "lucide-react"
import Link from "next/link"
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface RechargeCard {
  id: number
  code: string
  points: number
  is_used: boolean
  used_by: string | null
  used_at: string | null
  assigned_to: string | null
  valid_from: string
  valid_until: string | null
  status: string
  category_id: number | null
  max_usage_attempts: number
  usage_cooldown_hours: number
  failed_attempts: number
  created_by: string
  created_at: string
}

interface CardCategory {
  id: number
  name: string
  description: string | null
}

export default function ManageCardsPage() {
  const [cards, setCards] = useState<RechargeCard[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filter, setFilter] = useState<"all" | "used" | "unused" | "active" | "inactive" | "assigned">("all")
  const [userData, setUserData] = useState<Record<string, any>>({})
  const [categories, setCategories] = useState<CardCategory[]>([])

  useEffect(() => {
    console.log("ManageCardsPage mounted")
    loadCards()
    
    // Add window error handler to catch any issues
    const handleError = (event: ErrorEvent) => {
      console.error("Global error caught:", event.error)
    }
    window.addEventListener('error', handleError)
    
    return () => {
      window.removeEventListener('error', handleError)
    }
  }, [])

  async function loadCards() {
    setLoading(true)
    console.log("Loading cards via API endpoint...")
    
    try {
      // Use API endpoint to fetch cards
      const response = await fetch('/api/admin/cards')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch cards from API')
      }
      
      const data = await response.json()
      console.log(`API fetched ${data.cards?.length || 0} cards`)
      
      // Set cards
      setCards(data.cards || [])
      
      // Set categories
      setCategories(data.categories || [])
      
      // Create user map
      const userMap: Record<string, any> = {}
      data.users?.forEach((user: any) => {
        userMap[user.id] = user
      })
      setUserData(userMap)
      
      console.log("Successfully loaded cards via API")
    } catch (error) {
      console.error("Error loading cards:", error)
      toast({
        title: "خطأ في تحميل البيانات",
        description: "حدث خطأ أثناء تحميل بيانات كروت الشحن",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getUserName = (userId: string | null) => {
    if (!userId) return "غير معروف"
    const user = userData[userId]
    if (!user) return userId.substring(0, 8)
    return `${user.full_name || ''}`.trim() || user.email
  }

  const getCategoryName = (categoryId: number | null) => {
    if (!categoryId) return "بدون تصنيف"
    const category = categories.find(c => c.id === categoryId)
    return category ? category.name : "تصنيف غير معروف"
  }

  // Filter cards based on search term and status filter
  const filteredCards = cards.filter(card => {
    const matchesSearch = card.code.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (filter === "used") return matchesSearch && card.is_used
    if (filter === "unused") return matchesSearch && !card.is_used
    if (filter === "active") return matchesSearch && card.status === "active"
    if (filter === "inactive") return matchesSearch && card.status === "inactive"
    if (filter === "assigned") return matchesSearch && card.assigned_to !== null
    return matchesSearch
  })

  const downloadCardsCSV = () => {
    if (filteredCards.length === 0) return

    // Create CSV content
    const headers = "رقم,رمز الكرت,عدد النقاط,الحالة,مستخدم,تاريخ الاستخدام,التصنيف,مخصص لـ,بداية الصلاحية,نهاية الصلاحية,تاريخ الإنشاء\n"
    const rows = filteredCards
      .map(
        (card, index) => {
          const category = getCategoryName(card.category_id)
          const assignedTo = card.assigned_to ? getUserName(card.assigned_to) : ''
          const validFrom = new Date(card.valid_from).toLocaleDateString("ar-EG")
          const validUntil = card.valid_until ? new Date(card.valid_until).toLocaleDateString("ar-EG") : ''
          return `${index + 1},${card.code},${card.points},${card.status},${card.is_used ? 'نعم' : 'لا'},${card.used_at ? new Date(card.used_at).toLocaleDateString("ar-EG") : ''},${category},${assignedTo},${validFrom},${validUntil},${new Date(card.created_at).toLocaleDateString("ar-EG")}`
        }
      )
      .join("\n")

    const csvContent = `data:text/csv;charset=utf-8,${headers}${rows}`
    const encodedUri = encodeURI(csvContent)

    // Create download link
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `كروت-الشحن-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-6 pb-16 sm:pb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-6 gap-3 sm:gap-0">
        <h1 className="text-xl sm:text-2xl font-bold">إدارة كروت الشحن</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/admin/cards/create" className="w-full sm:w-auto">
                  <Button variant="default" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm h-10 sm:h-10 w-full sm:w-auto">
                    <PlusCircle className="h-5 w-5 sm:h-4 sm:w-4" />
                    <span className="sm:inline">إنشاء كروت جديدة</span>
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">إنشاء كروت شحن جديدة</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/admin/dashboard" className="w-full sm:w-auto">
                  <Button variant="outline" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm h-10 sm:h-10 w-full sm:w-auto">
                    <ArrowLeftCircle className="h-5 w-5 sm:h-4 sm:w-4" />
                    <span className="sm:inline">العودة للوحة التحكم</span>
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">العودة للوحة التحكم</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <Card className="mb-3 sm:mb-6">
        <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
          <CardTitle className="flex items-center gap-1 sm:gap-2 text-base sm:text-lg">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
            تصفية وبحث
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">يمكنك البحث عن كروت الشحن وتصفيتها حسب الحالة</CardDescription>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-4">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="w-full">
              <Label htmlFor="search" className="mb-1 sm:mb-2 block text-xs sm:text-sm">بحث</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="ابحث برمز الكرت"
                  className="pl-7 sm:pl-8 h-8 sm:h-9 text-xs sm:text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="w-full">
              <Label htmlFor="filter" className="mb-1 sm:mb-2 block text-xs sm:text-sm">حالة الكرت</Label>
              <Select
                value={filter}
                onValueChange={(value) => setFilter(value as "all" | "used" | "unused" | "active" | "inactive" | "assigned")}
              >
                <SelectTrigger id="filter" className="h-8 sm:h-9 text-xs sm:text-sm">
                  <SelectValue placeholder="جميع الكروت" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs sm:text-sm">جميع الكروت</SelectItem>
                  <SelectItem value="used" className="text-xs sm:text-sm">الكروت المستخدمة</SelectItem>
                  <SelectItem value="unused" className="text-xs sm:text-sm">الكروت غير المستخدمة</SelectItem>
                  <SelectItem value="active" className="text-xs sm:text-sm">الكروت النشطة</SelectItem>
                  <SelectItem value="inactive" className="text-xs sm:text-sm">الكروت غير النشطة</SelectItem>
                  <SelectItem value="assigned" className="text-xs sm:text-sm">الكروت المخصصة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-2 w-full">
              <Button 
                variant="outline" 
                onClick={downloadCardsCSV} 
                disabled={filteredCards.length === 0}
                className="flex-1 h-8 sm:h-9 text-xs sm:text-sm"
              >
                <Download className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                تنزيل CSV
              </Button>
              <Button 
                variant="default" 
                onClick={loadCards}
                className="flex-1 h-8 sm:h-9 text-xs sm:text-sm"
              >
                {loading ? <Loader2 className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : "تحديث"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
          <CardTitle className="flex items-center gap-1 sm:gap-2 text-base sm:text-lg">
            <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
            كروت الشحن
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            عدد الكروت: {filteredCards.length} من أصل {cards.length}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-3">
          {loading ? (
            <div className="flex justify-center items-center py-6 sm:py-8">
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin" />
            </div>
          ) : filteredCards.length > 0 ? (
            <div className="border rounded-md mx-2 sm:mx-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right whitespace-nowrap text-xs px-1 py-2 sm:p-3">#</TableHead>
                    <TableHead className="text-right whitespace-nowrap text-xs px-1 py-2 sm:p-3">رمز الكرت</TableHead>
                    <TableHead className="text-right whitespace-nowrap text-xs px-1 py-2 sm:p-3">النقاط</TableHead>
                    <TableHead className="text-right whitespace-nowrap text-xs px-1 py-2 sm:p-3">الحالة</TableHead>
                    <TableHead className="text-right whitespace-nowrap text-xs px-1 py-2 sm:p-3">الاستخدام</TableHead>
                    <TableHead className="text-right whitespace-nowrap text-xs px-1 py-2 sm:p-3 hidden md:table-cell">التصنيف</TableHead>
                    <TableHead className="text-right whitespace-nowrap text-xs px-1 py-2 sm:p-3 hidden md:table-cell">التخصيص</TableHead>
                    <TableHead className="text-right whitespace-nowrap text-xs px-1 py-2 sm:p-3 hidden md:table-cell">الصلاحية</TableHead>
                    <TableHead className="text-right whitespace-nowrap text-xs px-1 py-2 sm:p-3">التفاصيل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCards.map((card, index) => (
                    <TableRow key={card.id}>
                      <TableCell className="text-xs px-1 py-1 sm:p-3">{index + 1}</TableCell>
                      <TableCell className="font-mono text-xs px-1 py-1 sm:p-3">{card.code}</TableCell>
                      <TableCell className="text-xs px-1 py-1 sm:p-3">{card.points}</TableCell>
                      
                      {/* Status */}
                      <TableCell className="px-1 py-1 sm:p-3">
                        {card.status === 'active' ? (
                          <span className="inline-flex items-center px-1 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium bg-green-100 text-green-800">
                            <Check className="mr-0.5 sm:mr-1 h-2 w-2 sm:h-3 sm:w-3" /> نشط
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium bg-red-100 text-red-800">
                            <X className="mr-0.5 sm:mr-1 h-2 w-2 sm:h-3 sm:w-3" /> غير نشط
                          </span>
                        )}
                      </TableCell>
                      
                      {/* Usage */}
                      <TableCell className="px-1 py-1 sm:p-3">
                        {card.is_used ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex items-center px-1 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium bg-red-100 text-red-800 cursor-help">
                                  <Check className="mr-0.5 sm:mr-1 h-2 w-2 sm:h-3 sm:w-3" /> مستخدم
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="space-y-1 text-xs sm:text-sm">
                                  <p>المستخدم: {card.used_by ? getUserName(card.used_by) : "-"}</p>
                                  <p>تاريخ الاستخدام: {card.used_at ? new Date(card.used_at).toLocaleDateString("ar-EG") : "-"}</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="inline-flex items-center px-1 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium bg-green-100 text-green-800">
                            <X className="mr-0.5 sm:mr-1 h-2 w-2 sm:h-3 sm:w-3" /> غير مستخدم
                          </span>
                        )}
                      </TableCell>
                      
                      {/* Category */}
                      <TableCell className="px-1 py-1 sm:p-3 hidden md:table-cell">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center px-1 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium bg-blue-100 text-blue-800 cursor-help">
                                <Tag className="mr-0.5 sm:mr-1 h-2 w-2 sm:h-3 sm:w-3" /> {getCategoryName(card.category_id)}
                              </span>
                            </TooltipTrigger>
                            {card.category_id && (
                              <TooltipContent>
                                <div className="space-y-1 text-xs sm:text-sm">
                                  <p>{categories.find(c => c.id === card.category_id)?.description || "بدون وصف"}</p>
                                </div>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      
                      {/* Assignment */}
                      <TableCell className="px-1 py-1 sm:p-3 hidden md:table-cell">
                        {card.assigned_to ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex items-center px-1 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium bg-purple-100 text-purple-800 cursor-help">
                                  <User className="mr-0.5 sm:mr-1 h-2 w-2 sm:h-3 sm:w-3" /> مخصص
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="space-y-1 text-xs sm:text-sm">
                                  <p>مخصص لـ: {getUserName(card.assigned_to)}</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="inline-flex items-center px-1 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium bg-gray-100 text-gray-800">
                            <User className="mr-0.5 sm:mr-1 h-2 w-2 sm:h-3 sm:w-3" /> للجميع
                          </span>
                        )}
                      </TableCell>
                      
                      {/* Validity */}
                      <TableCell className="px-1 py-1 sm:p-3 hidden md:table-cell">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center px-1 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium bg-orange-100 text-orange-800 cursor-help">
                                <Calendar className="mr-0.5 sm:mr-1 h-2 w-2 sm:h-3 sm:w-3" /> 
                                {card.valid_until ? 'محدد' : 'مفتوح'}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-1 text-xs sm:text-sm">
                                <p>من: {new Date(card.valid_from).toLocaleDateString("ar-EG")}</p>
                                {card.valid_until && (
                                  <p>إلى: {new Date(card.valid_until).toLocaleDateString("ar-EG")}</p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>

                      {/* Details */}
                      <TableCell className="px-1 py-1 sm:p-3">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 sm:h-8 sm:w-8 p-0">
                                <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-1 text-xs sm:text-sm w-56 sm:w-64">
                                <p>تاريخ الإنشاء: {new Date(card.created_at).toLocaleDateString("ar-EG")}</p>
                                <p>أنشئ بواسطة: {getUserName(card.created_by)}</p>
                                <p>الحد الأقصى للمحاولات: {card.max_usage_attempts}</p>
                                <p>المحاولات الفاشلة: {card.failed_attempts}</p>
                                <p>فترة الانتظار: {card.usage_cooldown_hours} ساعة</p>
                                {!card.category_id && <p>التصنيف: {getCategoryName(card.category_id)}</p>}
                                {!card.assigned_to && <p>متاح للجميع</p>}
                                {card.assigned_to && <p>مخصص لـ: {getUserName(card.assigned_to)}</p>}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8">
              <CreditCard className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground" />
              <p className="mt-3 sm:mt-4 text-base sm:text-lg">لا توجد كروت شحن تطابق البحث</p>
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
                <span className="text-xs mt-1">الإنشاء</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">إنشاء كروت</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/admin/cards/create" className="flex flex-col items-center justify-center">
                <div className="rounded-full h-12 w-12 bg-primary flex items-center justify-center shadow-lg">
                  <PlusCircle className="h-6 w-6 text-primary-foreground" />
                </div>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">إنشاء كروت جديدة</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/admin/cards/categories" className="flex flex-col items-center justify-center p-2 min-w-[60px]">
                <Tag className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs mt-1">التصنيفات</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">تصنيفات الكروت</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/admin/cards/limits" className="flex flex-col items-center justify-center p-2 min-w-[60px]">
                <Calculator className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs mt-1">الحدود</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">حدود استخدام الكروت</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
} 