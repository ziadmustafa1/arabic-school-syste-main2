"use client"

import { useState, useEffect } from "react"
import { toast } from "@/components/ui/use-toast"
import { getAwards, addAward, updateAward, deleteAward, awardToUser } from "@/lib/actions/admin"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Loader2,
  Award,
  Pencil,
  Trash2,
  Plus,
  MoreVertical,
  RefreshCw,
  User
} from "lucide-react"

interface Award {
  id: number
  name: string
  description: string | null
  image_url: string | null
  points_required: number
  created_at?: string
}

export default function AdminAwardsPage() {
  const [awards, setAwards] = useState<Award[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingAward, setEditingAward] = useState<Award | null>(null)
  
  // Add award dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newAwardName, setNewAwardName] = useState("")
  const [newAwardDescription, setNewAwardDescription] = useState("")
  const [newAwardImageUrl, setNewAwardImageUrl] = useState("")
  const [newAwardPointsRequired, setNewAwardPointsRequired] = useState(100)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Edit award dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editImageUrl, setEditImageUrl] = useState("")
  const [editPointsRequired, setEditPointsRequired] = useState(100)
  
  // Delete award dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteAwardId, setDeleteAwardId] = useState<number | null>(null)
  
  // Award to user dialog
  const [awardToUserDialogOpen, setAwardToUserDialogOpen] = useState(false)
  const [selectedAwardId, setSelectedAwardId] = useState<number | null>(null)
  const [userCode, setUserCode] = useState("")

  const fetchAwards = async () => {
    try {
      setIsLoading(true)
      
      const result = await getAwards()
      
      if (!result.success) {
        throw new Error(result.error || "حدث خطأ أثناء جلب الأوسمة")
      }
      
      setAwards(result.data || [])
    } catch (error: any) {
      console.error("Error fetching awards:", error)
      toast({
        title: "خطأ في تحميل البيانات",
        description: error.message || "حدث خطأ أثناء تحميل الأوسمة",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAwards()
  }, [])

  const handleAddAward = async () => {
    try {
      setIsSubmitting(true)
      
      if (!newAwardName || newAwardPointsRequired < 0) {
        throw new Error("يرجى تعبئة جميع الحقول المطلوبة")
      }
      
      const result = await addAward(
        newAwardName,
        newAwardDescription,
        newAwardImageUrl,
        newAwardPointsRequired
      )
      
      if (!result.success) {
        throw new Error(result.error || "حدث خطأ أثناء إنشاء الوسام")
      }
      
      toast({
        title: "تم إنشاء الوسام",
        description: "تم إنشاء الوسام بنجاح"
      })
      
      // Reset form and refresh
      setNewAwardName("")
      setNewAwardDescription("")
      setNewAwardImageUrl("")
      setNewAwardPointsRequired(100)
      setAddDialogOpen(false)
      fetchAwards()
    } catch (error: any) {
      console.error("Error adding award:", error)
      toast({
        title: "خطأ في إنشاء الوسام",
        description: error.message || "حدث خطأ أثناء إنشاء الوسام",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditClick = (award: Award) => {
    setEditingAward(award)
    setEditName(award.name)
    setEditDescription(award.description || "")
    setEditImageUrl(award.image_url || "")
    setEditPointsRequired(award.points_required)
    setEditDialogOpen(true)
  }

  const handleUpdateAward = async () => {
    try {
      setIsSubmitting(true)
      
      if (!editName || editPointsRequired < 0 || !editingAward) {
        throw new Error("يرجى تعبئة جميع الحقول المطلوبة")
      }
      
      const result = await updateAward(
        editingAward.id,
        editName,
        editDescription,
        editImageUrl,
        editPointsRequired
      )
      
      if (!result.success) {
        throw new Error(result.error || "حدث خطأ أثناء تحديث الوسام")
      }
      
      toast({
        title: "تم تحديث الوسام",
        description: "تم تحديث الوسام بنجاح"
      })
      
      setEditDialogOpen(false)
      fetchAwards()
    } catch (error: any) {
      console.error("Error updating award:", error)
      toast({
        title: "خطأ في تحديث الوسام",
        description: error.message || "حدث خطأ أثناء تحديث الوسام",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteClick = (id: number) => {
    setDeleteAwardId(id)
    setDeleteDialogOpen(true)
  }

  const handleDeleteAward = async () => {
    try {
      setIsSubmitting(true)
      
      if (!deleteAwardId) {
        throw new Error("معرف الوسام غير محدد")
      }
      
      const result = await deleteAward(deleteAwardId)
      
      if (!result.success) {
        throw new Error(result.error || "حدث خطأ أثناء حذف الوسام")
      }
      
      toast({
        title: "تم حذف الوسام",
        description: "تم حذف الوسام بنجاح"
      })
      
      setDeleteDialogOpen(false)
      fetchAwards()
    } catch (error: any) {
      console.error("Error deleting award:", error)
      toast({
        title: "خطأ في حذف الوسام",
        description: error.message || "حدث خطأ أثناء حذف الوسام",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
      setDeleteAwardId(null)
    }
  }
  
  const handleAwardToUserClick = (id: number) => {
    setSelectedAwardId(id)
    setUserCode("")
    setAwardToUserDialogOpen(true)
  }
  
  const handleAwardToUser = async () => {
    try {
      setIsSubmitting(true)
      
      if (!selectedAwardId || !userCode) {
        throw new Error("يرجى تعبئة جميع الحقول المطلوبة")
      }
      
      const result = await awardToUser(selectedAwardId, userCode)
      
      if (!result.success) {
        throw new Error(result.error || "حدث خطأ أثناء منح الوسام")
      }
      
      toast({
        title: "تم منح الوسام",
        description: "تم منح الوسام للمستخدم بنجاح"
      })
      
      setAwardToUserDialogOpen(false)
    } catch (error: any) {
      console.error("Error awarding to user:", error)
      toast({
        title: "خطأ في منح الوسام",
        description: error.message || "حدث خطأ أثناء منح الوسام للمستخدم",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">إدارة الأوسمة</h1>
          <p className="text-muted-foreground">
            إدارة الأوسمة المتاحة في النظام
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => fetchAwards()} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            إضافة وسام
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>الأوسمة</CardTitle>
          <CardDescription>
            قائمة بجميع الأوسمة المتاحة في النظام
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : awards.length === 0 ? (
            <div className="text-center py-12">
              <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">لا توجد أوسمة</h3>
              <p className="text-muted-foreground mt-2">
                قم بإضافة الأوسمة باستخدام زر "إضافة وسام" أعلاه
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>النقاط المطلوبة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead className="text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {awards.map((award) => (
                  <TableRow key={award.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {award.image_url ? (
                          <img 
                            src={award.image_url} 
                            alt={award.name} 
                            className="h-8 w-8 rounded-sm" 
                          />
                        ) : (
                          <Award className="h-8 w-8 text-primary" />
                        )}
                        {award.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {award.description?.substring(0, 50) || "لا يوجد وصف"}
                      {award.description && award.description.length > 50 && "..."}
                    </TableCell>
                    <TableCell>{award.points_required}</TableCell>
                    <TableCell>
                      {award.created_at ? new Date(award.created_at).toLocaleDateString("ar-SA") : "غير معروف"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditClick(award)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            تعديل
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleAwardToUserClick(award.id)}
                          >
                            <User className="mr-2 h-4 w-4" />
                            منح للمستخدم
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteClick(award.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            حذف
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Award Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة وسام جديد</DialogTitle>
            <DialogDescription>أدخل تفاصيل الوسام الجديد أدناه</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                الاسم
              </Label>
              <Input
                id="name"
                placeholder="اسم الوسام"
                className="col-span-3"
                value={newAwardName}
                onChange={(e) => setNewAwardName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                الوصف
              </Label>
              <Textarea
                id="description"
                placeholder="وصف الوسام"
                className="col-span-3"
                value={newAwardDescription}
                onChange={(e) => setNewAwardDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="image-url" className="text-right">
                رابط الصورة
              </Label>
              <Input
                id="image-url"
                placeholder="رابط صورة الوسام (اختياري)"
                className="col-span-3"
                value={newAwardImageUrl}
                onChange={(e) => setNewAwardImageUrl(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="points-required" className="text-right">
                النقاط المطلوبة
              </Label>
              <Input
                id="points-required"
                type="number"
                placeholder="النقاط المطلوبة للحصول على الوسام"
                className="col-span-3"
                value={newAwardPointsRequired}
                onChange={(e) => setNewAwardPointsRequired(parseInt(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setAddDialogOpen(false)}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button 
              onClick={handleAddAward}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جارِ الإضافة...
                </>
              ) : (
                'إضافة'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Award Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل الوسام</DialogTitle>
            <DialogDescription>قم بتعديل تفاصيل الوسام أدناه</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                الاسم
              </Label>
              <Input
                id="edit-name"
                placeholder="اسم الوسام"
                className="col-span-3"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-description" className="text-right">
                الوصف
              </Label>
              <Textarea
                id="edit-description"
                placeholder="وصف الوسام"
                className="col-span-3"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-image-url" className="text-right">
                رابط الصورة
              </Label>
              <Input
                id="edit-image-url"
                placeholder="رابط صورة الوسام (اختياري)"
                className="col-span-3"
                value={editImageUrl}
                onChange={(e) => setEditImageUrl(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-points-required" className="text-right">
                النقاط المطلوبة
              </Label>
              <Input
                id="edit-points-required"
                type="number"
                placeholder="النقاط المطلوبة للحصول على الوسام"
                className="col-span-3"
                value={editPointsRequired}
                onChange={(e) => setEditPointsRequired(parseInt(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEditDialogOpen(false)}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button 
              onClick={handleUpdateAward}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جارِ التحديث...
                </>
              ) : (
                'تحديث'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Award to User Dialog */}
      <Dialog open={awardToUserDialogOpen} onOpenChange={setAwardToUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>منح الوسام لمستخدم</DialogTitle>
            <DialogDescription>أدخل رمز المستخدم لمنحه الوسام</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="user-code" className="text-right">
                رمز المستخدم
              </Label>
              <Input
                id="user-code"
                placeholder="أدخل رمز المستخدم"
                className="col-span-3"
                value={userCode}
                onChange={(e) => setUserCode(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setAwardToUserDialogOpen(false)}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button 
              onClick={handleAwardToUser}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جارِ المنح...
                </>
              ) : (
                'منح الوسام'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Award Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من حذف الوسام؟</AlertDialogTitle>
            <AlertDialogDescription>
              لا يمكن التراجع عن هذا الإجراء. سيتم حذف الوسام نهائياً من قاعدة البيانات.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAward}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جارِ الحذف...
                </>
              ) : (
                'حذف'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 