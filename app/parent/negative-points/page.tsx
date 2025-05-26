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
  Users,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Upload,
  ThumbsDown,
  FileText
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

interface ChildInfo {
  id: string
  full_name: string
  user_code?: string
  avatar_url?: string
}

export default function ParentNegativePointsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [children, setChildren] = useState<ChildInfo[]>([])
  const [selectedChild, setSelectedChild] = useState<ChildInfo | null>(null)
  const [negativePoints, setNegativePoints] = useState<NegativePointsEntry[]>([])
  const [mandatoryPoints, setMandatoryPoints] = useState(0)
  const [optionalPoints, setOptionalPoints] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        setIsLoading(true)
        
        // Get parent user ID
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/login')
          return
        }
        
        // Get children
        const { data: parentChildrenData, error: parentChildrenError } = await supabase
          .from('parent_children')
          .select('child_id')
          .eq('parent_id', user.id)
        
        if (parentChildrenError) {
          throw parentChildrenError
        }
        
        if (!parentChildrenData || parentChildrenData.length === 0) {
          setIsLoading(false)
          return
        }
        
        const childIds = parentChildrenData.map(row => row.child_id)
        
        // Fetch children details
        const { data: childrenData, error: childrenError } = await supabase
          .from('users')
          .select('id, full_name, user_code, avatar_url')
          .in('id', childIds)
          .order('full_name')
        
        if (childrenError) {
          throw childrenError
        }
        
        setChildren(childrenData || [])
        
        // Select first child by default
        if (childrenData && childrenData.length > 0) {
          setSelectedChild(childrenData[0])
          await fetchNegativePoints(childrenData[0].id)
        }
      } catch (error: any) {
        console.error("Error loading children:", error)
        toast({
          title: "خطأ في تحميل البيانات",
          description: error.message || "فشل في تحميل بيانات الأبناء",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchChildren()
  }, [router, supabase])
  
  const fetchNegativePoints = async (childId: string) => {
    try {
      setIsLoading(true)
      const result = await getNegativePoints(childId)
      
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
  
  const handleSelectChild = async (child: ChildInfo) => {
    setSelectedChild(child)
    await fetchNegativePoints(child.id)
  }
  
  const handlePayNegativePoints = async (entryId: string) => {
    if (!selectedChild) return
    
    try {
      setIsProcessing(true)
      
      const result = await payNegativePoints({
        entryId: entryId,
        userId: selectedChild.id
      })
      
      if (result.success) {
        toast({
          title: "تم تسديد النقاط السلبية",
          description: result.message,
        })
        
        // Refresh data
        await fetchNegativePoints(selectedChild.id)
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
              <p className="text-muted-foreground mt-1">عرض وإدارة النقاط السلبية المسجلة على أبنائك</p>
            </div>
          </div>
          
          {children.length === 0 ? (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertTriangle className="h-4 w-4 text-yellow-800" />
              <AlertTitle>لا يوجد أبناء مسجلين</AlertTitle>
              <AlertDescription>
                لم يتم العثور على أي أبناء مسجلين في النظام. يرجى التواصل مع إدارة المدرسة لإضافة أبنائك.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Sidebar with children list */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    الأبناء
                  </CardTitle>
                  <CardDescription>اختر ابن لعرض النقاط السلبية</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {children.map((child) => (
                      <button
                        key={child.id}
                        className={`w-full flex items-center p-4 hover:bg-muted/50 transition-colors ${
                          selectedChild?.id === child.id ? "bg-primary/10 font-medium" : ""
                        }`}
                        onClick={() => handleSelectChild(child)}
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/10 mr-3 flex items-center justify-center">
                          {child.avatar_url ? (
                            <img 
                              src={child.avatar_url} 
                              alt={child.full_name} 
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <Users className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div className="text-right flex-1">
                          <div className="font-medium">{child.full_name}</div>
                          {child.user_code && (
                            <div className="text-xs text-muted-foreground">{child.user_code}</div>
                          )}
                        </div>
                        {selectedChild?.id === child.id && (
                          <ChevronLeft className="h-5 w-5 text-primary ml-1" />
                        )}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {/* Main content area */}
              <div className="lg:col-span-3 space-y-6">
                {selectedChild ? (
                  <>
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
                    
                    {negativePoints.length > 0 ? (
                      <Accordion type="single" collapsible className="w-full">
                        {negativePoints.map((entry) => (
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
                      <Card>
                        <CardContent className="p-8 text-center">
                          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <h3 className="text-xl font-medium mb-2">لا توجد نقاط سلبية</h3>
                          <p className="text-muted-foreground">لا توجد نقاط سلبية مسجلة على هذا الطالب حالياً</p>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <ChevronRight className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-xl font-medium mb-2">اختر ابن من القائمة</h3>
                      <p className="text-muted-foreground">يرجى اختيار أحد الأبناء من القائمة لعرض النقاط السلبية</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
} 