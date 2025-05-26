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
  Search,
  Award,
  ImagePlus,
  Loader2
} from "lucide-react"
import { getAllEmblems, addEmblem, updateEmblem, deleteEmblem, awardEmblemToUser } from "@/lib/actions/emblems"

interface Emblem {
  id: number
  name: string
  description: string | null
  image_url: string | null
  points_value: number
  created_at: string
}

export default function EmblemsManagementPage() {
  const [emblems, setEmblems] = useState<Emblem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  
  // Add emblem dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newEmblemName, setNewEmblemName] = useState("")
  const [newEmblemDescription, setNewEmblemDescription] = useState("")
  const [newEmblemImageUrl, setNewEmblemImageUrl] = useState("")
  const [newEmblemPointsValue, setNewEmblemPointsValue] = useState(10)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Edit emblem dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingEmblem, setEditingEmblem] = useState<Emblem | null>(null)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editImageUrl, setEditImageUrl] = useState("")
  const [editPointsValue, setEditPointsValue] = useState(0)
  
  // Delete emblem dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteEmblemId, setDeleteEmblemId] = useState<number | null>(null)
  
  // Award emblem dialog
  const [awardDialogOpen, setAwardDialogOpen] = useState(false)
  const [awardEmblemId, setAwardEmblemId] = useState<number | null>(null)
  const [userCode, setUserCode] = useState("")
  
  // Fetch emblems on component mount
  useEffect(() => {
    fetchEmblems()
  }, [])
  
  const fetchEmblems = async () => {
    setLoading(true)
    try {
      const result = await getAllEmblems()
      if (result.success && result.data) {
        setEmblems(result.data)
      } else {
        toast({
          variant: "destructive",
          title: "خطأ في جلب الشارات",
          description: result.message || "حدث خطأ أثناء جلب بيانات الشارات",
        })
      }
    } catch (error) {
      console.error("Error fetching emblems:", error)
      toast({
        variant: "destructive",
        title: "خطأ غير متوقع",
        description: "حدث خطأ أثناء جلب بيانات الشارات",
      })
    } finally {
      setLoading(false)
    }
  }
  
  // Filter emblems based on search term
  const filteredEmblems = emblems.filter(emblem => 
    emblem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emblem.description && emblem.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )
  
  // Handle add emblem
  const handleAddSubmit = async () => {
    if (!newEmblemName.trim()) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "يرجى إدخال اسم الشارة",
      })
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const result = await addEmblem(
        newEmblemName, 
        newEmblemDescription,
        newEmblemImageUrl,
        newEmblemPointsValue
      )
      
      if (result.success) {
        toast({
          title: "تمت الإضافة",
          description: "تم إضافة الشارة بنجاح",
        })
        
        // Add the new emblem to the list
        if (result.data) {
          setEmblems([...emblems, result.data])
        } else {
          // Refresh the list if we don't have the new data
          fetchEmblems()
        }
        
        // Reset form and close dialog
        setNewEmblemName("")
        setNewEmblemDescription("")
        setNewEmblemImageUrl("")
        setNewEmblemPointsValue(10)
        setAddDialogOpen(false)
      } else {
        toast({
          variant: "destructive",
          title: "خطأ في إضافة الشارة",
          description: result.message || "حدث خطأ أثناء إضافة الشارة",
        })
      }
    } catch (error) {
      console.error("Error adding emblem:", error)
      toast({
        variant: "destructive",
        title: "خطأ غير متوقع",
        description: "حدث خطأ أثناء إضافة الشارة",
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Open edit dialog
  const handleEditClick = (emblem: Emblem) => {
    setEditingEmblem(emblem)
    setEditName(emblem.name)
    setEditDescription(emblem.description || "")
    setEditImageUrl(emblem.image_url || "")
    setEditPointsValue(emblem.points_value)
    setEditDialogOpen(true)
  }
  
  // Handle edit emblem
  const handleEditSubmit = async () => {
    if (!editingEmblem) return
    
    if (!editName.trim()) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "يرجى إدخال اسم الشارة",
      })
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const result = await updateEmblem(
        editingEmblem.id,
        editName,
        editDescription,
        editImageUrl,
        editPointsValue
      )
      
      if (result.success) {
        toast({
          title: "تم التحديث",
          description: "تم تحديث الشارة بنجاح",
        })
        
        // Update the emblem in the list
        setEmblems(emblems.map(emblem => 
          emblem.id === editingEmblem.id 
            ? { 
                ...emblem, 
                name: editName, 
                description: editDescription,
                image_url: editImageUrl,
                points_value: editPointsValue
              }
            : emblem
        ))
        
        setEditDialogOpen(false)
      } else {
        toast({
          variant: "destructive",
          title: "خطأ في تحديث الشارة",
          description: result.message || "حدث خطأ أثناء تحديث الشارة",
        })
      }
    } catch (error) {
      console.error("Error updating emblem:", error)
      toast({
        variant: "destructive",
        title: "خطأ غير متوقع",
        description: "حدث خطأ أثناء تحديث الشارة",
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Handle delete emblem
  const handleDeleteClick = (emblemId: number) => {
    setDeleteEmblemId(emblemId)
    setDeleteDialogOpen(true)
  }
  
  const handleDeleteSubmit = async () => {
    if (!deleteEmblemId) return
    
    setIsSubmitting(true)
    
    try {
      const result = await deleteEmblem(deleteEmblemId)
      
      if (result.success) {
        toast({
          title: "تم الحذف",
          description: "تم حذف الشارة بنجاح",
        })
        
        // Remove the emblem from the list
        setEmblems(emblems.filter(emblem => emblem.id !== deleteEmblemId))
        setDeleteDialogOpen(false)
      } else {
        toast({
          variant: "destructive",
          title: "خطأ في حذف الشارة",
          description: result.message || "حدث خطأ أثناء حذف الشارة",
        })
      }
    } catch (error) {
      console.error("Error deleting emblem:", error)
      toast({
        variant: "destructive",
        title: "خطأ غير متوقع",
        description: "حدث خطأ أثناء حذف الشارة",
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Handle award emblem
  const handleAwardClick = (emblemId: number) => {
    setAwardEmblemId(emblemId)
    setUserCode("")
    setAwardDialogOpen(true)
  }
  
  const handleAwardSubmit = async () => {
    if (!awardEmblemId || !userCode.trim()) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "يرجى إدخال الرمز التعريفي للمستخدم",
      })
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const result = await awardEmblemToUser(awardEmblemId, userCode)
      
      if (result.success) {
        toast({
          title: "تم منح الشارة",
          description: "تم منح الشارة لمستخدم بنجاح",
        })
        
        setAwardDialogOpen(false)
      } else {
        toast({
          variant: "destructive",
          title: "خطأ في منح الشارة",
          description: result.error || "حدث خطأ أثناء منح الشارة للمستخدم",
        })
      }
    } catch (error) {
      console.error("Error awarding emblem:", error)
      toast({
        variant: "destructive",
        title: "خطأ غير متوقع",
        description: "حدث خطأ أثناء منح الشارة للمستخدم",
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-right">إدارة الشارات</h1>
      
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card className="shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-right">إجمالي الشارات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-right mb-2">{emblems.length}</div>
            <p className="text-sm text-muted-foreground text-right">الشارات المسجلة في النظام</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="mb-8 flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex items-center gap-3 w-full md:w-1/2 relative">
          <Search className="h-5 w-5 text-muted-foreground absolute right-3" />
          <Input 
            placeholder="البحث باسم الشارة أو الوصف" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 text-right"
          />
        </div>
        
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={fetchEmblems}
            disabled={loading}
            className="h-10 w-10"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <RefreshCw className="h-5 w-5" />
            )}
          </Button>
          
          <Button onClick={() => setAddDialogOpen(true)} className="h-10">
            <PlusCircle className="h-5 w-5 ml-2" />
            إضافة شارة جديدة
          </Button>
        </div>
      </div>
      
      <Card className="shadow-md">
        <CardContent className="p-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-right font-bold py-4 px-6 text-base">الصورة</TableHead>
                  <TableHead className="text-right font-bold py-4 px-6 text-base">اسم الشارة</TableHead>
                  <TableHead className="text-right font-bold py-4 px-6 text-base">الوصف</TableHead>
                  <TableHead className="text-center font-bold py-4 px-6 text-base">عدد النقاط</TableHead>
                  <TableHead className="text-center font-bold py-4 px-6 text-base w-[120px]">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                      <p className="text-base">جاري تحميل البيانات...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredEmblems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <p className="text-base">لا توجد شارات متطابقة مع معايير البحث</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmblems.map((emblem) => (
                    <TableRow key={emblem.id}>
                      <TableCell className="py-4 px-6">
                        {emblem.image_url ? (
                          <img 
                            src={emblem.image_url} 
                            alt={emblem.name} 
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                            <Award className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-base text-right py-4 px-6">{emblem.name}</TableCell>
                      <TableCell className="text-right py-4 px-6 text-base">{emblem.description || "-"}</TableCell>
                      <TableCell className="text-center py-4 px-6 text-base">{emblem.points_value}</TableCell>
                      <TableCell className="text-center py-4 px-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9">
                              <MoreVertical className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[200px]">
                            <DropdownMenuItem onClick={() => handleEditClick(emblem)} className="text-base py-3">
                              <Pencil className="h-5 w-5 ml-3" />
                              تعديل الشارة
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem onClick={() => handleAwardClick(emblem.id)} className="text-base py-3">
                              <Award className="h-5 w-5 ml-3" />
                              منح الشارة لمستخدم
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem 
                              onClick={() => handleDeleteClick(emblem.id)}
                              className="text-red-600 text-base py-3"
                            >
                              <Trash className="h-5 w-5 ml-3" />
                              حذف الشارة
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* Add Emblem Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-right">إضافة شارة جديدة</DialogTitle>
            <DialogDescription className="text-right text-base mt-2">
              أدخل معلومات الشارة الجديدة. الشارات تضيف نقاط للمستخدم عند منحها.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-3">
              <Label htmlFor="emblem-name" className="text-right block text-base font-medium">اسم الشارة</Label>
              <Input
                id="emblem-name"
                value={newEmblemName}
                onChange={(e) => setNewEmblemName(e.target.value)}
                placeholder="أدخل اسم الشارة"
                className="text-right"
              />
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="emblem-description" className="text-right block text-base font-medium">وصف الشارة (اختياري)</Label>
              <Textarea
                id="emblem-description"
                value={newEmblemDescription}
                onChange={(e) => setNewEmblemDescription(e.target.value)}
                placeholder="أدخل وصفاً للشارة"
                rows={3}
                className="text-right"
              />
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="emblem-image" className="text-right block text-base font-medium">رابط صورة الشارة (اختياري)</Label>
              <Input
                id="emblem-image"
                value={newEmblemImageUrl}
                onChange={(e) => setNewEmblemImageUrl(e.target.value)}
                placeholder="أدخل رابط صورة الشارة"
                className="text-right"
              />
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="emblem-points" className="text-right block text-base font-medium">عدد النقاط التي تضاف للمستخدم</Label>
              <Input
                id="emblem-points"
                type="number"
                value={newEmblemPointsValue}
                onChange={(e) => setNewEmblemPointsValue(Number(e.target.value))}
                placeholder="أدخل عدد النقاط"
                min={0}
                className="text-right"
              />
            </div>
          </div>
          <DialogFooter className="gap-3 mt-2">
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} className="text-base">
              إلغاء
            </Button>
            <Button 
              type="submit" 
              onClick={handleAddSubmit} 
              disabled={isSubmitting} 
              className="text-base"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                  جاري الإضافة...
                </>
              ) : (
                "إضافة الشارة"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Emblem Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-right">تعديل الشارة</DialogTitle>
            <DialogDescription className="text-right text-base mt-2">
              قم بتعديل معلومات الشارة
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-3">
              <Label htmlFor="edit-emblem-name" className="text-right block text-base font-medium">اسم الشارة</Label>
              <Input
                id="edit-emblem-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="أدخل اسم الشارة"
                className="text-right"
              />
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="edit-emblem-description" className="text-right block text-base font-medium">وصف الشارة (اختياري)</Label>
              <Textarea
                id="edit-emblem-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="أدخل وصفاً للشارة"
                rows={3}
                className="text-right"
              />
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="edit-emblem-image" className="text-right block text-base font-medium">رابط صورة الشارة (اختياري)</Label>
              <Input
                id="edit-emblem-image"
                value={editImageUrl}
                onChange={(e) => setEditImageUrl(e.target.value)}
                placeholder="أدخل رابط صورة الشارة"
                className="text-right"
              />
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="edit-emblem-points" className="text-right block text-base font-medium">عدد النقاط التي تضاف للمستخدم</Label>
              <Input
                id="edit-emblem-points"
                type="number"
                value={editPointsValue}
                onChange={(e) => setEditPointsValue(Number(e.target.value))}
                placeholder="أدخل عدد النقاط"
                min={0}
                className="text-right"
              />
            </div>
          </div>
          <DialogFooter className="gap-3 mt-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="text-base">
              إلغاء
            </Button>
            <Button 
              type="submit" 
              onClick={handleEditSubmit} 
              disabled={isSubmitting}
              className="text-base"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                  جاري التحديث...
                </>
              ) : (
                "حفظ التغييرات"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Emblem Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-right">حذف الشارة</DialogTitle>
            <DialogDescription className="text-right text-base mt-2">
              هل أنت متأكد من رغبتك في حذف هذه الشارة؟ لن يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="text-base">
              إلغاء
            </Button>
            <Button 
              type="submit" 
              onClick={handleDeleteSubmit}
              variant="destructive"
              disabled={isSubmitting}
              className="text-base"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                  جاري الحذف...
                </>
              ) : (
                "حذف الشارة"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Award Emblem Dialog */}
      <Dialog open={awardDialogOpen} onOpenChange={setAwardDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-right">منح الشارة لمستخدم</DialogTitle>
            <DialogDescription className="text-right text-base mt-2">
              أدخل الرمز التعريفي للمستخدم الذي تريد منحه الشارة. سيتم إضافة النقاط المرتبطة بالشارة تلقائياً.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-3">
              <Label htmlFor="user-code" className="text-right block text-base font-medium">الرمز التعريفي للمستخدم</Label>
              <Input
                id="user-code"
                value={userCode}
                onChange={(e) => setUserCode(e.target.value)}
                placeholder="أدخل الرمز التعريفي للمستخدم"
                className="text-right"
              />
            </div>
          </div>
          <DialogFooter className="gap-3 mt-2">
            <Button variant="outline" onClick={() => setAwardDialogOpen(false)} className="text-base">
              إلغاء
            </Button>
            <Button 
              type="submit" 
              onClick={handleAwardSubmit}
              disabled={isSubmitting}
              className="text-base"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                  جاري المنح...
                </>
              ) : (
                "منح الشارة"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 