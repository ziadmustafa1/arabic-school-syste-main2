"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, AlertTriangle, Check, AlertCircle, RefreshCw } from "lucide-react"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { TABLES } from "@/lib/constants"
import { fixDeductionCardsSchema } from "./schema/fix-schema"

interface DeductionCard {
  id: number;
  name: string;
  color?: string;
  description?: string | null;
  negative_points_threshold?: number;
  deduction_percentage?: number;
  active_duration_days?: number;
  active_duration_hours?: number;
  is_active?: boolean;
  created_at: string;
  updated_at?: string;
  // Add display properties for UI
  students_assigned?: number;
  [key: string]: any;
}

interface IssuedCard {
  id: number;
  deduction_card_id: number;
  user_id?: string;
  student_id?: string;
  points?: number;
  issue_date?: string;
  expiry_date?: string;
  created_by?: string;
  teacher_id?: string;
  is_used?: boolean;
  used_at?: string;
}

interface Student {
  id: string;
  full_name: string;
  user_code: string;
}

export default function TeacherDeductionCardsPage() {
  // Add initialization ref to prevent multiple loads
  const initialized = useRef(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFixingSchema, setIsFixingSchema] = useState(false)
  const [deductionCards, setDeductionCards] = useState<DeductionCard[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    points: 10,
    description: "",
  })
  const [creatorColumnName, setCreatorColumnName] = useState('created_by')
  const [assigneeColumnName, setAssigneeColumnName] = useState('assigned_to')
  const [schemaError, setSchemaError] = useState<string | null>(null)
  const [tableColumns, setTableColumns] = useState<string[]>([])
  const [isCardTypeView, setIsCardTypeView] = useState(true)
  const [selectedCardType, setSelectedCardType] = useState<DeductionCard | null>(null)
  const supabase = createClient()

  useEffect(() => {
    // Only load data once
    if (initialized.current) return
    initialized.current = true

    async function loadData() {
      try {
        setIsLoading(true)
        setSchemaError(null)

        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          toast({
            title: "خطأ في التحقق",
            description: "يرجى تسجيل الدخول من جديد",
            variant: "destructive",
          })
          return
        }

        // First check the actual table structure
        console.log("Attempting to describe deduction_cards table...");
        
        // Try first with a direct query to get table info
        const { data: tableInfo, error: tableError } = await supabase
          .from('deduction_cards')
          .select('*')
          .limit(1);

        // Log what we found
        if (tableInfo && tableInfo.length > 0) {
          const columns = Object.keys(tableInfo[0]);
          console.log("Found columns in deduction_cards:", columns);
          setTableColumns(columns);
          
          // Map standard column names to what exists in the table
          const creatorOptions = ['created_by', 'creator_id', 'user_id', 'teacher_id', 'issuer_id'];
          const assigneeOptions = ['assigned_to', 'student_id', 'recipient_id', 'user_id'];
          
          // Find creator column - but don't treat it as an error if not found
          // since deduction_cards are templates/types rather than assignments
          const foundCreatorCol = creatorOptions.find(col => columns.includes(col));
          if (foundCreatorCol) {
            setCreatorColumnName(foundCreatorCol);
            console.log(`Using ${foundCreatorCol} as creator column`);
          } else {
            console.log("No creator column found in deduction_cards table. Treating cards as templates.");
            // Don't set schema error, just proceed with templates approach
          }
          
          // Find assignee column - also not critical for template approach
          const foundAssigneeCol = assigneeOptions.find(col => columns.includes(col));
          if (foundAssigneeCol) {
            setAssigneeColumnName(foundAssigneeCol);
            console.log(`Using ${foundAssigneeCol} as assignee column`);
          } else {
            console.log("No assignee column found in deduction_cards table. Treating cards as templates.");
          }
        } else {
          console.error("Could not fetch table structure:", tableError);
          setSchemaError("لا يمكن الوصول إلى هيكل جدول كروت الحسم. تحقق من اتصالك بقاعدة البيانات.");
        }
        
        // Load all data in parallel
        const [cardsResult, studentsResult] = await Promise.all([
          // Load deduction cards
          loadDeductionCards(),
          // Load students
          loadStudents()
        ]);
        
        // Process the results
        if (cardsResult.success && cardsResult.data) {
          setDeductionCards(cardsResult.data);
        }
        
        if (studentsResult.success && studentsResult.data) {
          setStudents(studentsResult.data);
          setFilteredStudents(studentsResult.data);
        }
        
      } catch (error) {
        console.error("Error:", error)
        toast({
          title: "خطأ في تحميل البيانات",
          description: "حدث خطأ أثناء تحميل البيانات",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    // Helper function to load deduction cards
    async function loadDeductionCards(): Promise<{
      success: boolean;
      data?: DeductionCard[];
      error?: any;
    }> {
      try {
        // Load all active deduction card templates/types
        // Note: deduction_cards stores card templates/types, not issued cards
        const { data, error } = await supabase
          .from("deduction_cards")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error loading deduction card types:", error);
          return { success: false, error };
        }

        // Add a visual indicator of how many times each card type has been assigned
        // This is just a placeholder - in a real implementation, we would count actual assignments
        const enhancedData = data?.map(card => ({
          ...card,
          students_assigned: Math.floor(Math.random() * 10) // This is just a placeholder
        }));

        return { success: true, data: enhancedData || [] };
      } catch (error) {
        console.error("Error loading deduction card types:", error);
        return { success: false, error };
      }
    }

    // Helper function to load students
    async function loadStudents(): Promise<{
      success: boolean;
      data?: Student[];
      error?: any;
    }> {
      try {
        const { data: studentsData, error: studentsError } = await supabase
          .from("users")
          .select("id, full_name, user_code")
          .eq("role_id", 1) // Students
          .order("full_name");

        // Only treat as error if studentsError has actual properties
        const hasStudentError = studentsError && Object.keys(studentsError).length > 0;
        if (hasStudentError) {
          console.error("Error loading students:", studentsError);
          toast({
            title: "خطأ في تحميل البيانات",
            description: "حدث خطأ أثناء تحميل قائمة الطلاب",
            variant: "destructive",
          });
          return { success: false, error: studentsError };
        }

        return { success: true, data: studentsData || [] };
      } catch (error) {
        console.error("Error loading students:", error);
        return { success: false, error };
      }
    }

    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // Filter students based on search query
    const filtered = students.filter(
      (student) =>
        student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.user_code.toLowerCase().includes(searchQuery.toLowerCase())
    )
    setFilteredStudents(filtered)
  }, [searchQuery, students])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === "points" ? Number(value) : value,
    }))
  }

  const handleCreateDeductionCard = async () => {
    if (!selectedStudent) {
      toast({
        title: "اختر طالباً",
        description: "يرجى اختيار طالب لإنشاء كرت الحسم",
        variant: "destructive",
      })
      return
    }

    if (!selectedCardType) {
      toast({
        title: "اختر نوع البطاقة",
        description: "يرجى اختيار نوع بطاقة الحسم",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error("يجب تسجيل الدخول")

      // Calculate points based on the deduction card template
      const pointsToDeduct = selectedCardType.negative_points_threshold || formData.points;
      
      // Generate a record code
      const recordCode = `REC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      
      // Create negative record for the student using user_records table
      const { error: recordError } = await supabase
        .from(TABLES.USER_RECORDS)
        .insert({
          record_code: recordCode,
          user_id: selectedStudent,
          title: `كرت حسم: ${selectedCardType.name}`,
          category: "سلوكي",
          description: formData.description || selectedCardType.description || "خصم نقاط سلبية",
          points_value: pointsToDeduct,
          is_positive: false,
          valid_from: new Date().toISOString(),
        })
      
      if (recordError) {
        console.error("Error creating negative record:", recordError)
        throw recordError;
      }

      // Create notification for the student
      await supabase
        .from("notifications")
        .insert({
          user_id: selectedStudent,
          title: "كرت حسم جديد",
          content: `تم إصدار كرت حسم لك من نوع "${selectedCardType.name}" بقيمة ${pointsToDeduct} نقطة. ${formData.description ? `السبب: ${formData.description}` : ''}`,
        })

      toast({
        title: "تم إصدار كرت الحسم بنجاح",
        description: `تم إصدار كرت حسم "${selectedCardType.name}" للطالب بقيمة ${pointsToDeduct} نقطة`,
      })
      
      // Reset form
      setFormData({
        points: 10,
        description: "",
      })
      setSelectedCardType(null)
      setSelectedStudent(null)
    } catch (error) {
      console.error("Error issuing deduction card:", error)
      toast({
        title: "خطأ في إصدار كرت الحسم",
        description: "حدث خطأ أثناء محاولة إصدار كرت الحسم",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle schema fix
  const handleFixSchema = async () => {
    try {
      setIsFixingSchema(true);
      const result = await fixDeductionCardsSchema();
      
      if (result.success) {
        toast({
          title: "تم بنجاح",
          description: "تم إصلاح هيكلية قاعدة البيانات بنجاح. جاري إعادة تحميل الصفحة.",
        });
        
        // Reload the page data after fixing the schema
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast({
          title: "خطأ في إصلاح البيانات",
          description: result.message || "حدث خطأ أثناء إصلاح قاعدة البيانات",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fixing schema:", error);
      toast({
        title: "خطأ غير متوقع",
        description: "حدث خطأ غير متوقع أثناء محاولة إصلاح قاعدة البيانات",
        variant: "destructive",
      });
    } finally {
      setIsFixingSchema(false);
    }
  };

  // Display error screen if there's a schema issue
  if (schemaError) {
    return (
      <div className="container mx-auto p-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="mr-2 h-5 w-5 text-destructive" />
              خطأ في هيكلية قاعدة البيانات
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center p-6 text-center">
            <AlertTriangle className="h-16 w-16 text-amber-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">هناك مشكلة في قاعدة البيانات</h3>
            <p className="text-muted-foreground mb-4">{schemaError}</p>
            <Button 
              onClick={handleFixSchema} 
              disabled={isFixingSchema}
              className="gap-2"
            >
              {isFixingSchema ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري الإصلاح...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  إصلاح المشكلة
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="mr-2">جاري تحميل البيانات...</span>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">كروت الحسم</h1>

      <Tabs defaultValue="cards" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="cards">كروت الحسم</TabsTrigger>
          <TabsTrigger value="create">إنشاء كرت جديد</TabsTrigger>
        </TabsList>

        <TabsContent value="cards">
          <Card>
            <CardHeader>
              <CardTitle>كروت الحسم المُصدرة</CardTitle>
            </CardHeader>
            <CardContent>
              {deductionCards.length > 0 ? (
                <div className="space-y-4">
                  {deductionCards.map((card) => (
                    <Card key={card.id} className="p-4">
                      <div className="flex flex-col md:flex-row justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <div 
                              className="h-4 w-4 rounded-full" 
                              style={{ backgroundColor: card.color || '#ef4444' }}
                            />
                            <span className="font-bold">{card.name}</span>
                            {card.is_active ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                فعال
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
                                غير فعال
                              </Badge>
                            )}
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">عقوبة النقاط: </span>
                            <span className="font-medium">{card.negative_points_threshold || 0} نقطة</span>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">نسبة الخصم: </span>
                            <span className="font-medium">{card.deduction_percentage || 0}%</span>
                          </div>
                          {card.description && (
                            <div>
                              <span className="text-sm text-muted-foreground">الوصف: </span>
                              <span>{card.description}</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-4 md:mt-0 text-sm text-right">
                          <div>تاريخ الإنشاء: {new Date(card.created_at).toLocaleDateString('ar-SA')}</div>
                          <div>مدة الفعالية: {card.active_duration_days || 0} يوم و {card.active_duration_hours || 0} ساعة</div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد أنواع بطاقات حسم متاحة
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>إصدار كرت حسم جديد</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Card Type Selection */}
                  <div className="space-y-2">
                    <Label>اختر نوع كرت الحسم</Label>
                    <div className="grid grid-cols-1 gap-3">
                      {deductionCards
                        .filter(card => card.is_active)
                        .map(card => (
                          <div
                            key={card.id}
                            className={`border rounded-md p-3 cursor-pointer transition-colors ${
                              selectedCardType?.id === card.id 
                                ? 'bg-primary/10 border-primary' 
                                : 'hover:bg-muted'
                            }`}
                            onClick={() => setSelectedCardType(card)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="h-3 w-3 rounded-full" 
                                  style={{ backgroundColor: card.color || '#ef4444' }}
                                />
                                <span className="font-medium">{card.name}</span>
                              </div>
                              <Badge variant="outline">
                                {card.negative_points_threshold} نقطة
                              </Badge>
                            </div>
                            {card.description && (
                              <p className="text-sm text-muted-foreground">{card.description}</p>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">سبب إصدار كرت الحسم (اختياري)</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="أدخل سبب إصدار كرت الحسم"
                      value={formData.description}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="pt-4">
                    <Button
                      onClick={handleCreateDeductionCard}
                      disabled={isSubmitting || !selectedStudent || !selectedCardType}
                      className="w-full"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                          جاري الإصدار...
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="ml-2 h-4 w-4" />
                          إصدار كرت حسم
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>اختيار الطالب</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="البحث عن طالب..."
                      className="pr-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-md p-2">
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map((student) => (
                        <div
                          key={student.id}
                          className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-muted transition-colors ${
                            selectedStudent === student.id ? "bg-primary/10" : ""
                          }`}
                          onClick={() => setSelectedStudent(student.id)}
                        >
                          <div className="flex items-center">
                            <div
                              className={`h-5 w-5 border rounded-md mr-2 flex items-center justify-center ${
                                selectedStudent === student.id
                                  ? "bg-primary border-primary"
                                  : "border-input"
                              }`}
                            >
                              {selectedStudent === student.id && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <span className="font-medium">{student.full_name}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">{student.user_code}</span>
                        </div>
                      ))
                    ) : (
                      <div className="py-4 text-center text-muted-foreground">لا توجد نتائج مطابقة للبحث</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 