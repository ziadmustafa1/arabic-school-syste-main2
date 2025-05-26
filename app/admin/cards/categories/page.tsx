"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { getCategories, addCategory, updateCategory, deleteCategory } from "@/app/actions/admin"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { ArrowLeftCircle, CreditCard, Edit, Loader2, Plus, Trash, X, Home, Tag, Calculator, PlusCircle } from "lucide-react"
import Link from "next/link"
import { DataTable } from "@/components/ui/data-table"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useRouter } from "next/navigation"

interface CardCategory {
  id: number
  name: string
  description: string | null
  created_at: string
}

export default function CardCategoriesPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<CardCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    id: 0,
    name: "",
    description: "",
  })
  const [openDialog, setOpenDialog] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    setLoading(true)
    try {
      const result = await getCategories()
      if (result.success) {
        setCategories(result.data || [])
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error("Error loading categories:", error)
      toast({
        title: "خطأ في تحميل البيانات",
        description: "حدث خطأ أثناء تحميل بيانات تصنيفات الكروت",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const resetForm = () => {
    setFormData({
      id: 0,
      name: "",
      description: "",
    })
    setIsEditing(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validate form data
      if (!formData.name.trim()) {
        throw new Error("اسم التصنيف مطلوب")
      }
      
      let result;
      
      if (isEditing) {
        // Update existing category
        result = await updateCategory(formData.id, formData.name, formData.description)
      } else {
        // Create new category
        result = await addCategory(formData.name, formData.description)
      }
      
      if (!result.success) {
        throw new Error(result.error)
      }
      
      toast({
        title: isEditing ? "تم تحديث التصنيف" : "تم إنشاء التصنيف",
        description: isEditing ? "تم تحديث تصنيف الكروت بنجاح" : "تم إنشاء تصنيف الكروت بنجاح",
      })
      
      // Reload categories and reset form
      await loadCategories()
      resetForm()
      setOpenDialog(false)
      
      // Force a refresh to ensure UI is updated
      router.refresh()
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء حفظ البيانات",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const editCategory = (category: CardCategory) => {
    setFormData({
      id: category.id,
      name: category.name,
      description: category.description || "",
    })
    setIsEditing(true)
    setOpenDialog(true)
  }

  const handleDeleteCategory = async (id: number) => {
    try {
      const result = await deleteCategory(id)
      
      if (!result.success) {
        toast({
          title: "لا يمكن حذف التصنيف",
          description: result.error,
          variant: "destructive",
        })
        return
      }
      
      toast({
        title: "تم حذف التصنيف",
        description: "تم حذف تصنيف الكروت بنجاح",
      })
      
      // Reload categories
      await loadCategories()
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء حذف التصنيف",
        variant: "destructive",
      })
    }
  }

  const columns = [
    {
      key: "name",
      title: "اسم التصنيف",
      sortable: true,
      searchable: true,
    },
    {
      key: "description",
      title: "الوصف",
      render: (category: CardCategory) => category.description || "-",
      sortable: false,
      searchable: true,
    },
    {
      key: "created_at",
      title: "تاريخ الإنشاء",
      render: (category: CardCategory) => new Date(category.created_at).toLocaleDateString("ar-EG"),
      sortable: true,
      searchable: false,
      className: "hidden sm:table-cell",
    },
    {
      key: "actions",
      title: "الإجراءات",
      sortable: false,
      searchable: false,
      render: (category: CardCategory) => (
        <div className="flex gap-1 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 sm:h-8 sm:w-8 p-0"
            onClick={() => editCategory(category)}
          >
            <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-red-500 hover:text-red-700 h-7 w-7 sm:h-8 sm:w-8 p-0"
              >
                <Trash className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-base sm:text-lg">هل أنت متأكد من حذف هذا التصنيف؟</AlertDialogTitle>
                <AlertDialogDescription className="text-xs sm:text-sm">
                  سيتم حذف التصنيف "{category.name}" بشكل نهائي. هذا الإجراء لا يمكن التراجع عنه.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2">
                <AlertDialogCancel className="text-xs sm:text-sm h-8 sm:h-9">إلغاء</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-500 hover:bg-red-700 text-xs sm:text-sm h-8 sm:h-9"
                  onClick={() => handleDeleteCategory(category.id)}
                >
                  حذف
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ]

  return (
    <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-6 pb-16 sm:pb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-6 gap-3 sm:gap-0">
        <h1 className="text-xl sm:text-2xl font-bold">إدارة تصنيفات الكروت</h1>
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
          
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm h-10 sm:h-10 w-full sm:w-auto">
                      <Plus className="h-4 w-4 sm:h-4 sm:w-4" />
                      <span className="sm:inline">إضافة تصنيف جديد</span>
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">إضافة تصنيف جديد</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <DialogContent className="max-w-[90vw] sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-base sm:text-lg">{isEditing ? "تعديل تصنيف" : "إضافة تصنيف جديد"}</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  {isEditing
                    ? "قم بتعديل بيانات التصنيف الحالي"
                    : "أدخل معلومات التصنيف الجديد"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="name" className="text-xs sm:text-sm">اسم التصنيف</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="h-8 sm:h-9 text-xs sm:text-sm"
                    />
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="description" className="text-xs sm:text-sm">الوصف</Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={4}
                      className="text-xs sm:text-sm min-h-[80px] sm:min-h-[100px]"
                    />
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      resetForm()
                      setOpenDialog(false)
                    }}
                    className="text-xs sm:text-sm h-8 sm:h-9"
                  >
                    إلغاء
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="text-xs sm:text-sm h-8 sm:h-9">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                        جاري الحفظ...
                      </>
                    ) : isEditing ? (
                      "تحديث"
                    ) : (
                      "إضافة"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
          <CardTitle className="flex items-center gap-1 sm:gap-2 text-base sm:text-lg">
            <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
            تصنيفات كروت الشحن
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            قم بإدارة تصنيفات كروت الشحن المستخدمة في النظام
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-3 py-2 sm:py-3">
          <DataTable
            data={categories}
            columns={columns}
            loading={loading}
            searchable={true}
            searchPlaceholder="ابحث عن تصنيف..."
            emptyState={
              <div className="text-center py-6 sm:py-8">
                <CreditCard className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground" />
                <p className="mt-3 sm:mt-4 text-base sm:text-lg">لا توجد تصنيفات حالياً</p>
                <p className="text-xs sm:text-sm text-muted-foreground">قم بإضافة تصنيفات جديدة باستخدام زر "تصنيف جديد"</p>
              </div>
            }
          />
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
                onClick={() => setOpenDialog(true)}
                variant="default"
                className="rounded-full h-12 w-12 flex flex-col items-center justify-center shadow-lg p-0"
              >
                <Plus className="h-6 w-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">إضافة تصنيف جديد</p>
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