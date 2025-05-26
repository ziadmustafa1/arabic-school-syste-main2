"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { generateRechargeCards } from "@/app/actions/points"
import { getCategories, getUsers, getSavedRechargeCards } from "@/app/actions/admin"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { CreditCard, Download, Loader2, Plus, Calendar, User, Clock, ArrowLeftCircle, Tag, Calculator } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
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
  created_by: string
  created_at: string
}

interface CardCategory {
  id: number
  name: string
  description: string | null
}

interface User {
  id: string
  full_name: string
  email: string | null
  role_id: number
}

interface RechargeCardResponse {
  success: boolean;
  message: string;
  data?: RechargeCard[];
}

export default function RechargeCardsPage() {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [formData, setFormData] = useState({
    count: "10",
    points: "100",
    categoryId: "none",
    validFrom: new Date().toISOString().slice(0, 16),
    validUntil: "",
    status: "active",
    assignedTo: "none",
    maxUsageAttempts: "1",
    usageCooldownHours: "0",
  })
  const [generatedCards, setGeneratedCards] = useState<RechargeCard[]>([])
  const [savedCards, setSavedCards] = useState<RechargeCard[]>([])
  const [showSavedCards, setShowSavedCards] = useState(false)
  const [categories, setCategories] = useState<CardCategory[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCheckingDb, setIsCheckingDb] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async (forceRefresh = false) => {
    try {
      setIsLoading(true)
      
      // Load categories using server action
      const categoriesResult = await getCategories()
      if (categoriesResult.success && categoriesResult.data) {
        setCategories(categoriesResult.data)
      }

      // Load users using server action
      const usersResult = await getUsers()
      if (usersResult.success && usersResult.data) {
        setUsers(usersResult.data)
      }
      
      // Load saved cards
      const savedCardsResult = await getSavedRechargeCards()
      if (savedCardsResult.success && savedCardsResult.data) {
        setSavedCards(savedCardsResult.data)
        
        // If no generatedCards and we have saved cards, show them
        if (generatedCards.length === 0 && savedCardsResult.data.length > 0 && !showSavedCards) {
          setShowSavedCards(true)
        }
      }
      
      if (forceRefresh) {
        toast({
          title: "تم التحديث",
          description: "تم تحديث البيانات بنجاح",
        })
      }
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "خطأ في تحميل البيانات",
        description: "حدث خطأ أثناء تحميل البيانات",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsGenerating(true)

    try {
      const formDataObj = new FormData()
      formDataObj.append("count", formData.count)
      formDataObj.append("points", formData.points)
      
      if (formData.categoryId && formData.categoryId !== "none") {
        formDataObj.append("categoryId", formData.categoryId)
      }
      
      if (formData.validFrom) {
        formDataObj.append("validFrom", new Date(formData.validFrom).toISOString())
      }
      
      if (formData.validUntil) {
        formDataObj.append("validUntil", new Date(formData.validUntil).toISOString())
      }
      
      formDataObj.append("status", formData.status)
      
      if (formData.assignedTo && formData.assignedTo !== "none") {
        formDataObj.append("assignedTo", formData.assignedTo)
      }
      
      formDataObj.append("maxUsageAttempts", formData.maxUsageAttempts)
      formDataObj.append("usageCooldownHours", formData.usageCooldownHours)

      const result = await generateRechargeCards(formDataObj) as RechargeCardResponse

      if (result && result.success) {
        toast({
          title: "تم إنشاء كروت الشحن",
          description: result.message || "تم إنشاء كروت الشحن بنجاح",
        })

        // Store generated cards
        if (result.data && Array.isArray(result.data) && result.data.length > 0) {
          setGeneratedCards(result.data)
          // Update saved cards - clone the array first to avoid TypeScript issues
          const newCards = [...result.data]
          setSavedCards(prev => [...prev, ...newCards])
        } else {
          // If data is undefined but success is true, reload saved cards
          const savedCardsResult = await getSavedRechargeCards()
          if (savedCardsResult.success && savedCardsResult.data) {
            setSavedCards(savedCardsResult.data)
          }
        }
      } else {
        toast({
          title: "خطأ في إنشاء كروت الشحن",
          description: result?.message || "حدث خطأ أثناء إنشاء كروت الشحن. يرجى المحاولة مرة أخرى.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "خطأ في إنشاء كروت الشحن",
        description: "حدث خطأ أثناء إنشاء كروت الشحن. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadCardsCSV = () => {
    if (generatedCards.length === 0) return

    // Create CSV content
    const headers = "رقم,رمز الكرت,عدد النقاط,التصنيف,تاريخ الإنشاء,تاريخ الانتهاء,مخصص لـ\n"
    const rows = generatedCards
      .map(
        (card, index) => {
          const category = categories.find(c => c.id === card.category_id)
          const assignedToUser = users.find(u => u.id === card.assigned_to)
          return `${index + 1},${card.code},${card.points},${category?.name || ''},${new Date(card.valid_from).toLocaleDateString("ar-EG")},${card.valid_until ? new Date(card.valid_until).toLocaleDateString("ar-EG") : ''},${assignedToUser?.full_name || ''}`
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

  const checkDatabaseStatus = async () => {
    try {
      setIsCheckingDb(true)
      
      // Create a FormData object with minimal data to test card creation
      const formData = new FormData()
      formData.append("count", "1")
      formData.append("points", "1")
      formData.append("status", "inactive") // Use inactive to avoid accidental usage
      
      // Test card generation
      const result = await generateRechargeCards(formData) as RechargeCardResponse
      
      // Check saved cards retrieval
      const savedCardsResult = await getSavedRechargeCards()
      
      toast({
        title: "حالة قاعدة البيانات",
        description: `حالة إنشاء الكروت: ${result && result.success ? "ناجح" : "فاشل"}. عدد الكروت المحفوظة: ${savedCardsResult.success ? savedCardsResult.data?.length || 0 : "غير معروف"}`,
        duration: 10000,
      })
      
      // Refresh data after check
      loadData(true)
    } catch (error) {
      console.error("Database check error:", error)
      toast({
        title: "خطأ في فحص قاعدة البيانات",
        description: "حدث خطأ أثناء فحص حالة قاعدة البيانات",
        variant: "destructive",
      })
    } finally {
      setIsCheckingDb(false)
    }
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-6 pb-16 sm:pb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-6 gap-3 sm:gap-0">
        <h1 className="text-xl sm:text-2xl font-bold">إدارة كروت الشحن</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" asChild className="text-xs sm:text-sm h-10 w-10 sm:w-auto sm:h-10 p-0 sm:p-2">
                  <Link href="/admin/cards/manage" className="flex items-center justify-center w-full h-full">
                    <CreditCard className="h-5 w-5 sm:h-4 sm:w-4 sm:mr-2" />
                    <span className="hidden sm:inline">عرض الكروت</span>
            </Link>
          </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">عرض الكروت</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" asChild className="text-xs sm:text-sm h-10 w-10 sm:w-auto sm:h-10 p-0 sm:p-2">
                  <Link href="/admin/cards/categories" className="flex items-center justify-center w-full h-full">
                    <CreditCard className="h-5 w-5 sm:h-4 sm:w-4 sm:mr-2" />
                    <span className="hidden sm:inline">التصنيفات</span>
            </Link>
          </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">التصنيفات</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" asChild className="text-xs sm:text-sm h-10 w-10 sm:w-auto sm:h-10 p-0 sm:p-2">
                  <Link href="/admin/cards/limits" className="flex items-center justify-center w-full h-full">
                    <CreditCard className="h-5 w-5 sm:h-4 sm:w-4 sm:mr-2" />
                    <span className="hidden sm:inline">الحدود</span>
            </Link>
          </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">الحدود</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">إنشاء كروت شحن جديدة</h2>

          <Card>
            <form onSubmit={handleSubmit}>
              <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                  إنشاء كروت شحن
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">أدخل تفاصيل كروت الشحن الجديدة</CardDescription>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 py-2 sm:py-3 space-y-3 sm:space-y-4">
                {/* Basic Info */}
                <div className="space-y-2">
                  <Label htmlFor="count" className="text-xs sm:text-sm">عدد الكروت</Label>
                  <Input
                    id="count"
                    name="count"
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={formData.count}
                    onChange={handleChange}
                    className="h-8 sm:h-9 text-xs sm:text-sm"
                  />
                  <p className="text-xs text-muted-foreground">الحد الأقصى 100 كرت في المرة الواحدة</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="points" className="text-xs sm:text-sm">عدد النقاط لكل كرت</Label>
                  <Input
                    id="points"
                    name="points"
                    type="number"
                    min="1"
                    required
                    value={formData.points}
                    onChange={handleChange}
                    className="h-8 sm:h-9 text-xs sm:text-sm"
                  />
                </div>

                <Accordion type="single" collapsible className="w-full">
                  {/* Categories */}
                  <AccordionItem value="category">
                    <AccordionTrigger className="text-xs sm:text-sm py-2 sm:py-3">التصنيف</AccordionTrigger>
                    <AccordionContent className="pt-1">
                      <div className="space-y-2">
                        <Label htmlFor="categoryId" className="text-xs sm:text-sm">تصنيف الكروت</Label>
                        <Select
                          value={formData.categoryId}
                          onValueChange={(value) => handleSelectChange("categoryId", value)}
                        >
                          <SelectTrigger id="categoryId" className="h-8 sm:h-9 text-xs sm:text-sm">
                            <SelectValue placeholder="اختر تصنيف" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" className="text-xs sm:text-sm">بدون تصنيف</SelectItem>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id.toString()} className="text-xs sm:text-sm">
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Validity Period */}
                  <AccordionItem value="validity">
                    <AccordionTrigger className="text-xs sm:text-sm py-2 sm:py-3">فترة الصلاحية</AccordionTrigger>
                    <AccordionContent className="pt-1">
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="validFrom" className="flex items-center gap-1 text-xs sm:text-sm">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                            تاريخ بداية الصلاحية
                          </Label>
                          <Input
                            id="validFrom"
                            name="validFrom"
                            type="datetime-local"
                            value={formData.validFrom}
                            onChange={handleChange}
                            className="h-8 sm:h-9 text-xs sm:text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="validUntil" className="flex items-center gap-1 text-xs sm:text-sm">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                            تاريخ نهاية الصلاحية
                          </Label>
                          <Input
                            id="validUntil"
                            name="validUntil"
                            type="datetime-local"
                            value={formData.validUntil}
                            onChange={handleChange}
                            className="h-8 sm:h-9 text-xs sm:text-sm"
                          />
                          <p className="text-xs text-muted-foreground">اترك هذا الحقل فارغاً إذا كانت الصلاحية غير محدودة</p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Assignment */}
                  <AccordionItem value="assignment">
                    <AccordionTrigger className="text-xs sm:text-sm py-2 sm:py-3">تخصيص الكروت</AccordionTrigger>
                    <AccordionContent className="pt-1">
                      <div className="space-y-2">
                        <Label htmlFor="assignedTo" className="flex items-center gap-1 text-xs sm:text-sm">
                          <User className="h-3 w-3 sm:h-4 sm:w-4" />
                          تخصيص الكروت لمستخدم
                        </Label>
                        <Select
                          value={formData.assignedTo}
                          onValueChange={(value) => handleSelectChange("assignedTo", value)}
                        >
                          <SelectTrigger id="assignedTo" className="h-8 sm:h-9 text-xs sm:text-sm">
                            <SelectValue placeholder="اختر مستخدم" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" className="text-xs sm:text-sm">متاح للجميع</SelectItem>
                            {users.map((user) => (
                              <SelectItem key={user.id} value={user.id} className="text-xs sm:text-sm">
                                {user.full_name || user.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">تخصيص الكروت لمستخدم محدد. إذا لم يتم التخصيص، يمكن لأي مستخدم استخدامها</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Usage Settings */}
                  <AccordionItem value="usage">
                    <AccordionTrigger className="text-xs sm:text-sm py-2 sm:py-3">إعدادات الاستخدام</AccordionTrigger>
                    <AccordionContent className="pt-1">
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="status" className="text-xs sm:text-sm">حالة الكروت</Label>
                          <Select
                            value={formData.status}
                            onValueChange={(value) => handleSelectChange("status", value)}
                          >
                            <SelectTrigger id="status" className="h-8 sm:h-9 text-xs sm:text-sm">
                              <SelectValue placeholder="اختر الحالة" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active" className="text-xs sm:text-sm">نشط</SelectItem>
                              <SelectItem value="inactive" className="text-xs sm:text-sm">غير نشط</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="maxUsageAttempts" className="flex items-center gap-1 text-xs sm:text-sm">
                            <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                            الحد الأقصى لمحاولات الاستخدام
                          </Label>
                          <Input
                            id="maxUsageAttempts"
                            name="maxUsageAttempts"
                            type="number"
                            min="1"
                            value={formData.maxUsageAttempts}
                            onChange={handleChange}
                            className="h-8 sm:h-9 text-xs sm:text-sm"
                          />
                          <p className="text-xs text-muted-foreground">عدد المحاولات الفاشلة المسموح بها قبل تعطيل الكرت</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="usageCooldownHours" className="flex items-center gap-1 text-xs sm:text-sm">
                            <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                            فترة الانتظار بين المحاولات (بالساعات)
                          </Label>
                          <Input
                            id="usageCooldownHours"
                            name="usageCooldownHours"
                            type="number"
                            min="0"
                            value={formData.usageCooldownHours}
                            onChange={handleChange}
                            className="h-8 sm:h-9 text-xs sm:text-sm"
                          />
                          <p className="text-xs text-muted-foreground">الفترة الزمنية (بالساعات) التي يجب انتظارها بين محاولات استخدام الكرت</p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
              <CardFooter className="px-3 sm:px-6 pt-0 pb-3 sm:pb-4">
                <Button type="submit" className="w-full h-8 sm:h-10 text-xs sm:text-sm" disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                      جاري إنشاء الكروت...
                    </>
                  ) : (
                    "إنشاء كروت الشحن"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-4 gap-2">
            <h2 className="text-lg sm:text-xl font-semibold">الكروت التي تم إنشاؤها</h2>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs sm:text-sm h-8 w-full sm:w-auto"
                onClick={() => setShowSavedCards(!showSavedCards)}
              >
                {showSavedCards ? "عرض الكروت الجديدة" : "عرض الكروت المحفوظة"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm h-8 w-full sm:w-auto"
                onClick={() => loadData(true)}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : "تحديث"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm h-8 w-full sm:w-auto"
                onClick={checkDatabaseStatus}
                disabled={isCheckingDb}
              >
                {isCheckingDb ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : "فحص قاعدة البيانات"}
              </Button>
            </div>
          </div>

          {showSavedCards ? (
            savedCards.length > 0 ? (
              <Card>
                <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-4 pb-2">
                  <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                    <span className="flex items-center gap-1 sm:gap-2">
                      <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
                      كروت الشحن المحفوظة
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex items-center gap-1 text-xs sm:text-sm h-7 sm:h-8" 
                      onClick={() => {
                        const csvContent = `data:text/csv;charset=utf-8,رقم,رمز الكرت,عدد النقاط,التصنيف,الحالة,تاريخ الإنشاء\n${
                          savedCards.map((card, index) => 
                            `${index + 1},${card.code},${card.points},${card.category_id ? categories.find(c => c.id === card.category_id)?.name || 'بدون تصنيف' : 'بدون تصنيف'},${card.status === 'active' ? 'نشط' : 'غير نشط'},${new Date(card.created_at).toLocaleDateString("ar-EG")}`
                          ).join("\n")
                        }`
                        const encodedUri = encodeURI(csvContent)
                        const link = document.createElement("a")
                        link.setAttribute("href", encodedUri)
                        link.setAttribute("download", `كروت-الشحن-المحفوظة-${new Date().toISOString().slice(0, 10)}.csv`)
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                      }}
                    >
                      <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                      تنزيل CSV
                    </Button>
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    تم العثور على {savedCards.length} كرت في النظام
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-0 sm:px-3 pb-3">
                  <div className="max-h-80 sm:max-h-96 overflow-y-auto border rounded-md mx-2 sm:mx-3">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs sm:text-sm">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                            <th className="p-1 sm:p-2 text-right">#</th>
                            <th className="p-1 sm:p-2 text-right">رمز الكرت</th>
                            <th className="p-1 sm:p-2 text-right">النقاط</th>
                            <th className="p-1 sm:p-2 text-right hidden sm:table-cell">التصنيف</th>
                            <th className="p-1 sm:p-2 text-right">الحالة</th>
                            <th className="p-1 sm:p-2 text-right">الاستخدام</th>
                        </tr>
                      </thead>
                      <tbody>
                        {savedCards.slice(0, 50).map((card, index) => (
                          <tr key={card.id} className="border-t">
                              <td className="p-1 sm:p-2">{index + 1}</td>
                              <td className="p-1 sm:p-2 font-mono">{card.code}</td>
                              <td className="p-1 sm:p-2">{card.points}</td>
                              <td className="p-1 sm:p-2 hidden sm:table-cell">
                              {card.category_id 
                                ? categories.find(c => c.id === card.category_id)?.name || 'بدون تصنيف' 
                                : 'بدون تصنيف'}
                            </td>
                              <td className="p-1 sm:p-2">{card.status === 'active' ? 'نشط' : 'غير نشط'}</td>
                              <td className="p-1 sm:p-2">{card.is_used ? 'مستخدم' : 'غير مستخدم'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                  {savedCards.length > 50 && (
                    <p className="text-xs sm:text-sm text-muted-foreground mt-2 sm:mt-4 text-center">
                      تم عرض أحدث 50 كرت فقط. انتقل إلى صفحة "عرض جميع كروت الشحن" لرؤية المزيد.
                    </p>
                  )}
                </CardContent>
                <CardFooter className="px-3 sm:px-6 pt-0 pb-3 sm:pb-4">
                  <Button variant="outline" className="w-full h-8 sm:h-10 text-xs sm:text-sm" onClick={() => router.push("/admin/cards/manage")}>
                    إدارة جميع كروت الشحن
                  </Button>
                </CardFooter>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-6 sm:py-8">
                  <CreditCard className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground" />
                  <p className="mt-3 sm:mt-4 text-base sm:text-lg">لا توجد كروت شحن محفوظة بعد</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">استخدم النموذج المجاور لإنشاء كروت شحن جديدة</p>
                </CardContent>
              </Card>
            )
          ) : generatedCards.length > 0 ? (
            <Card>
              <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-4 pb-2">
                <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                  <span className="flex items-center gap-1 sm:gap-2">
                    <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
                    كروت الشحن الجديدة
                  </span>
                  <Button variant="outline" size="sm" className="flex items-center gap-1 text-xs sm:text-sm h-7 sm:h-8" onClick={downloadCardsCSV}>
                    <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                    تنزيل CSV
                  </Button>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  تم إنشاء {generatedCards.length} كرت بقيمة {generatedCards[0]?.points} نقطة لكل كرت
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 sm:px-3 pb-3">
                <div className="max-h-80 sm:max-h-96 overflow-y-auto border rounded-md mx-2 sm:mx-3">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                          <th className="p-1 sm:p-2 text-right">#</th>
                          <th className="p-1 sm:p-2 text-right">رمز الكرت</th>
                          <th className="p-1 sm:p-2 text-right">النقاط</th>
                          <th className="p-1 sm:p-2 text-right">الحالة</th>
                          <th className="p-1 sm:p-2 text-right hidden sm:table-cell">مخصص لـ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {generatedCards.map((card, index) => (
                        <tr key={card.id} className="border-t">
                            <td className="p-1 sm:p-2">{index + 1}</td>
                            <td className="p-1 sm:p-2 font-mono">{card.code}</td>
                            <td className="p-1 sm:p-2">{card.points}</td>
                            <td className="p-1 sm:p-2">{card.status === 'active' ? 'نشط' : 'غير نشط'}</td>
                            <td className="p-1 sm:p-2 hidden sm:table-cell">{card.assigned_to ? (users.find(u => u.id === card.assigned_to)?.full_name || 'مستخدم محدد') : 'متاح للجميع'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2 sm:mt-4 px-2 sm:px-0">
                  تم حفظ جميع الكروت في قاعدة البيانات. يمكنك الوصول إليها لاحقًا من صفحة "عرض جميع كروت الشحن".
                </p>
              </CardContent>
              <CardFooter className="px-3 sm:px-6 pt-0 pb-3 sm:pb-4">
                <Button variant="outline" className="w-full h-8 sm:h-10 text-xs sm:text-sm" onClick={() => router.push("/admin/cards/manage")}>
                  إدارة جميع كروت الشحن
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-6 sm:py-8">
                <CreditCard className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground" />
                <p className="mt-3 sm:mt-4 text-base sm:text-lg">لم يتم إنشاء كروت شحن بعد</p>
                <p className="text-xs sm:text-sm text-muted-foreground">استخدم النموذج المجاور لإنشاء كروت شحن جديدة</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-background border-t flex justify-around items-center h-14 z-50">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/admin/dashboard" className="flex flex-col items-center justify-center p-2 min-w-[60px]">
                <ArrowLeftCircle className="h-6 w-6 text-muted-foreground" />
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
              <Link href="/admin/cards/manage" className="flex flex-col items-center justify-center p-2 min-w-[60px]">
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
              <form onSubmit={handleSubmit} className="flex flex-col items-center justify-center">
                <Button 
                  type="submit"
                  variant="default" 
                  className="rounded-full h-12 w-12 flex flex-col items-center justify-center shadow-lg p-0"
                >
                  <Plus className="h-6 w-6" />
                </Button>
              </form>
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
