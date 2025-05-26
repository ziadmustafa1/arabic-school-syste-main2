"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  AlertTriangle, 
  Loader2, 
  FileText,
  CreditCard,
  Upload,
  ThumbsDown
} from "lucide-react"
import { getNegativePoints, payNegativePoints } from "@/lib/actions/negative-points"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

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

export default function TeacherMyNegativePointsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [negativePoints, setNegativePoints] = useState<NegativePointsEntry[]>([])
  const [mandatoryPoints, setMandatoryPoints] = useState(0)
  const [optionalPoints, setOptionalPoints] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [filterStatus, setFilterStatus] = useState("all")

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/login')
          return
        }
        
        // Get negative points data
        await fetchNegativePoints(user.id)
      } catch (error: any) {
        console.error("Error loading negative points:", error)
        toast({
          title: "خطأ في تحميل البيانات",
          description: error.message || "فشل في تحميل بيانات النقاط السلبية",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [router, supabase])
  
  const fetchNegativePoints = async (userId: string) => {
    try {
      setIsLoading(true)
      const result = await getNegativePoints(userId)
      
      if (result.success) {
        setNegativePoints(result.data || [])
        setMandatoryPoints(result.mandatoryTotal || 0)
        setOptionalPoints(result.optionalTotal || 0)
      } else {
        toast({
          title: "خطأ في تحميل النقاط السلبية",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Error fetching negative points:", error)
      toast({
        title: "خطأ في النظام",
        description: "حدث خطأ أثناء محاولة تحميل بيانات النقاط السلبية",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  const handlePayNegativePoints = async (entryId: string) => {
    try {
      setIsProcessing(true)
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error("يجب تسجيل الدخول")
      }
      
      const result = await payNegativePoints({
        entryId: entryId,
        userId: user.id
      })
      
      if (result.success) {
        toast({
          title: "تم تسديد النقاط السلبية",
          description: result.message,
        })
        
        // Refresh data
        await fetchNegativePoints(user.id)
      } else {
        toast({
          title: "فشل في تسديد النقاط السلبية",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Error paying negative points:", error)
      toast({
        title: "خطأ في النظام",
        description: "حدث خطأ أثناء محاولة تسديد النقاط السلبية",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }
  
  const formatDate = (dateString: string) => {
    if (!dateString) return ""
    try {
      return format(new Date(dateString), "d MMMM yyyy - h:mm a", { locale: ar })
    } catch (e) {
      return dateString
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
  
  const getPaymentTypeBadge = (isOptional: boolean) => {
    if (isOptional) {
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
  
  // Filter negative points based on status
  const filteredNegativePoints = negativePoints.filter(entry => {
    if (filterStatus === "all") return true;
    if (filterStatus === "pending") return entry.status === "pending";
    if (filterStatus === "paid") return entry.status === "paid";
    return true;
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[70vh] flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <span className="text-lg font-medium">جاري تحميل البيانات...</span>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex flex-col space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-primary">النقاط السلبية</h1>
              <p className="text-muted-foreground mt-1">عرض وإدارة النقاط السلبية المسجلة عليك</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-red-50 border-red-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-md font-medium flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
                  النقاط السلبية الإجبارية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{mandatoryPoints}</div>
                <p className="text-sm text-muted-foreground">يجب تسديد هذه النقاط</p>
              </CardContent>
            </Card>
            
            <Card className="bg-blue-50 border-blue-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-md font-medium flex items-center">
                  <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
                  النقاط السلبية الاختيارية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{optionalPoints}</div>
                <p className="text-sm text-muted-foreground">يمكنك اختيار تسديدها</p>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ThumbsDown className="h-5 w-5 text-destructive" />
                سجل النقاط السلبية
              </CardTitle>
              <CardDescription>جميع النقاط السلبية المسجلة عليك</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Tabs value={filterStatus} onValueChange={setFilterStatus}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="all">جميع النقاط</TabsTrigger>
                    <TabsTrigger value="pending">قيد الانتظار</TabsTrigger>
                    <TabsTrigger value="paid">تم التسديد</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              
              {filteredNegativePoints.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                  {filteredNegativePoints.map((entry) => (
                    <AccordionItem key={entry.id} value={entry.id.toString()}>
                      <AccordionTrigger className="hover:bg-muted/20 px-4 rounded-lg transition-colors">
                        <div className="flex flex-1 justify-between items-center gap-4">
                          <div className="flex items-center gap-2">
                            <ThumbsDown className="h-5 w-5 text-destructive" />
                            <span>{entry.reason || "نقاط سلبية"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {getPaymentTypeBadge(entry.is_optional)}
                            {getStatusBadge(entry.status)}
                            <Badge variant="destructive">
                              {entry.points} نقطة
                            </Badge>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="bg-muted/20 p-4 rounded-lg">
                          <div className="flex flex-col gap-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <span className="text-sm font-medium">تاريخ التسجيل:</span>
                                <span className="text-sm mr-2">{formatDate(entry.created_at)}</span>
                              </div>
                              {entry.status === "paid" && entry.paid_at && (
                                <div>
                                  <span className="text-sm font-medium">تاريخ التسديد:</span>
                                  <span className="text-sm mr-2">{formatDate(entry.paid_at)}</span>
                                </div>
                              )}
                            </div>
                            
                            {entry.status === "pending" && (
                              <div className="mt-4">
                                <Button
                                  onClick={() => handlePayNegativePoints(entry.id.toString())}
                                  disabled={isProcessing}
                                >
                                  {isProcessing ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      جاري التسديد...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="h-4 w-4 mr-2" />
                                      تسديد النقاط
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="py-8 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium mb-2">لا توجد نقاط سلبية</h3>
                  <p className="text-muted-foreground">
                    {filterStatus === "all"
                      ? "لا توجد نقاط سلبية مسجلة عليك"
                      : filterStatus === "pending"
                      ? "لا توجد نقاط سلبية قيد الانتظار"
                      : "لا توجد نقاط سلبية تم تسديدها"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
} 