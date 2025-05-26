"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { createClient } from "@/lib/supabase/client"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertCircle, Trash2, Pencil, PlusCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Loading } from "@/components/ui/loading"
import { toast } from "sonner"

// Define the form schema for creating/editing a deduction card
const formSchema = z.object({
  name: z.string().min(2, "يجب أن يحتوي الاسم على حرفين على الأقل"),
  color: z.string().min(3, "يرجى اختيار لون للكرت"),
  description: z.string().min(10, "وصف الكرت يجب أن يكون 10 أحرف على الأقل"),
  negative_points_threshold: z.coerce
    .number()
    .min(1, "يجب أن يكون الحد الأدنى للنقاط السلبية 1 على الأقل"),
  deduction_percentage: z.coerce
    .number()
    .min(1, "يجب أن تكون نسبة الحسم 1% على الأقل")
    .max(100, "لا يمكن أن تتجاوز نسبة الحسم 100%"),
  active_duration_days: z.coerce
    .number()
    .min(0, "يجب أن تكون مدة النشاط 0 أو أكثر"),
  active_duration_hours: z.coerce
    .number()
    .min(0, "يجب أن تكون ساعات النشاط 0 أو أكثر")
    .max(23, "يجب أن تكون ساعات النشاط أقل من 24"),
  is_active: z.boolean().default(true),
})

type DeductionCard = z.infer<typeof formSchema> & { id: string }

