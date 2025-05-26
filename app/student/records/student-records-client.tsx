"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Loader2, Trophy, CalendarIcon, Search, AlertCircle, ThumbsDown, TrendingUp, TrendingDown } from "lucide-react"
import { format, parseISO } from "date-fns"
import { ar } from "date-fns/locale"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { TABLES, POINT_TYPES } from "@/lib/constants"
import { toast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Record = {
  id: number
  record_code: string
  user_id: string
  title: string
  category: string
  description: string | null
  points_value: number
  valid_from: string
  valid_until: string | null
  created_at: string
  is_positive?: boolean
}

interface StudentRecordsClientProps {
  userId: string
  initialRecords?: Record[]
}

export function StudentRecordsClient({ userId, initialRecords = [] }: StudentRecordsClientProps) {
  const [records, setRecords] = useState<Record[]>(initialRecords)
  const [loading, setLoading] = useState(initialRecords.length === 0)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [pointsBalance, setPointsBalance] = useState({
    positivePoints: 0,
    negativePoints: 0,
    totalBalance: 0
  })
  const supabase = createClient()

  // Function to fetch records
  const fetchRecords = async () => {
    if (!userId) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from(TABLES.USER_RECORDS)
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
      
      if (error) throw error
      
      // Now fetch the user's points from student_points table
      const { data: studentPoints, error: pointsError } = await supabase
        .from("student_points")
        .select("points")
        .eq("student_id", userId)
        .single()
      
      if (pointsError && pointsError.code !== 'PGRST116') {
        console.error("Error fetching student points:", pointsError)
        
        // Fallback to RPC method if student_points lookup fails
        try {
          const { data: rpcPoints, error: rpcError } = await supabase
            .rpc("get_user_points_balance", { user_id_param: userId })
            
          if (!rpcError && rpcPoints !== null) {
            setPointsBalance({
              positivePoints: 0,  // We don't have the breakdown with this method
              negativePoints: 0,  // We don't have the breakdown with this method
              totalBalance: rpcPoints || 0
            })
          }
        } catch (rpcFallbackError) {
          console.error("Error in RPC fallback for points:", rpcFallbackError)
        }
      }
      
      setRecords(data || [])
      
      if (studentPoints) {
        // Get positive and negative points from transactions for the breakdown
        const { data: transactions, error: txError } = await supabase
          .from(TABLES.POINTS_TRANSACTIONS)
          .select("points, is_positive")
          .eq("user_id", userId)
        
        let positive = 0;
        let negative = 0;
        
        if (!txError && transactions && transactions.length > 0) {
          for (const tx of transactions) {
            if (tx.is_positive) {
              positive += tx.points;
            } else {
              negative += tx.points;
            }
          }
        }
        
        setPointsBalance({
          positivePoints: positive,
          negativePoints: negative,
          totalBalance: studentPoints.points || 0
        })
      }
    } catch (error: any) {
      console.error("Error fetching student records:", error)
      toast({
        title: "خطأ في تحميل البيانات",
        description: "حدث خطأ أثناء جلب سجلات الإنجازات",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    if (initialRecords.length > 0) {
      setRecords(initialRecords)
    } else {
      fetchRecords()
    }
    
    // Setup refresh on window focus
    window.addEventListener("focus", fetchRecords)
    return () => {
      window.removeEventListener("focus", fetchRecords)
    }
  }, [userId, initialRecords])

  // Filter records based on search term and active tab
  const filteredRecords = records.filter(record => {
    const matchesSearch = 
      record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.record_code.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter based on active tab
    if (activeTab === "positive") {
      return matchesSearch && (record.is_positive !== false);
    } else if (activeTab === "negative") {
      return matchesSearch && record.is_positive === false;
    }
    
    return matchesSearch;
  });
  
  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "غير محدد"
    
    try {
      const date = parseISO(dateString)
      return format(date, "d MMMM yyyy", { locale: ar })
    } catch (error) {
      console.error("Error formatting date:", error)
      return dateString
    }
  }
  
  // Check if record is active
  const isRecordActive = (record: Record) => {
    const now = new Date()
    const validFrom = parseISO(record.valid_from)
    const validUntil = record.valid_until ? parseISO(record.valid_until) : null
    
    if (now < validFrom) {
      return false
    }
    
    if (validUntil && now > validUntil) {
      return false
    }
    
    return true
  }
  
  // Get badge color based on category
  const getCategoryColor = (category: string) => {
    const categoryLower = category.toLowerCase();
    
    if (categoryLower.includes("قراءة") || categoryLower.includes("reading")) {
      return "bg-blue-100 text-blue-800 hover:bg-blue-200";
    } else if (categoryLower.includes("كتابة") || categoryLower.includes("writing")) {
      return "bg-green-100 text-green-800 hover:bg-green-200";
    } else if (categoryLower.includes("املاء") || categoryLower.includes("spelling")) {
      return "bg-purple-100 text-purple-800 hover:bg-purple-200";
    } else if (categoryLower.includes("سلوك") || categoryLower.includes("behavior")) {
      return "bg-orange-100 text-orange-800 hover:bg-orange-200";
    } else if (categoryLower.includes("حضور") || categoryLower.includes("attendance")) {
      return "bg-teal-100 text-teal-800 hover:bg-teal-200";
    } else {
      return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  }

  return (
    <div className="space-y-6">
      {/* Points Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="h-4 w-4 ml-2 text-green-500" /> 
              النقاط الإيجابية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{pointsBalance.positivePoints}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <TrendingDown className="h-4 w-4 ml-2 text-red-500" /> 
              النقاط السلبية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{pointsBalance.negativePoints}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">الرصيد الإجمالي</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${pointsBalance.totalBalance >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {pointsBalance.totalBalance}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and filters */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="البحث في السجلات..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {/* Tabs and records list */}
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="all">جميع السجلات</TabsTrigger>
          <TabsTrigger value="positive">السجلات الإيجابية</TabsTrigger>
          <TabsTrigger value="negative">السجلات السلبية</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-0">
          {renderRecordsList(filteredRecords)}
        </TabsContent>
        
        <TabsContent value="positive" className="mt-0">
          {renderRecordsList(filteredRecords)}
        </TabsContent>
        
        <TabsContent value="negative" className="mt-0">
          {renderRecordsList(filteredRecords)}
        </TabsContent>
      </Tabs>
    </div>
  )
  
  function renderRecordsList(recordsList: Record[]) {
    if (loading) {
      return (
        <Card>
          <CardContent className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      )
    }
    
    if (recordsList.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-2" />
            <h3 className="text-lg font-medium">لا توجد سجلات</h3>
            <p className="text-sm text-muted-foreground">
              لم يتم العثور على أي سجلات تطابق المعايير المحددة
            </p>
          </CardContent>
        </Card>
      )
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recordsList.map((record) => {
          const isPositive = record.is_positive !== false;
          
          return (
            <Card 
              key={record.id} 
              className={`${isRecordActive(record) ? "" : "opacity-70"} ${isPositive ? "" : "border-destructive border-2"}`}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center">
                      {isPositive ? 
                        <Trophy className="h-4 w-4 ml-2 text-yellow-500" /> : 
                        <ThumbsDown className="h-4 w-4 ml-2 text-destructive" />
                      }
                      {record.title}
                    </CardTitle>
                    <CardDescription>{record.record_code}</CardDescription>
                  </div>
                  <Badge className={getCategoryColor(record.category)}>
                    {record.category}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  {record.description || "لا يوجد وصف"}
                </p>
                <div className="mt-4 flex items-center text-sm text-muted-foreground">
                  <CalendarIcon className="mr-1 h-3 w-3" />
                  <span className="ml-2">من: {formatDate(record.valid_from)}</span>
                  {record.valid_until && (
                    <span className="mr-2">إلى: {formatDate(record.valid_until)}</span>
                  )}
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <Badge 
                  variant={isPositive ? "default" : "destructive"}
                  className="px-3 py-1 text-sm"
                >
                  {isPositive ? "+" : "-"}{record.points_value} نقطة
                </Badge>
              </CardFooter>
            </Card>
          )
        })}
      </div>
    )
  }
} 