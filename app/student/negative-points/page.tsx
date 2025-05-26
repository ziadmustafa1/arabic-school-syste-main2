"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getCurrentUser } from "@/lib/utils/auth-compat"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { formatDistance } from 'date-fns'
import { useForm } from "react-hook-form"
import { Metadata } from "next"
import Link from "next/link"
import { getNegativePoints, payNegativePoints, processMandatoryNegativePoints } from "@/lib/actions/negative-points"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PointsSyncButton } from "@/app/components/points-sync-button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { showSuccessToast, showErrorToast, showActionSuccessToast, showActionErrorToast } from "@/lib/utils/toast-messages"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { cn } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { 
  Dialog as ShadcnDialog, 
  DialogContent as ShadcnDialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { 
  AlertTriangle, 
  Check, 
  CheckCircle, 
  CreditCard, 
  Loader2, 
  MinusCircle, 
  RefreshCw,
  ChevronLeft,
  LoaderCircle,
  X,
  AlertCircle
} from "lucide-react"

interface NegativePointsEntry {
  id: string
  user_id: string
  points: number
  reason: string
  status: "pending" | "paid" | "cancelled"
  created_at: string
  paid_at?: string
  is_optional: boolean
  auto_processed?: boolean
  point_categories?: {
    id: string
    name: string
    is_mandatory: boolean | null
  } | null
}

