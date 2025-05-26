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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { 
  Pencil, 
  Trash, 
  MoreVertical, 
  PlusCircle,
  RefreshCw,
  Search,
  Medal,
  ImagePlus,
  Loader2,
  User
} from "lucide-react"
import { getMedals, addMedal, updateMedal, deleteMedal, awardMedalToUser } from "@/lib/actions/admin"
import { showActionSuccessToast, showActionErrorToast, showErrorToast } from "@/lib/utils/toast-messages"
import { createClient } from "@/lib/supabase/client"

interface Medal {
  id: number
  name: string
  description: string | null
  image_url: string | null
  min_points: number
  max_points: number
  created_at: string
}

interface UserData {
  id: string
  full_name: string
  user_code: string
  role_id: number
}

export default function MedalsManagementPage() {
  const supabase = createClient()
  const [medals, setMedals] = useState<Medal[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  
  // Add medal dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newMedalName, setNewMedalName] = useState("")
  const [newMedalDescription, setNewMedalDescription] = useState("")
  const [newMedalImageUrl, setNewMedalImageUrl] = useState("")
  const [newMedalPointsRequired, setNewMedalPointsRequired] = useState(100)
  const [newMedalMaxPoints, setNewMedalMaxPoints] = useState(999)
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Edit medal dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingMedal, setEditingMedal] = useState<Medal | null>(null)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editImageUrl, setEditImageUrl] = useState("")
  const [editPointsRequired, setEditPointsRequired] = useState(0)
  const [editMaxPoints, setEditMaxPoints] = useState(0)
  
  // Delete medal dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteMedalId, setDeleteMedalId] = useState<number | null>(null)
  
  // Award medal dialog
  const [awardDialogOpen, setAwardDialogOpen] = useState(false)
  const [awardMedalId, setAwardMedalId] = useState<number | null>(null)
  const [selectedUserId, setSelectedUserId] = useState("")
  const [users, setUsers] = useState<UserData[]>([])
  
  // Fetch medals on component mount
  useEffect(() => {
    fetchMedals()
    fetchUsers()
  }, [])
  
  const fetchMedals = async () => {
    setLoading(true)
    try {
      const result = await getMedals()
      if (result.success && result.data) {
        // Properly standardize the data format
        const formattedData = result.data.map((medal: any) => {
          // Create a standard medal object with default values for all fields
          const standardMedal: Medal = {
            id: medal.id,
            name: medal.name || "",
            description: medal.description || null,
            image_url: medal.image_url || null,
            min_points: 0,
            max_points: 99999,
            created_at: medal.created_at || new Date().toISOString()
          };
          
          // Handle legacy data - 'points_required' vs 'min_points'
          if ('points_required' in medal && medal.points_required !== null) {
            standardMedal.min_points = medal.points_required;
          } else if ('min_points' in medal && medal.min_points !== null) {
            standardMedal.min_points = medal.min_points;
          }
          
          // Handle max_points field
          if ('max_points' in medal && medal.max_points !== null) {
            standardMedal.max_points = medal.max_points;
          }
          
          return standardMedal;
        });
        
        setMedals(formattedData as Medal[]);
      } else {
        showErrorToast(
          "خطأ في جلب الميداليات",
          result.error || "حدث خطأ أثناء جلب بيانات الميداليات"
        )
      }
    } catch (error) {
      console.error("Error fetching medals:", error)
      showErrorToast(
        "خطأ غير متوقع",
        "حدث خطأ أثناء جلب بيانات الميداليات"
      )
    } finally {
      setLoading(false)
    }
  }
  
  const fetchUsers = async () => {
    try {
      // Get the current user ID from supabase
      const { data: { session } } = await supabase.auth.getSession()
      const currentUserId = session?.user?.id
      
      if (!currentUserId) {
        console.error("No user ID available")
        return
      }
      
      const result = await fetch(`/api/users?excludeId=${currentUserId}`)
      const data = await result.json()
      
      if (data.success) {
        setUsers(data.data || [])
      } else {
        console.error("Error fetching users:", data.error)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }
  
  // Filter medals based on search term
  const filteredMedals = medals.filter(medal => 
    medal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (medal.description && medal.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )
  
  // Add validation function
  const validateMedalForm = (
    name: string, 
    minPoints: number, 
    maxPoints: number
  ): {isValid: boolean, errors: {[key: string]: string}} => {
    const errors: {[key: string]: string} = {};
    
    // Validate name
    if (!name.trim()) {
      errors.name = "يرجى إدخال اسم الميدالية";
    }
    
    // Validate min points
    if (isNaN(minPoints) || minPoints < 0) {
      errors.minPoints = "يجب أن يكون الحد الأدنى للنقاط رقمًا صحيحًا موجبًا";
    }
    
    // Validate max points
    if (isNaN(maxPoints) || maxPoints <= 0) {
      errors.maxPoints = "يجب أن يكون الحد الأقصى للنقاط رقمًا صحيحًا موجبًا";
    }
    
    // Validate range
    if (!errors.minPoints && !errors.maxPoints && minPoints >= maxPoints) {
      errors.range = "يجب أن يكون الحد الأدنى للنقاط أقل من الحد الأقصى";
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
  
  // Handle add medal
  const handleAddSubmit = async () => {
    setIsSubmitting(true);
    setFormErrors({});
    
    // Validate form
    const { isValid, errors } = validateMedalForm(
      newMedalName,
      newMedalPointsRequired,
      newMedalMaxPoints
    );
    
    if (!isValid) {
      setFormErrors(errors);
      setIsSubmitting(false);
      return;
    }
    
    try {
      const result = await addMedal(
        newMedalName, 
        newMedalDescription,
        newMedalImageUrl,
        newMedalPointsRequired,
        newMedalMaxPoints
      )
      
      if (result.success) {
        showActionSuccessToast("إضافة الميدالية")
        
        // Add the new medal to the list
        if (result.data) {
          setMedals([...medals, result.data])
        } else {
          // Refresh the list if we don't have the new data
          fetchMedals()
        }
        
        // Reset form and close dialog
        setNewMedalName("")
        setNewMedalDescription("")
        setNewMedalImageUrl("")
        setNewMedalPointsRequired(100)
        setNewMedalMaxPoints(999)
        setAddDialogOpen(false)
      } else {
        showActionErrorToast(
          "إضافة الميدالية", 
          result.error || "حدث خطأ أثناء إضافة الميدالية"
        )
      }
    } catch (error) {
      console.error("Error adding medal:", error)
      showActionErrorToast(
        "إضافة الميدالية", 
        "حدث خطأ غير متوقع أثناء إضافة الميدالية"
      )
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Handle edit medal
  const handleEditClick = (medal: Medal) => {
    setEditingMedal(medal)
    setEditName(medal.name)
    setEditDescription(medal.description || "")
    setEditImageUrl(medal.image_url || "")
    setEditPointsRequired(medal.min_points)
    setEditMaxPoints(medal.max_points)
    setFormErrors({})
    setEditDialogOpen(true)
  }
  
  const handleEditSubmit = async () => {
    if (!editingMedal) return;
    
    setIsSubmitting(true)
    setFormErrors({})
    
    // Validate form
    const { isValid, errors } = validateMedalForm(
      editName,
      editPointsRequired,
      editMaxPoints
    );
    
    if (!isValid) {
      setFormErrors(errors);
      setIsSubmitting(false);
      return;
    }
    
    try {
      const result = await updateMedal(
        editingMedal.id,
        editName,
        editDescription,
        editImageUrl,
        editPointsRequired,
        editMaxPoints
      )
      
      if (result.success) {
        showActionSuccessToast("تعديل الميدالية")
        
        // Update the medal in the list
        const updatedMedals = medals.map(medal => 
          medal.id === editingMedal.id 
            ? { 
                ...medal, 
                name: editName, 
                description: editDescription,
                image_url: editImageUrl,
                min_points: editPointsRequired,
                max_points: editMaxPoints
              } 
            : medal
        )
        
        setMedals(updatedMedals)
        setEditDialogOpen(false)
      } else {
        showActionErrorToast(
          "تعديل الميدالية", 
          result.error || "حدث خطأ أثناء تعديل الميدالية"
        )
      }
    } catch (error) {
      console.error("Error updating medal:", error)
      showActionErrorToast(
        "تعديل الميدالية", 
        "حدث خطأ غير متوقع أثناء تعديل الميدالية"
      )
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Handle delete medal
  const handleDeleteClick = (medalId: number) => {
    setDeleteMedalId(medalId)
    setDeleteDialogOpen(true)
  }
  
  const handleDeleteSubmit = async () => {
    if (!deleteMedalId) return
    
    setIsSubmitting(true)
    
    try {
      const result = await deleteMedal(deleteMedalId)
      
      if (result.success) {
        showActionSuccessToast("حذف الميدالية")
        
        // Remove the medal from the list
        const updatedMedals = medals.filter(medal => medal.id !== deleteMedalId)
        setMedals(updatedMedals)
        
        setDeleteDialogOpen(false)
      } else {
        showActionErrorToast(
          "حذف الميدالية", 
          result.error || "حدث خطأ أثناء حذف الميدالية"
        )
      }
    } catch (error) {
      console.error("Error deleting medal:", error)
      showActionErrorToast(
        "حذف الميدالية", 
        "حدث خطأ غير متوقع أثناء حذف الميدالية"
      )
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Handle award medal
  const handleAwardClick = (medalId: number) => {
    setAwardMedalId(medalId)
    setSelectedUserId("")
    setAwardDialogOpen(true)
  }
  
  const handleAwardSubmit = async () => {
    if (!awardMedalId || !selectedUserId) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "يرجى اختيار المستخدم",
      })
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // Find the user code from the selected user ID
      const selectedUser = users.find(user => user.id === selectedUserId)
      if (!selectedUser) {
        throw new Error("لم يتم العثور على المستخدم المحدد")
      }
      
      const result = await awardMedalToUser(awardMedalId, selectedUser.user_code)
      
      if (result.success) {
        showActionSuccessToast("منح الميدالية")
        setAwardDialogOpen(false)
      } else {
        showActionErrorToast(
          "منح الميدالية", 
          result.error || "حدث خطأ أثناء منح الميدالية للمستخدم"
        )
      }
    } catch (error) {
      console.error("Error awarding medal:", error)
      showActionErrorToast(
        "منح الميدالية", 
        "حدث خطأ غير متوقع أثناء منح الميدالية للمستخدم"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get role name
  const getRoleName = (roleId: number) => {
    switch (roleId) {
      case 1: return "طالب"
      case 2: return "ولي أمر"
      case 3: return "معلم"
      case 4: return "مدير"
      default: return "غير معروف"
    }
  }
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-right">إدارة الميداليات</h1>
      
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card className="shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-right">إجمالي الميداليات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-right mb-2">{medals.length}</div>
            <p className="text-sm text-muted-foreground text-right">الميداليات المسجلة في النظام</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="mb-8 flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex items-center gap-3 w-full md:w-1/2 relative">
          <Search className="h-5 w-5 text-muted-foreground absolute right-3" />
            <Input
            placeholder="البحث باسم الميدالية أو الوصف" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 text-right"
            />
          </div>
          
        <div className="flex gap-3">
            <Button 
              variant="outline"
              size="icon"
              onClick={fetchMedals}
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
            إضافة ميدالية جديدة
            </Button>
          </div>
        </div>
        
      <Card className="shadow-md">
        <CardContent className="p-6">
          <div className="rounded-md border">
              <Table>
                <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-right font-bold py-4 px-6 text-base">الاسم</TableHead>
                  <TableHead className="text-right font-bold py-4 px-6 text-base">الوصف</TableHead>
                  <TableHead className="text-center font-bold py-4 px-6 text-base">الحد الأدنى للنقاط</TableHead>
                  <TableHead className="text-center font-bold py-4 px-6 text-base">الحد الأقصى للنقاط</TableHead>
                  <TableHead className="text-center font-bold py-4 px-6 text-base w-[120px]">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="flex justify-center items-center flex-col">
                        <Loader2 className="h-8 w-8 animate-spin mb-4 text-muted-foreground" />
                        <span className="text-base">جاري التحميل...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredMedals.length === 0 ? (
                    <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <p className="text-base">لا توجد ميداليات متاحة</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMedals.map((medal) => (
                      <TableRow key={medal.id}>
                      <TableCell className="font-medium text-base text-right py-4 px-6">{medal.name}</TableCell>
                      <TableCell className="text-right py-4 px-6 text-base">{medal.description || "-"}</TableCell>
                      <TableCell className="text-center py-4 px-6 text-base">{medal.min_points}</TableCell>
                      <TableCell className="text-center py-4 px-6 text-base">{medal.max_points}</TableCell>
                      <TableCell className="text-center py-4 px-6">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9">
                              <MoreVertical className="h-5 w-5" />
                              </Button>
                            </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[200px]">
                            <DropdownMenuItem onClick={() => handleEditClick(medal)} className="text-base py-3">
                              <Pencil className="h-5 w-5 ml-3" />
                              تعديل الميدالية
                              </DropdownMenuItem>
                              
                            <DropdownMenuItem onClick={() => handleAwardClick(medal.id)} className="text-base py-3">
                              <Medal className="h-5 w-5 ml-3" />
                              منح الميدالية لمستخدم
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem 
                                onClick={() => handleDeleteClick(medal.id)}
                              className="text-red-600 text-base py-3"
                              >
                              <Trash className="h-5 w-5 ml-3" />
                              حذف الميدالية
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
      
      {/* Add Medal Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-right">إضافة ميدالية جديدة</DialogTitle>
            <DialogDescription className="text-right text-base mt-2">
              أضف ميدالية جديدة للنظام. سيتم منح الميدالية للمستخدمين الذين يحققون متطلباتها.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-3">
              <Label htmlFor="name" className="text-right block text-base font-medium">اسم الميدالية</Label>
              <Input
                id="name"
                value={newMedalName}
                onChange={(e) => setNewMedalName(e.target.value)}
                className={`text-right ${formErrors.name ? "border-red-500" : ""}`}
                placeholder="أدخل اسم الميدالية"
              />
              {formErrors.name && (
                <p className="text-sm text-red-500 text-right">{formErrors.name}</p>
              )}
            </div>
            <div className="space-y-3">
              <Label htmlFor="description" className="text-right block text-base font-medium">وصف الميدالية</Label>
              <Textarea
                id="description"
                value={newMedalDescription}
                onChange={(e) => setNewMedalDescription(e.target.value)}
                className="text-right"
                placeholder="أدخل وصفاً للميدالية"
                rows={3}
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="imageUrl" className="text-right block text-base font-medium">رابط الصورة</Label>
              <Input
                id="imageUrl"
                value={newMedalImageUrl}
                onChange={(e) => setNewMedalImageUrl(e.target.value)}
                placeholder="https://example.com/image.png"
                className="text-right"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="minPoints" className="text-right block text-base font-medium">الحد الأدنى للنقاط</Label>
              <Input
                id="minPoints"
                type="number"
                min="0"
                value={newMedalPointsRequired}
                onChange={(e) => setNewMedalPointsRequired(parseInt(e.target.value) || 0)}
                className={`text-right ${formErrors.minPoints || formErrors.range ? "border-red-500" : ""}`}
              />
              {formErrors.minPoints && (
                <p className="text-sm text-red-500 text-right">{formErrors.minPoints}</p>
              )}
            </div>
            <div className="space-y-3">
              <Label htmlFor="maxPoints" className="text-right block text-base font-medium">الحد الأقصى للنقاط</Label>
              <Input
                id="maxPoints"
                type="number"
                min="1"
                value={newMedalMaxPoints}
                onChange={(e) => setNewMedalMaxPoints(parseInt(e.target.value) || 0)}
                className={`text-right ${formErrors.maxPoints || formErrors.range ? "border-red-500" : ""}`}
              />
              {formErrors.maxPoints && (
                <p className="text-sm text-red-500 text-right">{formErrors.maxPoints}</p>
              )}
            </div>
            {formErrors.range && (
              <p className="text-sm text-red-500 text-right">{formErrors.range}</p>
            )}
          </div>
          <DialogFooter className="gap-3 mt-2">
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} className="text-base">
              إلغاء
            </Button>
            <Button onClick={handleAddSubmit} disabled={isSubmitting} className="text-base">
              {isSubmitting ? (
                <>
                  <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                  جاري الإضافة...
                </>
              ) : (
                "إضافة"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Medal Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-right">تعديل الميدالية</DialogTitle>
            <DialogDescription className="text-right text-base mt-2">
              قم بتعديل تفاصيل الميدالية.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-3">
              <Label htmlFor="edit-name" className="text-right block text-base font-medium">اسم الميدالية</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className={`text-right ${formErrors.name ? "border-red-500" : ""}`}
                placeholder="أدخل اسم الميدالية"
              />
              {formErrors.name && (
                <p className="text-sm text-red-500 text-right">{formErrors.name}</p>
              )}
            </div>
            <div className="space-y-3">
              <Label htmlFor="edit-description" className="text-right block text-base font-medium">وصف الميدالية</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="text-right"
                placeholder="أدخل وصفاً للميدالية"
                rows={3}
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="edit-imageUrl" className="text-right block text-base font-medium">رابط الصورة</Label>
              <Input
                id="edit-imageUrl"
                value={editImageUrl}
                onChange={(e) => setEditImageUrl(e.target.value)}
                placeholder="https://example.com/image.png"
                className="text-right"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="edit-minPoints" className="text-right block text-base font-medium">الحد الأدنى للنقاط</Label>
              <Input
                id="edit-minPoints"
                type="number"
                min="0"
                value={editPointsRequired}
                onChange={(e) => setEditPointsRequired(parseInt(e.target.value) || 0)}
                className={`text-right ${formErrors.minPoints || formErrors.range ? "border-red-500" : ""}`}
              />
              {formErrors.minPoints && (
                <p className="text-sm text-red-500 text-right">{formErrors.minPoints}</p>
              )}
            </div>
            <div className="space-y-3">
              <Label htmlFor="edit-maxPoints" className="text-right block text-base font-medium">الحد الأقصى للنقاط</Label>
              <Input
                id="edit-maxPoints"
                type="number"
                min="1"
                value={editMaxPoints}
                onChange={(e) => setEditMaxPoints(parseInt(e.target.value) || 0)}
                className={`text-right ${formErrors.maxPoints || formErrors.range ? "border-red-500" : ""}`}
              />
              {formErrors.maxPoints && (
                <p className="text-sm text-red-500 text-right">{formErrors.maxPoints}</p>
              )}
            </div>
            {formErrors.range && (
              <p className="text-sm text-red-500 text-right">{formErrors.range}</p>
            )}
          </div>
          <DialogFooter className="gap-3 mt-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="text-base">
              إلغاء
            </Button>
            <Button onClick={handleEditSubmit} disabled={isSubmitting} className="text-base">
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
      
      {/* Delete Medal Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-right">حذف الميدالية</DialogTitle>
            <DialogDescription className="text-right text-base mt-2">
              هل أنت متأكد من رغبتك في حذف هذه الميدالية؟ لن يمكن التراجع عن هذا الإجراء.
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
                "حذف الميدالية"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Award Medal Dialog */}
      <Dialog open={awardDialogOpen} onOpenChange={setAwardDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-right">منح الميدالية لمستخدم</DialogTitle>
            <DialogDescription className="text-right text-base mt-2">
              اختر المستخدم الذي تريد منحه الميدالية
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-3">
              <Label htmlFor="user" className="text-right block text-base font-medium">المستخدم</Label>
              <Select 
                value={selectedUserId} 
                onValueChange={setSelectedUserId}
              >
                <SelectTrigger className="text-right">
                  <SelectValue placeholder="اختر المستخدم" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name} - ({getRoleName(user.role_id)}) - {user.user_code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-3 mt-2">
            <Button variant="outline" onClick={() => setAwardDialogOpen(false)} className="text-base">
              إلغاء
            </Button>
            <Button 
              type="submit" 
              onClick={handleAwardSubmit}
              disabled={isSubmitting || !selectedUserId}
              className="text-base"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                  جاري المنح...
                </>
              ) : (
                "منح الميدالية"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 