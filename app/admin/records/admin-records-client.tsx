"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { usePathname } from "next/navigation"
import { format, parseISO } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { TABLES } from "@/lib/constants"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  Filter, 
  Trophy, 
  Edit, 
  Trash, 
  Eye,
  AlertCircle,
  Loader2,
  ThumbsDown,
  TrendingUp,
  TrendingDown
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type User = {
  id: string
  full_name: string
}

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
  created_by: string | null
  is_positive?: boolean
  user?: User
}

interface AdminRecordsClientProps {
  adminId: string
  initialRecords?: Record[]
}

export function AdminRecordsClient({ adminId, initialRecords = [] }: AdminRecordsClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [records, setRecords] = useState<Record[]>(initialRecords)
  const [loading, setLoading] = useState(initialRecords.length === 0)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [pointsStats, setPointsStats] = useState({
    positiveTotal: 0,
    negativeTotal: 0, 
    userCount: 0
  })
  
  // Function to fetch records
  const fetchRecords = async () => {
    setLoading(true);
    try {
      console.log("Fetching records from API...");
      
      // Always use the API endpoint to bypass RLS completely
      const response = await fetch('/api/admin/records/list', {
        method: 'GET',
      });
      
      console.log("API response status:", response.status);
      
      if (!response.ok) {
        throw new Error(`Error fetching records: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Records from API:", data);
      
      if (data.data && Array.isArray(data.data)) {
        setRecords(data.data);
        
        // Calculate stats
        const positivePoints = data.data
          .filter((record: Record) => record.is_positive !== false)
          .reduce((sum: number, record: Record) => sum + record.points_value, 0);
          
        const negativePoints = data.data
          .filter((record: Record) => record.is_positive === false)
          .reduce((sum: number, record: Record) => sum + record.points_value, 0);
          
        // Count unique users
        const uniqueUsers = new Set(data.data.map((record: Record) => record.user_id));
        
        setPointsStats({
          positiveTotal: positivePoints,
          negativeTotal: negativePoints,
          userCount: uniqueUsers.size
        });
      } else {
        console.error("Invalid data format returned from API", data);
        setRecords([]);
      }
    } catch (error) {
      console.error("Error fetching records:", error);
      toast.error("حدث خطأ أثناء جلب السجلات");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Initial load and refetch on focus
  useEffect(() => {
    console.log("Initial records:", initialRecords);
    
    // Debug call to verify records exist
    const checkDebugRecords = async () => {
      try {
        const response = await fetch('/api/debug/records');
        const data = await response.json();
        console.log("DEBUG API RESPONSE:", data);
      } catch (error) {
        console.error("Debug API error:", error);
      }
    };
    
    // Check debug first to see if any records exist
    checkDebugRecords();
    
    if (initialRecords.length > 0) {
      console.log("Using initial records from server-side props");
      setRecords(initialRecords);
      
      // Calculate stats for initial records
      const positivePoints = initialRecords
        .filter((record: Record) => record.is_positive !== false)
        .reduce((sum: number, record: Record) => sum + record.points_value, 0);
        
      const negativePoints = initialRecords
        .filter((record: Record) => record.is_positive === false)
        .reduce((sum: number, record: Record) => sum + record.points_value, 0);
        
      // Count unique users
      const uniqueUsers = new Set(initialRecords.map((record: Record) => record.user_id));
      
      setPointsStats({
        positiveTotal: positivePoints,
        negativeTotal: negativePoints,
        userCount: uniqueUsers.size
      });
      
      setLoading(false);
    } else {
      console.log("No initial records, fetching from client");
      fetchRecords();
    }
    
    // Add event listener for when the page is focused again
    window.addEventListener('focus', fetchRecords);
    
    // Cleanup
    return () => {
      window.removeEventListener('focus', fetchRecords);
    }
  }, [pathname, initialRecords]);
  
  // Filter records by search term and tab
  const filteredRecords = records.filter(record => {
    const matchesSearch = 
      record.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.record_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter based on active tab
    if (activeTab === "positive") {
      return matchesSearch && record.is_positive !== false;
    } else if (activeTab === "negative") {
      return matchesSearch && record.is_positive === false;
    }
    
    return matchesSearch;
  });
  
  // Delete record
  const handleDeleteRecord = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا السجل؟")) {
      return
    }
    
    try {
      // Delete using the API endpoint
      const response = await fetch(`/api/admin/records?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete record')
      }
      
      // Remove from local state
      setRecords(records.filter(record => record.id !== id))
      toast.success("تم حذف السجل بنجاح")
      
      // Fetch records again to ensure consistency
      setTimeout(() => {
        fetchRecords();
      }, 500);
    } catch (error) {
      console.error("Error deleting record:", error)
      toast.error("حدث خطأ أثناء حذف السجل")
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
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card>
          <div className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">إجمالي النقاط الإيجابية</h3>
                <p className="text-3xl font-bold mt-2 text-green-600">
                  {pointsStats.positiveTotal}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">إجمالي النقاط السلبية</h3>
                <p className="text-3xl font-bold mt-2 text-red-600">
                  {pointsStats.negativeTotal}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">المستخدمين النشطين</h3>
                <p className="text-3xl font-bold mt-2">
                  {pointsStats.userCount}
                </p>
              </div>
              <Eye className="h-8 w-8 text-blue-500" />
            </div>
          </div>
        </Card>
      </div>
      
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="البحث في السجلات..."
              className="w-full sm:w-[300px] pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => toast.info("سيتم تنفيذ التصفية قريبًا")}
            >
              <Filter className="h-4 w-4 ml-2" />
              تصفية
            </Button>
            
            <Button 
              variant="default" 
              size="sm"
              onClick={() => router.push("/admin/records/new")}
            >
              <Trophy className="h-4 w-4 ml-2" />
              إنشاء سجل جديد
            </Button>
          </div>
        </div>
      </Card>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="all">جميع السجلات</TabsTrigger>
          <TabsTrigger value="positive">السجلات الإيجابية</TabsTrigger>
          <TabsTrigger value="negative">السجلات السلبية</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-0">
          {renderRecordsTable(filteredRecords)}
        </TabsContent>
        
        <TabsContent value="positive" className="mt-0">
          {renderRecordsTable(filteredRecords)}
        </TabsContent>
        
        <TabsContent value="negative" className="mt-0">
          {renderRecordsTable(filteredRecords)}
        </TabsContent>
      </Tabs>
    </div>
  )
  
  function renderRecordsTable(recordsList: Record[]) {
    if (loading) {
      return (
        <Card>
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </Card>
      );
    }
    
    if (recordsList.length === 0) {
      return (
        <Card>
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-2" />
            <h3 className="text-lg font-medium">لا توجد سجلات</h3>
            <p className="text-sm text-muted-foreground">
              لم يتم العثور على أي سجلات تطابق المعايير المحددة
            </p>
          </div>
        </Card>
      );
    }
    
    return (
      <Card>
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم السجل</TableHead>
                <TableHead>العنوان</TableHead>
                <TableHead>المستخدم</TableHead>
                <TableHead>النقاط</TableHead>
                <TableHead>الفئة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>تاريخ الإنشاء</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recordsList.map((record) => {
                const isPositive = record.is_positive !== false;
                
                return (
                  <TableRow key={record.id}>
                    <TableCell>
                      <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
                        {record.record_code}
                      </code>
                    </TableCell>
                    <TableCell className="flex items-center">
                      {isPositive ? 
                        <Trophy className="h-4 w-4 ml-2 text-yellow-500" /> : 
                        <ThumbsDown className="h-4 w-4 ml-2 text-destructive" />
                      }
                      {record.title}
                    </TableCell>
                    <TableCell>{record.user?.full_name || 'غير معروف'}</TableCell>
                    <TableCell className={isPositive ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                      {isPositive ? "+" : "-"}{record.points_value}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {record.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={isRecordActive(record) ? "default" : "secondary"}>
                        {isRecordActive(record) ? "ساري" : "منتهي"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(parseISO(record.created_at), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">فتح القائمة</span>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                              <circle cx="12" cy="12" r="1" />
                              <circle cx="12" cy="5" r="1" />
                              <circle cx="12" cy="19" r="1" />
                            </svg>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => router.push(`/admin/records/${record.id}`)}>
                            <Eye className="ml-2 h-4 w-4" />
                            عرض التفاصيل
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/admin/records/${record.id}/edit`)}>
                            <Edit className="ml-2 h-4 w-4" />
                            تعديل السجل
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDeleteRecord(record.id)} className="text-destructive focus:text-destructive">
                            <Trash className="ml-2 h-4 w-4" />
                            حذف السجل
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    );
  }
} 