export default function DeductionCardsManagement() {
  const [cards, setCards] = useState<DeductionCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<DeductionCard | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [cardToDelete, setCardToDelete] = useState<string | null>(null)
  const [isInitializingSchema, setIsInitializingSchema] = useState(false)
  const [schemaError, setSchemaError] = useState<string | null>(null)

  const supabase = createClient()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      color: "",
      description: "",
      negative_points_threshold: 5,
      deduction_percentage: 5,
      active_duration_days: 3,
      active_duration_hours: 0,
      is_active: true,
    },
  })

  useEffect(() => {
    fetchCards()
  }, [])

  const fetchCards = async () => {
    try {
      setIsLoading(true)
      setSchemaError(null)
      
      // Try to query the deduction_cards table
      const { data, error } = await supabase
        .from("deduction_cards")
        .select("*")
        .order("negative_points_threshold", { ascending: true })

      if (error) {
        try {
          console.error("Full error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
        } catch (logError) {
          console.error("Error logging failed", logError);
        }
        
        // Check if error is related to table not existing
        if (error.code === "42P01" || 
            (typeof error.message === 'string' && (error.message.includes("relation") || error.message.includes("does not exist")))) {
          setSchemaError("جدول كروت الحسم غير موجود. يرجى تهيئة قاعدة البيانات أولاً.")
        } else {
          const errorMessage = typeof error.message === 'string' ? error.message : 
                             (error.code ? String(error.code) : "unknown");
          throw new Error(`Database error: ${errorMessage}`);
        }
      }
      setCards(data || [])
    } catch (error) {
      try {
        console.error("Error fetching deduction cards:", error instanceof Error 
          ? error.message 
          : JSON.stringify(error, Object.getOwnPropertyNames(error)));
      } catch (logError) {
        console.error("Failed to log error details");
      }
      
      const errorMessage = error instanceof Error ? error.message : "خطأ غير معروف";
      toast.error(`حدث خطأ أثناء استرداد بيانات كروت الحسم: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const { name, color, description, negative_points_threshold, deduction_percentage, active_duration_days, active_duration_hours, is_active } = values
      
      if (editingCard) {
        // Update existing card
        const { error } = await supabase
          .from("deduction_cards")
          .update({
            name,
            color,
            description,
            negative_points_threshold,
            deduction_percentage,
            active_duration_days,
            active_duration_hours,
            is_active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingCard.id)

        if (error) {
          try {
            console.error("Full update error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
          } catch (logError) {
            console.error("Error logging failed", logError);
          }
          
          const errorMessage = typeof error.message === 'string' ? error.message : 
                             (error.code ? String(error.code) : "unknown");
          throw new Error(`Database update error: ${errorMessage}`)
        }
        toast.success("تم تحديث كرت الحسم بنجاح")
      } else {
        // Create new card
        const { error } = await supabase.from("deduction_cards").insert({
          name,
          color,
          description,
          negative_points_threshold,
          deduction_percentage,
          active_duration_days,
          active_duration_hours,
          is_active,
        })

        if (error) {
          try {
            console.error("Full insert error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
          } catch (logError) {
            console.error("Error logging failed", logError);
          }
          
          const errorMessage = typeof error.message === 'string' ? error.message : 
                             (error.code ? String(error.code) : "unknown");
          throw new Error(`Database insert error: ${errorMessage}`)
        }
        toast.success("تم إنشاء كرت الحسم بنجاح")
      }

      // Reset form and refresh cards
      handleDialogClose()
      fetchCards()
    } catch (error) {
      try {
        console.error("Error saving deduction card:", error instanceof Error 
          ? error.message 
          : JSON.stringify(error, Object.getOwnPropertyNames(error)));
      } catch (logError) {
        console.error("Failed to log error details");
      }
      
      const errorMessage = error instanceof Error ? error.message : "خطأ غير معروف";
      toast.error(`حدث خطأ أثناء حفظ كرت الحسم: ${errorMessage}`)
    }
  }

  const handleEdit = (card: DeductionCard) => {
    setEditingCard(card)
    form.reset({
      name: card.name,
      color: card.color,
      description: card.description,
      negative_points_threshold: card.negative_points_threshold,
      deduction_percentage: card.deduction_percentage,
      active_duration_days: card.active_duration_days,
      active_duration_hours: card.active_duration_hours,
      is_active: card.is_active,
    })
    setIsOpen(true)
  }

  const handleDelete = async () => {
    if (!cardToDelete) return

    try {
      const { error } = await supabase.from("deduction_cards").delete().eq("id", cardToDelete)

      if (error) {
        try {
          console.error("Full delete error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
        } catch (logError) {
          console.error("Error logging failed", logError);
        }
        
        const errorMessage = typeof error.message === 'string' ? error.message : 
                           (error.code ? String(error.code) : "unknown");
        throw new Error(`Database delete error: ${errorMessage}`)
      }

      toast.success("تم حذف كرت الحسم بنجاح")
      setDeleteConfirmOpen(false)
      setCardToDelete(null)
      fetchCards()
    } catch (error) {
      try {
        console.error("Error deleting deduction card:", error instanceof Error 
          ? error.message 
          : JSON.stringify(error, Object.getOwnPropertyNames(error)));
      } catch (logError) {
        console.error("Failed to log error details");
      }
      
      const errorMessage = error instanceof Error ? error.message : "خطأ غير معروف";
      toast.error(`حدث خطأ أثناء حذف كرت الحسم: ${errorMessage}`)
    }
  }

  const handleDialogClose = () => {
    form.reset({
      name: "",
      color: "",
      description: "",
      negative_points_threshold: 5,
      deduction_percentage: 5,
      active_duration_days: 3,
      active_duration_hours: 0,
      is_active: true,
    })
    setEditingCard(null)
    setIsOpen(false)
  }

  const initializeSchema = async () => {
    try {
      setIsInitializingSchema(true)
      
      const response = await fetch('/api/schema/deduction-cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'فشل في تهيئة قاعدة البيانات');
      }
      
      toast.success('تم تهيئة قاعدة البيانات بنجاح');
      setSchemaError(null);
      fetchCards();
    } catch (error) {
      console.error('Error initializing schema:', error);
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
      toast.error(`حدث خطأ أثناء تهيئة قاعدة البيانات: ${errorMessage}`);
    } finally {
      setIsInitializingSchema(false);
    }
  };

  if (isLoading) {
    return <Loading text="جاري تحميل كروت الحسم..." />
  }

  if (schemaError) {
    return (
      <div className="container max-w-6xl py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">إدارة كروت الحسم والاستبعاد</h1>
          <p className="text-muted-foreground">إنشاء وتعديل كروت الحسم للطلاب</p>
        </div>
        
        <Card className="mb-8">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
            <p className="mb-2 text-xl font-medium text-center">خطأ في قاعدة البيانات</p>
            <p className="mb-4 text-center text-muted-foreground">
              {schemaError}
            </p>
            <Button 
              onClick={initializeSchema} 
              disabled={isInitializingSchema}
              className="gap-2"
            >
              {isInitializingSchema && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
              )}
              تهيئة قاعدة البيانات
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-6">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">إدارة كروت الحسم والاستبعاد</h1>
          <p className="text-muted-foreground mt-2">إنشاء وتعديل كروت الحسم للطلاب</p>
        </div>
        <Button 
          onClick={() => setIsOpen(true)} 
          className="bg-primary hover:bg-primary/90 text-white rounded-md px-4 py-2 transition-all shadow-md hover:shadow-lg"
        >
          <PlusCircle className="mr-2 h-5 w-5" />
          إضافة كرت جديد
        </Button>
      </div>

      {cards.length === 0 ? (
        <Card className="shadow-md border-muted/20">
          <CardContent className="flex flex-col items-center justify-center p-10">
            <AlertCircle className="mb-6 h-12 w-12 text-muted-foreground" />
            <p className="mb-3 text-xl font-medium">لا توجد كروت حسم</p>
            <p className="mb-6 text-center text-muted-foreground max-w-md">
              لم يتم إنشاء أي كروت حسم بعد. يمكنك إضافة كرت جديد لتحديد قواعد الحسم في النظام.
            </p>
            <Button 
              onClick={() => setIsOpen(true)} 
              className="px-6 py-2 rounded-md transition-all shadow hover:shadow-md"
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              إضافة كرت حسم جديد
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          <Card className="shadow-md overflow-hidden border-muted/20">
            <CardContent className="p-0">
              <Table>
                <TableCaption className="mt-4 mb-2">قائمة كروت الحسم والاستبعاد المتاحة في النظام</TableCaption>
                <TableHeader>
                  <TableRow className="bg-muted/10 hover:bg-muted/10">
                    <TableHead className="text-right font-bold">الاسم</TableHead>
                    <TableHead className="text-right font-bold">اللون</TableHead>
                    <TableHead className="text-right font-bold">الحد الأدنى للنقاط السلبية</TableHead>
                    <TableHead className="text-right font-bold">نسبة الحسم</TableHead>
                    <TableHead className="text-right font-bold">مدة النشاط</TableHead>
                    <TableHead className="text-right font-bold">الحالة</TableHead>
                    <TableHead className="text-right font-bold">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cards.map((card) => (
                    <TableRow key={card.id} className="hover:bg-muted/5">
                      <TableCell>
                        <div className="font-medium">{card.name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div 
                            className="h-5 w-5 rounded-full border shadow-sm" 
                            style={{ backgroundColor: card.color || '#000000' }}
                          />
                          <span className="text-sm">{card.color || 'غير محدد'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{card.negative_points_threshold}</TableCell>
                      <TableCell><span className="font-medium">{card.deduction_percentage}%</span></TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {card.active_duration_days} يوم 
                          {card.active_duration_hours > 0 ? ` و ${card.active_duration_hours} ساعة` : ''}
                        </span>
                      </TableCell>
                      <TableCell>
                        {card.is_active ? (
                          <Badge variant="success" className="px-3 py-1 rounded-full bg-green-100 text-green-800 border-green-200">نشط</Badge>
                        ) : (
                          <Badge variant="secondary" className="px-3 py-1 rounded-full bg-gray-100 text-gray-800 border-gray-200">غير نشط</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(card)}
                            className="border h-9 px-3 py-2 rounded-md hover:bg-muted/10 hover:text-blue-600 transition-colors"
                          >
                            <Pencil className="h-4 w-4 mr-1 text-blue-500" />
                            <span>تعديل</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCardToDelete(card.id)
                              setDeleteConfirmOpen(true)
                            }}
                            className="border h-9 px-3 py-2 rounded-md hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                          >
                            <Trash2 className="h-4 w-4 mr-1 text-red-500" />
                            <span>حذف</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[550px] p-0 rounded-lg overflow-hidden">
          <div className="bg-primary/5 p-6 border-b">
            <DialogHeader className="mb-0">
              <DialogTitle className="text-2xl font-bold text-primary">
                {editingCard ? "تعديل كرت الحسم" : "إضافة كرت حسم جديد"}
              </DialogTitle>
              <DialogDescription className="mt-2 text-base opacity-90">
                {editingCard
                  ? "قم بتعديل تفاصيل كرت الحسم"
                  : "قم بإدخال تفاصيل كرت الحسم الجديد"}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-base font-medium">اسم الكرت</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="مثال: كرت أصفر" 
                          {...field} 
                          className="rounded-md h-11 text-base shadow-sm" 
                        />
                      </FormControl>
                      <FormDescription className="text-xs opacity-70">اسم يعبر عن نوع الكرت وصفته</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-base font-medium">لون الكرت</FormLabel>
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div 
                            className="h-11 w-24 rounded-md border shadow-sm overflow-hidden"
                            style={{ backgroundColor: field.value || '#FFFFFF' }}
                          >
                            <Input 
                              type="color" 
                              className="absolute inset-0 opacity-0 h-full w-full cursor-pointer" 
                              {...field} 
                            />
                          </div>
                        </div>
                        <Input
                          placeholder="#FFFFFF"
                          value={field.value}
                          onChange={field.onChange}
                          className="flex-1 rounded-md h-11 text-base shadow-sm"
                        />
                      </div>
                      <FormDescription className="text-xs opacity-70">اختر لوناً لتمييز الكرت بصرياً</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-base font-medium">وصف الكرت</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="وصف موجز للكرت ودواعي استخدامه"
                          {...field}
                          className="rounded-md min-h-[120px] text-base shadow-sm resize-y"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 rounded-lg border bg-muted/5 shadow-sm">
                    <h3 className="font-medium text-lg mb-4">متطلبات النقاط</h3>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="negative_points_threshold"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-base font-medium">الحد الأدنى للنقاط السلبية</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min={1} 
                                {...field} 
                                className="rounded-md h-11 text-base shadow-sm" 
                              />
                            </FormControl>
                            <FormDescription className="text-xs opacity-70">
                              عدد النقاط السلبية المطلوبة لتفعيل الكرت
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="deduction_percentage"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-base font-medium">نسبة الحسم (%)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min={1} 
                                max={100} 
                                {...field} 
                                className="rounded-md h-11 text-base shadow-sm" 
                              />
                            </FormControl>
                            <FormDescription className="text-xs opacity-70">نسبة الحسم التي سيتم تطبيقها</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border bg-muted/5 shadow-sm">
                    <h3 className="font-medium text-lg mb-4">مدة النشاط</h3>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="active_duration_days"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-base font-medium">المدة بالأيام</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min={0} 
                                {...field} 
                                className="rounded-md h-11 text-base shadow-sm" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="active_duration_hours"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-base font-medium">المدة بالساعات</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min={0} 
                                max={23} 
                                {...field} 
                                className="rounded-md h-11 text-base shadow-sm" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-5 shadow-sm gap-4 bg-muted/5 mt-3">
                      <div className="space-y-1">
                        <FormLabel className="text-base font-medium">الحالة</FormLabel>
                        <FormDescription className="text-xs opacity-70">
                          تحديد ما إذا كان هذا الكرت نشطاً في النظام أم لا
                        </FormDescription>
                      </div>
                      <FormControl>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={field.value}
                          onClick={() => field.onChange(!field.value)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                            field.value ? 'bg-primary' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                              field.value ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-1 rtl:-translate-x-1'
                            }`}
                          />
                        </button>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <DialogFooter className="flex justify-between items-center gap-3 mt-6 pt-4 border-t">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleDialogClose}
                    className="rounded-full px-6 py-2 hover:bg-muted/10 transition-colors border-2"
                  >
                    إلغاء
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-primary hover:bg-primary/90 text-white rounded-full px-8 py-2 transition-all shadow-md hover:shadow-lg text-base"
                  >
                    {editingCard ? "حفظ التغييرات" : "إضافة كرت"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[425px] p-6 rounded-lg">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-red-600">تأكيد الحذف</DialogTitle>
            <DialogDescription className="mt-2 text-base">
              هل أنت متأكد من رغبتك في حذف هذا الكرت؟ هذا الإجراء لا يمكن التراجع عنه.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-between items-center pt-4 mt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setDeleteConfirmOpen(false)}
              className="rounded-md border px-4 py-2 hover:bg-muted/10 transition-colors"
            >
              إلغاء
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white rounded-md px-4 py-2 transition-all shadow hover:shadow-md"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              تأكيد الحذف
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 