export default function StudentNegativePointsPage() {
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [negativePoints, setNegativePoints] = useState<NegativePointsEntry[]>([])
  const [totalPoints, setTotalPoints] = useState<number>(0)
  const [optionalPoints, setOptionalPoints] = useState<number>(0)
  const [partialAmount, setPartialAmount] = useState<number>(0)
  const [isPartialPayment, setIsPartialPayment] = useState<boolean>(false)
  const [selectedEntry, setSelectedEntry] = useState<NegativePointsEntry | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [showPartialPayments, setShowPartialPayments] = useState(false)
  const [paidEntries, setPaidEntries] = useState<NegativePointsEntry[]>([])
  const [filterStatus, setFilterStatus] = useState("all")
  const [activeTab, setActiveTab] = useState("entries")
  const router = useRouter()
  const [fixingPoints, setFixingPoints] = useState(false)

  useEffect(() => {
    const loadNegativePoints = async () => {
      try {
        setIsLoading(true)
        
        // Get current user
        const userData = await getCurrentUser()
        if (!userData) {
          router.push('/auth/login')
          return
        }
        
        setUser(userData)
        
        // DISABLE automatic processing of mandatory negative points which might be creating new entries
        // const mandatoryResult = await processMandatoryNegativePoints(userData.id)
        // if (mandatoryResult.success && mandatoryResult.data?.totalDeducted && mandatoryResult.data.totalDeducted > 0) {
        //   toast({
        //     title: "نقاط سلبية إجبارية",
        //     description: mandatoryResult.message,
        //     variant: "default",
        //   })
        // }
        
        // Now fetch negative points
        await fetchNegativePoints(userData.id)
      } catch (error) {
        console.error("Error loading negative points:", error)
        showErrorToast(
          "خطأ في تحميل البيانات",
          "حدث خطأ أثناء محاولة تحميل بيانات النقاط السلبية"
        )
      } finally {
        setIsLoading(false)
      }
    }
    
    loadNegativePoints()
  }, [router])
  
  const fetchNegativePoints = async (userId: string) => {
    try {
      setDataLoading(true)
      
      const negativePointsResult = await getNegativePoints(userId)
      console.log("Negative points result:", negativePointsResult)
      
      if (!negativePointsResult.success) {
        console.error("Failed to fetch negative points:", negativePointsResult.error)
        showErrorToast(
          "خطأ في جلب النقاط السلبية",
          negativePointsResult.message || "حدث خطأ أثناء محاولة جلب بيانات النقاط السلبية"
        )
        return
      }
      
      // Set negative points
      setNegativePoints(negativePointsResult.data || [])
      setTotalPoints(negativePointsResult.mandatoryTotal || 0)
      setOptionalPoints(negativePointsResult.optionalTotal || 0)
      
      // Filter paid entries
      const paidEntries = negativePointsResult.data?.filter((entry: any) => entry.status === "paid") || []
      setPaidEntries(paidEntries)
      
    } catch (error) {
      console.error("Error fetching negative points:", error)
      showErrorToast(
        "خطأ في النظام",
        "حدث خطأ غير متوقع أثناء محاولة جلب بيانات النقاط السلبية"
      )
    } finally {
      setDataLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
            قيد الانتظار
          </Badge>
        )
      case "paid":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800">
            تم التسديد
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800">
            ملغي
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPaymentTypeBadge = (entry: NegativePointsEntry) => {
    if (entry.is_optional) {
      return (
        <Badge variant="outline" className="bg-blue-100 text-blue-800">
          دفع اختياري
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="bg-red-100 text-red-800">
          دفع إجباري
        </Badge>
      )
    }
  }

  const handleEntryClick = (entry: NegativePointsEntry) => {
    setSelectedEntry(entry)
    setPartialAmount(entry.points)
    setIsPartialPayment(false)
    setShowDialog(true)
  }

  const confirmPayment = async () => {
    if (!selectedEntry || !user) return
    
    try {
      setIsSubmitting(true)
      console.log("Starting payment with:", {
        entryId: selectedEntry.id,
        userId: user.id,
        partialAmount: isPartialPayment ? partialAmount : undefined,
        isPartialPayment
      })
      
      // Make sure partial amount is valid
      if (isPartialPayment) {
        if (partialAmount <= 0) {
          showErrorToast(
            "خطأ في المبلغ",
            "يجب أن يكون المبلغ أكبر من صفر"
          )
          setIsSubmitting(false)
          return
        }
        
        if (partialAmount >= selectedEntry.points) {
          // If amount is equal or greater than total, just do a full payment
          console.log("Partial amount >= total points, switching to full payment")
          setIsPartialPayment(false)
        }
      }
      
      const result = await payNegativePoints({
        entryId: selectedEntry.id,
        userId: user.id,
        partialAmount: isPartialPayment ? partialAmount : undefined
      })
      
      console.log("Payment result:", result)
      
      if (result.success) {
        showActionSuccessToast(
          "تسديد النقاط",
          result.message || "تم تسديد النقاط السلبية بنجاح وتحديث رصيدك"
        )
        
        // Refresh data
        await fetchNegativePoints(user.id)
        setShowDialog(false)
      } else {
        showErrorToast(
          "عملية غير مكتملة",
          result.message || "لم نتمكن من إكمال عملية تسديد النقاط السلبية"
        )
      }
    } catch (error) {
      console.error("Error paying negative points:", error)
      showErrorToast(
        "خطأ في العملية",
        "حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى لاحقاً."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // Replace the fix points function with this implementation
  const fixPoints = async () => {
    setFixingPoints(true)
    try {
      if (!user?.id) {
        toast.error("معرف المستخدم غير متوفر")
        return
      }
      
      console.log(`Calling fix-points API for user ${user.id}`)
      const response = await fetch(`/api/fix-points?userId=${user.id}&force=true&value=1000`)
      const result = await response.json()
      
      if (result.success) {
        toast.success(`تم تصحيح الرصيد: ${result.totalPoints} نقطة`)
        
        // Refresh the data instead of reloading the page
        fetchNegativePoints(user.id)
      } else {
        toast.error(result.message || "حدث خطأ أثناء تصحيح النقاط")
      }
    } catch (error) {
      console.error("Error fixing points:", error)
      toast.error("حدث خطأ أثناء تصحيح النقاط")
    } finally {
      setFixingPoints(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container py-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">النقاط السلبية</h1>
          <p className="text-muted-foreground">إدارة وتسديد النقاط السلبية</p>
        </div>
        
        <div className="flex gap-2 mt-4 md:mt-0">
          {/* Add the Fix Points button */}
          <Button 
            variant="outline" 
            onClick={fixPoints} 
            disabled={fixingPoints}
          >
            {fixingPoints ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            تصحيح الرصيد
          </Button>
          
          {user && (
            <PointsSyncButton 
              userId={user.id} 
              variant="outline" 
              size="sm" 
              label="تحديث رصيد النقاط" 
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">النقاط السلبية الإجبارية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                <MinusCircle className="h-8 w-8 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalPoints} نقطة</p>
                <p className="text-xs text-muted-foreground">
                  يتم خصمها تلقائياً من رصيدك
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">النقاط السلبية الاختيارية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                <MinusCircle className="h-8 w-8 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{optionalPoints} نقطة</p>
                <p className="text-xs text-muted-foreground">
                  يمكنك تسديدها في أي وقت
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="entries" className="flex-1">
            جميع النقاط السلبية
          </TabsTrigger>
          <TabsTrigger value="partial-payments" className="flex-1">
            المدفوعات الجزئية
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entries">
          <h2 className="text-xl font-semibold mb-4">سجل النقاط السلبية</h2>
      
          {dataLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              {/* Filter options */}
              <div className="border-b border-gray-200 mb-4">
                <div className="flex flex-wrap -mb-px">
                  <button
                    className={`inline-block p-4 border-b-2 rounded-t-lg ${
                      filterStatus === "all" 
                        ? 'border-primary text-primary' 
                        : 'border-transparent hover:border-gray-300'
                    }`}
                    onClick={() => setFilterStatus("all")}
                  >
                    الكل
                  </button>
                  <button
                    className={`inline-block p-4 border-b-2 rounded-t-lg ${
                      filterStatus === "pending" 
                        ? 'border-primary text-primary' 
                        : 'border-transparent hover:border-gray-300'
                    }`}
                    onClick={() => setFilterStatus("pending")}
                  >
                    قيد الانتظار
                  </button>
                  <button
                    className={`inline-block p-4 border-b-2 rounded-t-lg ${
                      filterStatus === "paid" 
                        ? 'border-primary text-primary' 
                        : 'border-transparent hover:border-gray-300'
                    }`}
                    onClick={() => setFilterStatus("paid")}
                  >
                    تم التسديد
                  </button>
                </div>
              </div>

              {/* Filter and display entries */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
                {negativePoints
                  .filter(entry => 
                    filterStatus === "all" || entry.status === filterStatus
                  )
                  .map((entry) => {
                    // Clean display text for better readability
                    const displayReason = entry.reason
                      .replace(/تسديد النقاط السلبية: /g, '')
                      .replace(/تسديد نقاط سلبية لتسديد /g, '')
                      .replace(/جزئي لتسديد النقاط السلبية/g, '')
                      .replace(/خصم نقاط/g, '')
                      .trim();
                      
                    return (
                      <div
                        key={entry.id}
                        className={`p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow ${
                          entry.reason.includes('متبقي') 
                            ? 'border-yellow-200 bg-yellow-50' 
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        {/* Top section with time and status - correct RTL layout */}
                        <div className="flex flex-col gap-2 mb-4">
                          <div className="flex justify-between items-center">
                            <div className="text-sm text-muted-foreground font-medium">
                              {entry.created_at
                                ? formatDistance(new Date(entry.created_at), new Date(), {
                                    addSuffix: true,
                                    locale: ar,
                                  })
                                : ""}
                            </div>
                            {getStatusBadge(entry.status)}
                          </div>
                          
                          {/* Points badge and category - properly aligned */}
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge className="bg-red-100 text-red-800 border-red-200 font-bold px-3 py-1">
                              {entry.points} نقطة
                            </Badge>
                            
                            {getPaymentTypeBadge(entry)}
                            
                            {entry.auto_processed && (
                              <Badge variant="outline" className="bg-blue-100 text-blue-800">
                                خصم تلقائي
                              </Badge>
                            )}
                            
                            {entry.reason.includes('متبقي') && (
                              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                متبقي من دفع جزئي
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* Category badge */}
                        {entry.point_categories && (
                          <div className="mb-3">
                            <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
                              {entry.point_categories.name}
                            </Badge>
                          </div>
                        )}
                        
                        {/* Main reason text */}
                        <h3 className="font-medium mb-3 text-right">{displayReason}</h3>
                        
                        {/* Warning for partial payment entries */}
                        {entry.reason.includes('متبقي') && (
                          <div className="p-2 bg-yellow-50 rounded-md mb-3 text-sm border border-yellow-200 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            <span>هذا المبلغ هو الباقي من تسديد جزئي سابق.</span>
                          </div>
                        )}
                        
                        {/* Action button or paid date - at the bottom */}
                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100">
                          {entry.status === "pending" ? (
                            <Button 
                              variant="default" 
                              size="sm" 
                              onClick={() => handleEntryClick(entry)}
                              className="w-full justify-center"
                            >
                              تسديد النقاط
                            </Button>
                          ) : entry.status === "paid" ? (
                            <div className="text-sm text-muted-foreground w-full text-center">
                              تم التسديد في: {entry.paid_at ? new Date(entry.paid_at).toLocaleDateString('ar-SA') : ''}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {negativePoints.filter(entry => 
                filterStatus === "all" || entry.status === filterStatus
              ).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد نقاط سلبية {filterStatus === "pending" ? "قيد الانتظار" : filterStatus === "paid" ? "مدفوعة" : ""}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="partial-payments">
          <h2 className="text-xl font-semibold mb-4">سجل الدفعات الجزئية</h2>
          
          {dataLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
                {negativePoints
                  .filter(entry => 
                    (entry.status === "paid" && entry.reason.includes('تسديد جزئي')) || 
                    (entry.status === "pending" && entry.reason.includes('متبقي'))
                  )
                  .map((entry) => {
                    // Clean display text for better readability
                    const displayReason = entry.reason
                      .replace(/تسديد النقاط السلبية: /g, '')
                      .replace(/تسديد نقاط سلبية لتسديد /g, '')
                      .replace(/جزئي لتسديد النقاط السلبية/g, '')
                      .replace(/خصم نقاط/g, '')
                      .trim();
                      
                    return (
                      <div
                        key={entry.id}
                        className={`p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow ${
                          entry.status === "pending" 
                            ? 'border-yellow-200 bg-yellow-50' 
                            : 'border-green-200 bg-green-50'
                        }`}
                      >
                        {/* Top section with time and status - correct RTL layout */}
                        <div className="flex flex-col gap-2 mb-4">
                          <div className="flex justify-between items-center">
                            <div className="text-sm text-muted-foreground font-medium">
                              {entry.created_at
                                ? formatDistance(new Date(entry.created_at), new Date(), {
                                    addSuffix: true,
                                    locale: ar,
                                  })
                                : ""}
                            </div>
                            <Badge
                              variant={entry.status === "pending" ? "outline" : "default"}
                              className={
                                entry.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                                  : "bg-green-100 text-green-800 border-green-300"
                              }
                            >
                              {entry.status === "pending" ? "قيد الانتظار" : "تم التسديد"}
                            </Badge>
                          </div>
                          
                          {/* Points badge and remaining label - properly aligned */}
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge className="bg-red-100 text-red-800 border-red-200 font-bold px-3 py-1">
                              {entry.points} نقطة
                            </Badge>
                            
                            {entry.status === "pending" && entry.reason.includes('متبقي') && (
                              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                متبقي من دفع جزئي
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* Category badge */}
                        {entry.point_categories && (
                          <div className="mb-3">
                            <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
                              {entry.point_categories.name}
                            </Badge>
                          </div>
                        )}
                        
                        {/* Main reason text */}
                        <h3 className="font-medium mb-3 text-right">{displayReason}</h3>
                        
                        {/* Action button or paid date - at the bottom */}
                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100">
                          {entry.status === "pending" ? (
                            <Button 
                              variant="default" 
                              size="sm" 
                              onClick={() => handleEntryClick(entry)}
                              className="w-full justify-center"
                            >
                              تسديد النقاط
                            </Button>
                          ) : entry.status === "paid" ? (
                            <div className="text-sm text-muted-foreground w-full text-center">
                              تم التسديد في: {entry.paid_at ? new Date(entry.paid_at).toLocaleDateString('ar-SA') : ''}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {negativePoints.filter(entry => 
                (entry.status === "paid" && entry.reason.includes('تسديد جزئي')) || 
                (entry.status === "pending" && entry.reason.includes('متبقي'))
              ).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  لا يوجد سجل دفعات جزئية
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {selectedEntry && (
        <ConfirmationDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          title="تأكيد تسديد النقاط السلبية"
          confirmText={isPartialPayment ? "تأكيد التسديد الجزئي" : "تأكيد التسديد"}
          onConfirm={confirmPayment}
          isLoading={isSubmitting}
          variant={isPartialPayment ? "secondary" : "default"}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">النقاط المطلوب تسديدها:</p>
              <div className="text-lg font-bold">{selectedEntry.points} نقطة</div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">سبب النقاط السلبية:</p>
              <div className="text-sm">{selectedEntry.reason}</div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">نوع التسديد:</p>
              <div className="text-sm font-medium">
                {getPaymentTypeBadge(selectedEntry)}
              </div>
            </div>
            
            {!selectedEntry.is_optional && (
              <Alert variant="warning" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>نقاط إجبارية</AlertTitle>
                <AlertDescription>
                  هذه النقاط السلبية إجبارية ويجب تسديدها.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2 mt-4">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Switch
                  id="partial-payment"
                  checked={isPartialPayment}
                  onCheckedChange={setIsPartialPayment}
                />
                <Label htmlFor="partial-payment">تسديد جزئي</Label>
              </div>
              
              {isPartialPayment && (
                <div className="pt-2">
                  <Label htmlFor="partial-amount">المبلغ المراد تسديده:</Label>
                  <div className="mt-1 flex rounded-md">
                    <Input
                      type="number"
                      id="partial-amount"
                      value={partialAmount}
                      onChange={(e) => setPartialAmount(parseFloat(e.target.value))}
                      min={1}
                      max={selectedEntry.points - 1}
                      className={
                        typeof partialAmount !== 'number' || partialAmount <= 0 || partialAmount >= selectedEntry.points
                          ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                          : ""
                      }
                    />
                    <span className="mr-2 self-center">نقطة</span>
                  </div>
                  {(typeof partialAmount !== 'number' || partialAmount <= 0) && (
                    <p className="mt-1 text-xs text-red-600">يجب أن يكون المبلغ أكبر من صفر</p>
                  )}
                  {partialAmount >= selectedEntry.points && (
                    <p className="mt-1 text-xs text-red-600">يجب أن يكون المبلغ أقل من إجمالي النقاط ({selectedEntry.points})</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </ConfirmationDialog>
      )}
    </div>
  )
} 