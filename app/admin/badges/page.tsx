"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { addBadge, updateBadge, deleteBadge, getBadges } from "@/lib/actions/admin"
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
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"
import {   Loader2,   Medal,   Pencil,   Trash2,   Plus,   AlertTriangle,  MoreVertical,  User,  Search} from "lucide-react"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  RefreshCw,
  Award
} from "lucide-react"

interface Badge {
  id: number
  name: string
  description: string | null
  image_url: string | null
  min_points: number
  max_points: number
  badge_type: string
  created_at?: string
}

export default function AdminBadgesPage() {
  const supabase = createClient()
  const [badges, setBadges] = useState<Badge[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingBadge, setEditingBadge] = useState<Badge | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<Omit<Badge, 'id' | 'created_at'>>({
    name: "",
    description: "",
    image_url: "",
    min_points: 100,
    max_points: 999,
    badge_type: "level"
  })
  const [users, setUsers] = useState<{id: string, full_name: string, user_code: string, role_id: number}[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  // Add badge dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newBadgeName, setNewBadgeName] = useState("")
  const [newBadgeDescription, setNewBadgeDescription] = useState("")
  const [newBadgeImageUrl, setNewBadgeImageUrl] = useState("")
  const [newBadgeMinPoints, setNewBadgeMinPoints] = useState(0)
  const [newBadgeMaxPoints, setNewBadgeMaxPoints] = useState(1000)
  const [newBadgeType, setNewBadgeType] = useState("achievement")

  // Edit badge dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editImageUrl, setEditImageUrl] = useState("")
  const [editMinPoints, setEditMinPoints] = useState(0)
  const [editMaxPoints, setEditMaxPoints] = useState(1000)
  const [editBadgeType, setEditBadgeType] = useState("achievement")

  // Award badge dialog
  const [awardDialogOpen, setAwardDialogOpen] = useState(false)
  const [awardingBadge, setAwardingBadge] = useState<Badge | null>(null)
  const [selectedUserId, setSelectedUserId] = useState("")
  const [awardLoading, setAwardLoading] = useState(false)

  // Delete badge dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteBadgeId, setDeleteBadgeId] = useState<number | null>(null)

  const fetchBadges = async () => {
    try {
      setIsLoading(true)
      
      const result = await getBadges()
      
      if (!result.success) {
        throw new Error(result.error || "حدث خطأ أثناء جلب الشارات")
      }
      
      // Convert any points_threshold to min_points if needed
      const formattedData = result.data?.map((badge: any) => {
        // Handle legacy data
        if ('points_threshold' in badge && !('min_points' in badge)) {
          return {
            ...badge,
            min_points: badge.points_threshold,
            max_points: badge.max_points || 99999
          };
        }
        return badge;
      }) || [];
      
      setBadges(formattedData as Badge[])
    } catch (error: any) {
      console.error("Error fetching badges:", error)
      toast({
        title: "خطأ في تحميل البيانات",
        description: error.message || "حدث خطأ أثناء تحميل الشارات",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
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

  useEffect(() => {
    fetchBadges()
    fetchUsers()
  }, [])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === "min_points" || name === "max_points" ? Number(value) : value
    }))
  }

  const handleSelectChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      if (!formData.name || formData.min_points < 0 || formData.max_points < formData.min_points) {
        throw new Error("جميع الحقول المطلوبة وأن تكون النقاط القصوى أكبر من الحد الأدنى")
      }
      
      if (editingBadge) {
        // Update existing badge using admin action
        const result = await updateBadge(
          editingBadge.id,
          formData.name,
          formData.description,
          formData.image_url,
          formData.min_points,
          formData.max_points,
          formData.badge_type
        )
        
        if (!result.success) {
          throw new Error(result.message || "حدث خطأ أثناء تحديث الشارة")
        }
        
        toast({
          title: "تم تحديث الشارة",
          description: "تم تحديث الشارة بنجاح"
        })
      } else {
        // Create new badge using admin action
        const result = await addBadge(
          formData.name,
          formData.description,
          formData.image_url,
          formData.min_points,
          formData.max_points,
          formData.badge_type
        )
        
        if (!result.success) {
          throw new Error(result.message || "حدث خطأ أثناء إنشاء الشارة")
        }
        
        toast({
          title: "تم إنشاء الشارة",
          description: "تم إنشاء الشارة بنجاح"
        })
      }
      
      // Reset form and refresh data
      resetForm()
      fetchBadges()
      setIsDialogOpen(false)
    } catch (error: any) {
      console.error("Error in badge operation:", error)
      toast({
        title: "خطأ في العملية",
        description: error.message || "حدث خطأ أثناء حفظ الشارة",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleEdit = (badge: Badge) => {
    setEditingBadge(badge)
    setFormData({
      name: badge.name,
      description: badge.description || "",
      image_url: badge.image_url || "",
      min_points: badge.min_points,
      max_points: badge.max_points || 999,
      badge_type: badge.badge_type
    })
    setIsDialogOpen(true)
  }
  
  const handleDelete = async (id: number) => {
    try {
      const result = await deleteBadge(id)
      
      if (!result.success) {
        throw new Error(result.message || "حدث خطأ أثناء حذف الشارة")
      }
      
      toast({
        title: "تم حذف الشارة",
        description: "تم حذف الشارة بنجاح"
      })
      
      fetchBadges()
    } catch (error: any) {
      console.error("Error deleting badge:", error)
      toast({
        title: "خطأ في الحذف",
        description: error.message || "حدث خطأ أثناء حذف الشارة",
        variant: "destructive",
      })
    }
  }
  
  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      image_url: "",
      min_points: 100,
      max_points: 999,
      badge_type: "level"
    })
    setEditingBadge(null)
  }
  
  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) resetForm()
  }

  // Filter badges based on search term
  const filteredBadges = badges.filter(badge => 
    badge.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (badge.description && badge.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Handle award badge
  const handleAwardClick = (badge: Badge) => {
    setAwardingBadge(badge)
    setSelectedUserId("")
    setAwardDialogOpen(true)
  }

  const handleAwardSubmit = async () => {
    if (!awardingBadge || !selectedUserId) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "يرجى اختيار المستخدم",
      })
      return
    }
    
    setAwardLoading(true)
    try {
      const response = await fetch('/api/badges/award', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          badgeId: awardingBadge.id,
          userId: selectedUserId
        }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast({
          title: "تم منح الشارة",
          description: "تم منح الشارة بنجاح للمستخدم",
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
      console.error("Error awarding badge:", error)
      toast({
        variant: "destructive",
        title: "خطأ غير متوقع",
        description: "حدث خطأ أثناء منح الشارة للمستخدم",
      })
    } finally {
      setAwardLoading(false)
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

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 text-center">
        <Loader2 className="h-10 w-10 animate-spin mx-auto" />
        <p className="mt-4 text-base">جاري تحميل البيانات...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-right">إدارة الشارات</h1>
      
      <div className="mb-8 flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex items-center gap-3 w-full md:w-1/2 relative">
          <Search className="h-5 w-5 text-muted-foreground absolute right-3" />
          <Input 
            placeholder="البحث عن الشارات..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 text-right"
          />
        </div>
        
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={fetchBadges}
            disabled={isLoading}
            className="h-10 w-10"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <RefreshCw className="h-5 w-5" />
            )}
          </Button>
          
          <Button 
            onClick={() => setIsDialogOpen(true)}
            className="h-10"
          >
            <Plus className="h-5 w-5 ml-2" />
            إضافة شارة
          </Button>
        </div>
      </div>
      
      <Card className="shadow-md">
        <CardContent className="p-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-right font-bold py-4 px-6 text-base">الشارة</TableHead>
                  <TableHead className="text-right font-bold py-4 px-6 text-base">الاسم</TableHead>
                  <TableHead className="text-right font-bold py-4 px-6 text-base">الوصف</TableHead>
                  <TableHead className="text-center font-bold py-4 px-6 text-base">النقاط المطلوبة</TableHead>
                  <TableHead className="text-right font-bold py-4 px-6 text-base">النوع</TableHead>
                  <TableHead className="text-center font-bold py-4 px-6 text-base w-[120px]">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                      <p className="text-base">جاري تحميل البيانات...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredBadges.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <p className="text-base">لا توجد شارات متطابقة مع معايير البحث</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBadges.map((badge) => (
                    <TableRow key={badge.id}>
                      <TableCell className="py-4 px-6">
                        {badge.image_url ? (
                          <img 
                            src={badge.image_url} 
                            alt={badge.name} 
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                            <Award className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-base text-right py-4 px-6">{badge.name}</TableCell>
                      <TableCell className="text-right py-4 px-6 text-base">{badge.description || "-"}</TableCell>
                      <TableCell className="text-center py-4 px-6 text-base">{badge.min_points}</TableCell>
                      <TableCell className="text-right py-4 px-6 text-base">
                        {badge.badge_type === "achievement" && "إنجاز"}
                        {badge.badge_type === "attendance" && "حضور"}
                        {badge.badge_type === "behavior" && "سلوك"}
                        {badge.badge_type === "academic" && "أكاديمي"}
                        {!badge.badge_type && "-"}
                      </TableCell>
                      <TableCell className="text-center py-4 px-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9">
                              <MoreVertical className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[200px]">
                            <DropdownMenuItem onClick={() => handleAwardClick(badge)} className="text-base py-3">
                              <User className="h-5 w-5 ml-3" />
                              منح الشارة لمستخدم
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(badge)} className="text-base py-3">
                              <Pencil className="h-5 w-5 ml-3" />
                              تعديل الشارة
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(badge.id)}
                              className="text-red-600 text-base py-3"
                            >
                              <Trash2 className="h-5 w-5 ml-3" />
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
      
      {/* Award Badge Dialog */}
      <Dialog open={awardDialogOpen} onOpenChange={setAwardDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-right">منح الشارة لمستخدم</DialogTitle>
            <DialogDescription className="text-right text-base mt-2">
              اختر المستخدم الذي تريد منحه الشارة "{awardingBadge?.name}"
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
              onClick={handleAwardSubmit} 
              disabled={awardLoading || !selectedUserId}
              className="text-base"
            >
              {awardLoading ? (
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

      {/* Add/Edit Badge Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-right">
              {editingBadge ? "تعديل الشارة" : "إضافة شارة جديدة"}
            </DialogTitle>
            <DialogDescription className="text-right text-base mt-2">
              {editingBadge 
                ? "قم بتعديل معلومات الشارة" 
                : "أدخل معلومات الشارة الجديدة"}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-5 py-4">
            <div className="space-y-3">
              <Label htmlFor="name" className="text-right block text-base font-medium">اسم الشارة</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="text-right"
                placeholder="أدخل اسم الشارة"
              />
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="description" className="text-right block text-base font-medium">وصف الشارة (اختياري)</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description || ""}
                onChange={handleChange}
                className="text-right"
                placeholder="أدخل وصف الشارة"
                rows={3}
              />
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="image_url" className="text-right block text-base font-medium">رابط الصورة (اختياري)</Label>
              <Input
                id="image_url"
                name="image_url"
                value={formData.image_url || ""}
                onChange={handleChange}
                className="text-right"
                placeholder="أدخل رابط صورة الشارة"
              />
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="min_points" className="text-right block text-base font-medium">الحد الأدنى للنقاط</Label>
              <Input
                id="min_points"
                name="min_points"
                type="number"
                value={formData.min_points}
                onChange={handleChange}
                className="text-right"
                min={0}
              />
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="max_points" className="text-right block text-base font-medium">الحد الأقصى للنقاط</Label>
              <Input
                id="max_points"
                name="max_points"
                type="number"
                value={formData.max_points}
                onChange={handleChange}
                className="text-right"
                min={1}
              />
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="badge_type" className="text-right block text-base font-medium">نوع الشارة</Label>
              <Select
                value={formData.badge_type}
                onValueChange={(value) => handleSelectChange("badge_type", value)}
              >
                <SelectTrigger className="text-right" id="badge_type">
                  <SelectValue placeholder="اختر نوع الشارة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="achievement">إنجاز</SelectItem>
                  <SelectItem value="attendance">حضور</SelectItem>
                  <SelectItem value="behavior">سلوك</SelectItem>
                  <SelectItem value="academic">أكاديمي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <DialogFooter className="gap-3 mt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => handleDialogOpenChange(false)}
                className="text-base"
              >
                إلغاء
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="text-base"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                    {editingBadge ? "جاري التحديث..." : "جاري الإضافة..."}
                  </>
                ) : (
                  editingBadge ? "حفظ التغييرات" : "إضافة الشارة"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
} 