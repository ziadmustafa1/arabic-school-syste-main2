"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "@/components/ui/use-toast"
import { 
  Pencil, 
  Trash, 
  MoreVertical, 
  PlusCircle,
  RefreshCw,
  Search
} from "lucide-react"
import { getSubjects, addSubject, updateSubject, deleteSubject } from "@/lib/actions/admin"

interface Subject {
  id: number
  name: string
  description: string | null
  created_at: string
}

export default function SubjectsManagementPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  
  // Add subject dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState("")
  const [newSubjectDescription, setNewSubjectDescription] = useState("")
  
  // Edit subject dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  
  // Delete subject dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteSubjectId, setDeleteSubjectId] = useState<number | null>(null)
  
  // Fetch subjects on component mount
  useEffect(() => {
    fetchSubjects()
  }, [])
  
  const fetchSubjects = async () => {
    setLoading(true)
    try {
      const result = await getSubjects()
      if (result.success && result.data) {
        setSubjects(result.data)
      } else {
        toast({
          variant: "destructive",
          title: "خطأ في جلب المواد الدراسية",
          description: result.error || "حدث خطأ أثناء جلب بيانات المواد الدراسية",
        })
      }
    } catch (error) {
      console.error("Error fetching subjects:", error)
      toast({
        variant: "destructive",
        title: "خطأ غير متوقع",
        description: "حدث خطأ أثناء جلب بيانات المواد الدراسية",
      })
    } finally {
      setLoading(false)
    }
  }
  
  // Filter subjects based on search term
  const filteredSubjects = subjects.filter(subject => 
    subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (subject.description && subject.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )
  
  // Handle add subject
  const handleAddSubmit = async () => {
    if (!newSubjectName.trim()) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "يرجى إدخال اسم المادة الدراسية",
      })
      return
    }
    
    try {
      const result = await addSubject(newSubjectName, newSubjectDescription)
      
      if (result.success) {
        toast({
          title: "تمت الإضافة",
          description: "تم إضافة المادة الدراسية بنجاح",
        })
        
        // Add the new subject to the list
        if (result.data) {
          setSubjects([...subjects, result.data])
        } else {
          // Refresh the list if we don't have the new data
          fetchSubjects()
        }
        
        // Reset form and close dialog
        setNewSubjectName("")
        setNewSubjectDescription("")
        setAddDialogOpen(false)
      } else {
        toast({
          variant: "destructive",
          title: "خطأ في إضافة المادة الدراسية",
          description: result.error || "حدث خطأ أثناء إضافة المادة الدراسية",
        })
      }
    } catch (error) {
      console.error("Error adding subject:", error)
      toast({
        variant: "destructive",
        title: "خطأ غير متوقع",
        description: "حدث خطأ أثناء إضافة المادة الدراسية",
      })
    }
  }
  
  // Open edit dialog
  const handleEditClick = (subject: Subject) => {
    setEditingSubject(subject)
    setEditName(subject.name)
    setEditDescription(subject.description || "")
    setEditDialogOpen(true)
  }
  
  // Handle edit subject
  const handleEditSubmit = async () => {
    if (!editingSubject) return
    
    if (!editName.trim()) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "يرجى إدخال اسم المادة الدراسية",
      })
      return
    }
    
    try {
      const result = await updateSubject(
        editingSubject.id,
        editName,
        editDescription
      )
      
      if (result.success) {
        toast({
          title: "تم التحديث",
          description: "تم تحديث المادة الدراسية بنجاح",
        })
        
        // Update the subject in the list
        setSubjects(subjects.map(subject => 
          subject.id === editingSubject.id 
            ? { ...subject, name: editName, description: editDescription }
            : subject
        ))
        
        setEditDialogOpen(false)
      } else {
        toast({
          variant: "destructive",
          title: "خطأ في تحديث المادة الدراسية",
          description: result.error || "حدث خطأ أثناء تحديث المادة الدراسية",
        })
      }
    } catch (error) {
      console.error("Error updating subject:", error)
      toast({
        variant: "destructive",
        title: "خطأ غير متوقع",
        description: "حدث خطأ أثناء تحديث المادة الدراسية",
      })
    }
  }
  
  // Handle delete subject
  const handleDeleteClick = (subjectId: number) => {
    setDeleteSubjectId(subjectId)
    setDeleteDialogOpen(true)
  }
  
  const handleDeleteSubmit = async () => {
    if (!deleteSubjectId) return
    
    try {
      const result = await deleteSubject(deleteSubjectId)
      
      if (result.success) {
        toast({
          title: "تم الحذف",
          description: "تم حذف المادة الدراسية بنجاح",
        })
        
        // Remove the subject from the list
        setSubjects(subjects.filter(subject => subject.id !== deleteSubjectId))
        setDeleteDialogOpen(false)
      } else {
        toast({
          variant: "destructive",
          title: "خطأ في حذف المادة الدراسية",
          description: result.error || "حدث خطأ أثناء حذف المادة الدراسية",
        })
      }
    } catch (error) {
      console.error("Error deleting subject:", error)
      toast({
        variant: "destructive",
        title: "خطأ غير متوقع",
        description: "حدث خطأ أثناء حذف المادة الدراسية",
      })
    }
  }
  
  return (
    <>
      <div className="container max-w-6xl py-6 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary">إدارة المواد الدراسية</h1>
            <p className="text-muted-foreground mt-2">إنشاء وتعديل المواد الدراسية المتاحة في النظام</p>
          </div>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="shadow-md border-muted/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold text-right">إجمالي المواد الدراسية</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-right mb-2">{subjects.length}</div>
              <p className="text-sm text-muted-foreground text-right">المواد الدراسية المسجلة في النظام</p>
            </CardContent>
          </Card>
        </div>
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-1/2">
            <Search className="h-5 w-5 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
            <Input 
              placeholder="البحث باسم المادة أو الوصف" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 text-right h-11 rounded-md shadow-sm"
            />
          </div>
          
          <div className="flex gap-3 w-full md:w-auto justify-end">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={fetchSubjects}
              disabled={loading}
              className="h-11 w-11 rounded-md border shadow-sm"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            
            <Button 
              onClick={() => setAddDialogOpen(true)}
              className="bg-primary hover:bg-primary/90 text-white rounded-md h-11 px-4 py-2 transition-all shadow-md hover:shadow-lg"
            >
              <PlusCircle className="h-5 w-5 ml-2" />
              إضافة مادة دراسية
            </Button>
          </div>
        </div>
        
        <Card className="shadow-md overflow-hidden border-muted/20">
          <CardContent className="p-0">
              <Table>
                <TableHeader>
                <TableRow className="bg-muted/10 hover:bg-muted/10">
                  <TableHead className="text-right font-bold">اسم المادة</TableHead>
                  <TableHead className="text-right font-bold">الوصف</TableHead>
                  <TableHead className="text-right font-bold">تاريخ الإضافة</TableHead>
                  <TableHead className="text-right font-bold w-[120px]">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                    <TableCell colSpan={4} className="text-center py-12">
                      <div className="flex justify-center items-center flex-col">
                        <RefreshCw className="h-8 w-8 animate-spin mb-4 text-muted-foreground" />
                        <span className="text-base">جاري تحميل البيانات...</span>
                      </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredSubjects.length === 0 ? (
                    <TableRow>
                    <TableCell colSpan={4} className="text-center py-12">
                      <p className="text-base">لا توجد مواد دراسية متطابقة مع معايير البحث</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSubjects.map((subject) => (
                    <TableRow key={subject.id} className="hover:bg-muted/5">
                      <TableCell className="font-medium text-base text-right py-4 px-6">{subject.name}</TableCell>
                      <TableCell className="text-right py-4 px-6 text-base">{subject.description || "-"}</TableCell>
                      <TableCell className="text-right py-4 px-6 text-base">
                          {new Date(subject.created_at).toLocaleDateString('ar-EG')}
                        </TableCell>
                      <TableCell className="text-center py-4 px-6">
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClick(subject)}
                            className="border h-9 px-3 py-2 rounded-md hover:bg-muted/10 hover:text-blue-600 transition-colors"
                          >
                            <Pencil className="h-4 w-4 ml-1 text-blue-500" />
                            <span>تعديل</span>
                              </Button>
                          <Button
                            variant="outline"
                            size="sm"
                                onClick={() => handleDeleteClick(subject.id)}
                            className="border h-9 px-3 py-2 rounded-md hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                          >
                            <Trash className="h-4 w-4 ml-1 text-red-500" />
                            <span>حذف</span>
                          </Button>
                        </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
          </CardContent>
        </Card>
      </div>
      
      {/* Add Subject Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 rounded-lg overflow-hidden">
          <div className="bg-primary/5 p-6 border-b">
            <DialogHeader className="mb-0">
              <DialogTitle className="text-2xl font-bold text-primary">
                إضافة مادة دراسية جديدة
              </DialogTitle>
              <DialogDescription className="mt-2 text-base opacity-90">
              أدخل معلومات المادة الدراسية الجديدة
            </DialogDescription>
          </DialogHeader>
          </div>
          <div className="p-6">
            <div className="space-y-5 py-4">
            <div className="space-y-2">
                <Label htmlFor="subject-name" className="text-base font-medium">اسم المادة الدراسية</Label>
              <Input
                id="subject-name"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder="أدخل اسم المادة الدراسية"
                  className="rounded-md h-11 text-base shadow-sm"
              />
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="subject-description" className="text-base font-medium">وصف المادة (اختياري)</Label>
              <Textarea
                id="subject-description"
                value={newSubjectDescription}
                onChange={(e) => setNewSubjectDescription(e.target.value)}
                placeholder="أدخل وصفاً للمادة الدراسية"
                rows={3}
                  className="rounded-md min-h-[120px] text-base shadow-sm resize-y"
              />
            </div>
          </div>
            <div className="flex justify-between items-center gap-3 mt-6 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setAddDialogOpen(false)}
                className="rounded-full px-6 py-2 hover:bg-muted/10 transition-colors border-2"
              >
              إلغاء
            </Button>
              <Button 
                type="submit" 
                onClick={handleAddSubmit}
                className="bg-primary hover:bg-primary/90 text-white rounded-full px-8 py-2 transition-all shadow-md hover:shadow-lg text-base"
              >
              إضافة المادة
            </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Edit Subject Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 rounded-lg overflow-hidden">
          <div className="bg-primary/5 p-6 border-b">
            <DialogHeader className="mb-0">
              <DialogTitle className="text-2xl font-bold text-primary">
                تعديل المادة الدراسية
              </DialogTitle>
              <DialogDescription className="mt-2 text-base opacity-90">
              قم بتعديل معلومات المادة الدراسية
            </DialogDescription>
          </DialogHeader>
          </div>
          <div className="p-6">
            <div className="space-y-5 py-4">
            <div className="space-y-2">
                <Label htmlFor="edit-subject-name" className="text-base font-medium">اسم المادة الدراسية</Label>
              <Input
                id="edit-subject-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="أدخل اسم المادة الدراسية"
                  className="rounded-md h-11 text-base shadow-sm"
              />
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="edit-subject-description" className="text-base font-medium">وصف المادة (اختياري)</Label>
              <Textarea
                id="edit-subject-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="أدخل وصفاً للمادة الدراسية"
                rows={3}
                  className="rounded-md min-h-[120px] text-base shadow-sm resize-y"
              />
            </div>
          </div>
            <div className="flex justify-between items-center gap-3 mt-6 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setEditDialogOpen(false)}
                className="rounded-full px-6 py-2 hover:bg-muted/10 transition-colors border-2"
              >
              إلغاء
            </Button>
              <Button 
                type="submit" 
                onClick={handleEditSubmit}
                className="bg-primary hover:bg-primary/90 text-white rounded-full px-8 py-2 transition-all shadow-md hover:shadow-lg text-base"
              >
              حفظ التغييرات
            </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Delete Subject Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px] p-6 rounded-lg">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-red-600">حذف المادة الدراسية</DialogTitle>
            <DialogDescription className="mt-2 text-base">
              هل أنت متأكد من رغبتك في حذف هذه المادة الدراسية؟ لن يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-between items-center pt-4 mt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
              className="rounded-full border px-6 py-2 hover:bg-muted/10 transition-colors border-2"
            >
              إلغاء
            </Button>
            <Button 
              type="submit" 
              onClick={handleDeleteSubmit}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 text-white rounded-full px-6 py-2 transition-all shadow-md hover:shadow-lg"
            >
              <Trash className="mr-2 h-4 w-4" />
              تأكيد الحذف
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
} 