"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { 
  Pencil, 
  Trash, 
  UserX, 
  Shield, 
  MoreVertical, 
  Search, 
  RefreshCw, 
  Copy,
  Award,
  FileText,
  Clock,
  Info
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  getAllUsers, 
  updateUser, 
  banUser,
  deleteUser,
  approveUser,
  updateUserPoints,
  linkTeacherSubject
} from "@/lib/actions/admin"
import { syncUserPointsBalance } from "@/lib/actions/update-points-balance"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"

// Define interfaces for user types
interface User {
  id: string
  full_name: string
  email: string | null
  role_id: number
  user_code: string
  is_banned?: boolean
  ban_until?: string | null
  is_confirmed?: boolean
  points?: number
  subjects?: Array<{id: number, name: string}>
}

// Define Subject interface
interface Subject {
  id: number
  name: string
  description?: string
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [subjects, setSubjects] = useState<Subject[]>([])
  
  // Edit user dialogs
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editName, setEditName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editUserCode, setEditUserCode] = useState("")
  
  // Ban user dialog
  const [banDialogOpen, setBanDialogOpen] = useState(false)
  const [banUserId, setBanUserId] = useState<string | null>(null)
  const [banDuration, setBanDuration] = useState("1d")
  const [permanentBan, setPermanentBan] = useState(false)
  
  // Points dialog
  const [pointsDialogOpen, setPointsDialogOpen] = useState(false)
  const [pointsUserId, setPointsUserId] = useState<string | null>(null)
  const [pointsAmount, setPointsAmount] = useState(0)
  
  // Delete user dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)
  
  // Teacher-subject dialog
  const [teacherDialogOpen, setTeacherDialogOpen] = useState(false)
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([])
  
  // User Details Sheet
  const [userDetailsOpen, setUserDetailsOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userActivity, setUserActivity] = useState<any[]>([])
  const [loadingActivity, setLoadingActivity] = useState(false)
  
  // Sort state
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
  // Leaderboard
  const [showLeaderboard, setShowLeaderboard] = useState(true)
  
  // User details dialog
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  
  // Fetch users on component mount
  useEffect(() => {
    fetchUsers()
    
    // Close other dropdown menus when a new one is opened
    const handleClickOutside = (event: MouseEvent) => {
      const isDropdownButton = (event.target as Element).closest('[role="menuitem"]');
      if (!isDropdownButton) {
        // Close all dropdowns when clicking outside
        document.querySelectorAll('[role="menu"]').forEach(menu => {
          if (menu.getAttribute('data-state') === 'open') {
            // Find the associated trigger and simulate a click to close it
            const id = menu.id;
            const trigger = document.querySelector(`[aria-controls="${id}"]`);
            if (trigger) {
              (trigger as HTMLElement).click();
            }
          }
        });
      }
    };
    
    // Fix focus issues when switching tabs or returning to the window
    const handleFocusReset = () => {
      // Reset focus to the document body when window regains focus
      if (document.activeElement?.tagName === 'BODY') {
        document.body.setAttribute('tabindex', '-1');
        document.body.focus();
        document.body.removeAttribute('tabindex');
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('focus', handleFocusReset);
    window.addEventListener('blur', handleFocusReset);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('focus', handleFocusReset);
      window.removeEventListener('blur', handleFocusReset);
    };
  }, [])
  
  const fetchUsers = async () => {
    setLoading(true)
    try {
      const result = await getAllUsers()
      if (result.success && result.data) {
        setUsers(result.data.users)
        setSubjects(result.data.subjects || [])
      } else {
        toast({
          variant: "destructive",
          title: "خطأ في جلب المستخدمين",
          description: result.error || "حدث خطأ أثناء جلب بيانات المستخدمين",
        })
      }
    } catch (error) {
      console.error("Error fetching users:", error)
      toast({
        variant: "destructive",
        title: "خطأ غير متوقع",
        description: "حدث خطأ أثناء جلب بيانات المستخدمين",
      })
    } finally {
      setLoading(false)
    }
  }
  
  // Filter users based on search term and active tab
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      user.user_code.toLowerCase().includes(searchTerm.toLowerCase())
      
    if (activeTab === "all") return matchesSearch
    if (activeTab === "students") return matchesSearch && user.role_id === 1
    if (activeTab === "parents") return matchesSearch && user.role_id === 2
    if (activeTab === "teachers") return matchesSearch && user.role_id === 3
    if (activeTab === "admins") return matchesSearch && user.role_id === 4
    if (activeTab === "pending") return matchesSearch && !user.is_confirmed
    if (activeTab === "banned") return matchesSearch && user.is_banned
    
    return matchesSearch
  })
  
  // Open edit dialog
  const handleEditClick = (user: User) => {
    setEditingUser(user)
    setEditName(user.full_name)
    setEditEmail(user.email || "")
    setEditUserCode(user.user_code)
    setEditDialogOpen(true)
  }
  
  // Handle edit user submission
  const handleEditSubmit = async () => {
    if (!editingUser) return
    
    try {
      const result = await updateUser(
        editingUser.id, 
        editName, 
        editEmail, 
        editUserCode
      )
      
      if (result.success) {
        toast({
          title: "تم تحديث المستخدم",
          description: "تم تحديث بيانات المستخدم بنجاح",
        })
        
        // Update user in local state
        setUsers(users.map(user => 
          user.id === editingUser.id 
            ? { ...user, full_name: editName, email: editEmail, user_code: editUserCode }
            : user
        ))
        
        setEditDialogOpen(false)
      } else {
        toast({
          variant: "destructive",
          title: "خطأ في تحديث المستخدم",
          description: result.error || "حدث خطأ أثناء تحديث بيانات المستخدم",
        })
      }
    } catch (error) {
      console.error("Error updating user:", error)
      toast({
        variant: "destructive",
        title: "خطأ غير متوقع",
        description: "حدث خطأ أثناء تحديث بيانات المستخدم",
      })
    }
  }
  
  // Handle ban user
  const handleBanClick = (userId: string) => {
    setBanUserId(userId)
    setPermanentBan(false)
    setBanDuration("1d")
    setBanDialogOpen(true)
  }
  
  // Handle ban submit button
  const handleBanSubmit = async () => {
    if (!banUserId) return
    
    try {
      let duration = permanentBan ? null : banDuration
      
      const result = await banUser(banUserId, duration)
      
      if (result.success) {
        toast({
          title: "تم حظر المستخدم",
          description: permanentBan 
            ? "تم حظر المستخدم بشكل دائم" 
            : `تم حظر المستخدم حتى ${result.data?.banUntil ? new Date(result.data.banUntil).toLocaleString('ar-EG') : 'غير محدد'}`,
        })
        
        // Update user in local state
        setUsers(users.map(user => 
          user.id === banUserId 
            ? { ...user, is_banned: true, ban_until: result.data?.banUntil || null }
            : user
        ))
        
        setBanDialogOpen(false)
      } else {
        toast({
          variant: "destructive",
          title: "خطأ في حظر المستخدم",
          description: result.error || "حدث خطأ أثناء حظر المستخدم",
        })
      }
    } catch (error) {
      console.error("Error banning user:", error)
      toast({
        variant: "destructive",
        title: "خطأ غير متوقع",
        description: "حدث خطأ أثناء حظر المستخدم",
      })
    }
  }
  
  // Handle delete user
  const handleDeleteClick = (userId: string) => {
    setDeleteUserId(userId)
    setDeleteDialogOpen(true)
  }
  
  const handleDeleteSubmit = async () => {
    if (!deleteUserId) return
    
    try {
      const result = await deleteUser(deleteUserId)
      
      if (result.success) {
        toast({
          title: "تم حذف المستخدم",
          description: "تم حذف المستخدم بنجاح",
        })
        
        // Remove user from local state
        setUsers(users.filter(user => user.id !== deleteUserId))
        setDeleteDialogOpen(false)
      } else {
        toast({
          variant: "destructive",
          title: "خطأ في حذف المستخدم",
          description: result.error || "حدث خطأ أثناء حذف المستخدم",
        })
      }
    } catch (error) {
      console.error("Error deleting user:", error)
      toast({
        variant: "destructive",
        title: "خطأ غير متوقع",
        description: "حدث خطأ أثناء حذف المستخدم",
      })
    }
  }
  
  // Handle user approval
  const handleApproveUser = async (userId: string) => {
    try {
      const result = await approveUser(userId)
      
      if (result.success) {
        toast({
          title: "تم تأكيد المستخدم",
          description: "تم تأكيد حساب المستخدم بنجاح",
        })
        
        // Update user in local state
        setUsers(users.map(user => 
          user.id === userId ? { ...user, is_confirmed: true } : user
        ))
      } else {
        toast({
          variant: "destructive",
          title: "خطأ في تأكيد المستخدم",
          description: result.error || "حدث خطأ أثناء تأكيد حساب المستخدم",
        })
      }
    } catch (error) {
      console.error("Error approving user:", error)
      toast({
        variant: "destructive",
        title: "خطأ غير متوقع",
        description: "حدث خطأ أثناء تأكيد حساب المستخدم",
      })
    }
  }
  
  // Handle points modification
  const handlePointsClick = (userId: string) => {
    setPointsUserId(userId)
    setPointsAmount(0)
    setPointsDialogOpen(true)
  }
  
  const handlePointsSubmit = async () => {
    if (!pointsUserId) return
    
    try {
      const result = await updateUserPoints(pointsUserId, pointsAmount)
      
      if (result.success) {
        toast({
          title: "تم تحديث النقاط",
          description: pointsAmount >= 0 
            ? `تم إضافة ${pointsAmount} نقطة للمستخدم` 
            : `تم خصم ${Math.abs(pointsAmount)} نقطة من المستخدم`,
        })
        
        // Update user in local state
        setUsers(users.map(user => 
          user.id === pointsUserId 
            ? { ...user, points: result.data?.points || 0 }
            : user
        ))
        
        setPointsDialogOpen(false)
      } else {
        toast({
          variant: "destructive",
          title: "خطأ في تحديث النقاط",
          description: result.error || "حدث خطأ أثناء تحديث نقاط المستخدم",
        })
      }
    } catch (error) {
      console.error("Error updating points:", error)
      toast({
        variant: "destructive",
        title: "خطأ غير متوقع",
        description: "حدث خطأ أثناء تحديث نقاط المستخدم",
      })
    }
  }
  
  // Handle syncing user points balance
  const handleSyncPoints = async () => {
    if (!pointsUserId) return
    
    try {
      const result = await syncUserPointsBalance(pointsUserId)
      
      if (result.success) {
        toast({
          title: "تم مزامنة النقاط",
          description: result.message || `تم تحديث رصيد النقاط بنجاح (${result.data?.points} نقطة)`,
        })
        
        // Update user in local state
        setUsers(users.map(user => 
          user.id === pointsUserId 
            ? { ...user, points: result.data?.points || 0 }
            : user
        ))
        
        setPointsDialogOpen(false)
      } else {
        toast({
          variant: "destructive",
          title: "خطأ في مزامنة النقاط",
          description: result.message || "حدث خطأ أثناء مزامنة نقاط المستخدم",
        })
      }
    } catch (error) {
      console.error("Error syncing points:", error)
      toast({
        variant: "destructive",
        title: "خطأ غير متوقع",
        description: "حدث خطأ أثناء مزامنة نقاط المستخدم",
      })
    }
  }
  
  // Handle teacher-subject linking
  const handleTeacherSubjectClick = (userId: string) => {
    setTeacherId(userId)
    const teacher = users.find(u => u.id === userId)
    setSelectedSubjects(teacher?.subjects?.map(s => s.id) || [])
    setTeacherDialogOpen(true)
  }
  
  const handleTeacherSubjectSubmit = async () => {
    if (!teacherId) return
    
    try {
      const result = await linkTeacherSubject(teacherId, selectedSubjects)
      
      if (result.success) {
        toast({
          title: "تم ربط المعلم بالمواد الدراسية",
          description: "تم ربط المعلم بالمواد الدراسية بنجاح",
        })
        
        // Update teacher in local state
        // We'll need to refresh to get the updated subjects
        fetchUsers()
        
        setTeacherDialogOpen(false)
      } else {
        toast({
          variant: "destructive",
          title: "خطأ في ربط المعلم بالمواد الدراسية",
          description: result.error || "حدث خطأ أثناء ربط المعلم بالمواد الدراسية",
        })
      }
    } catch (error) {
      console.error("Error linking teacher with subjects:", error)
      toast({
        variant: "destructive",
        title: "خطأ غير متوقع",
        description: "حدث خطأ أثناء ربط المعلم بالمواد الدراسية",
      })
    }
  }
  
  // Toggle a subject selection for teacher
  const toggleSubjectSelection = (subjectId: number) => {
    setSelectedSubjects(prev => {
      if (prev.includes(subjectId)) {
        return prev.filter(id => id !== subjectId)
    } else {
        return [...prev, subjectId]
    }
    })
  }
  
  const getRoleName = (roleId: number) => {
    switch (roleId) {
      case 1: return "طالب"
      case 2: return "ولي أمر"
      case 3: return "معلم"
      case 4: return "مدير"
      default: return "غير معروف"
    }
  }
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "تم النسخ",
      description: "تم نسخ النص إلى الحافظة",
    })
  }
  
  // Open user details sheet
  const handleViewDetails = async (user: User) => {
    setSelectedUser(user)
    setUserDetailsOpen(true)
    setLoadingActivity(true)
    
    try {
      // Here you would fetch user activity logs
      // This is a placeholder - implement actual API call
      setTimeout(() => {
        setUserActivity([
          { type: 'login', timestamp: new Date().toISOString(), details: 'User logged in' },
          { type: 'action', timestamp: new Date(Date.now() - 86400000).toISOString(), details: 'Changed password' }
        ])
        setLoadingActivity(false)
      }, 500)
    } catch (error) {
      console.error("Error fetching user activity:", error)
      setLoadingActivity(false)
    }
  }
  
  // Handle sort click
  const handleSortClick = (field: string) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // Set new field and reset to ascending
      setSortField(field)
      setSortDirection('asc')
    }
  }
  
  // Sort users
  const sortedUsers = React.useMemo(() => {
    if (!sortField) return filteredUsers
    
    return [...filteredUsers].sort((a, b) => {
      let valueA = a[sortField as keyof User]
      let valueB = b[sortField as keyof User]
      
      // Handle undefined/null values
      if (valueA === undefined || valueA === null) valueA = sortDirection === 'asc' ? '' : 'zzz'
      if (valueB === undefined || valueB === null) valueB = sortDirection === 'asc' ? '' : 'zzz'
      
      // Compare values
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return sortDirection === 'asc' 
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA)
      } else {
        // For numbers and other types
        return sortDirection === 'asc'
          ? Number(valueA) - Number(valueB)
          : Number(valueB) - Number(valueA)
      }
    })
  }, [filteredUsers, sortField, sortDirection])
  
  // Get top 5 users by points
  const topUsers = React.useMemo(() => {
    return [...users]
      .filter(user => user.points && user.points > 0)
      .sort((a, b) => (b.points || 0) - (a.points || 0))
      .slice(0, 5)
  }, [users])
  
  // Helper for sorting UI
  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? '↑' : '↓'
  }
  
  // Handle user details already defined as handleViewDetails
  
  return (
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">إدارة المستخدمين</h1>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المستخدمين</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground">جميع المستخدمين المسجلين في النظام</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">المستخدمين في انتظار التأكيد</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.filter(u => !u.is_confirmed).length}</div>
              <p className="text-xs text-muted-foreground">الحسابات التي تحتاج إلى موافقة</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">المستخدمين المحظورين</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.filter(u => u.is_banned).length}</div>
              <p className="text-xs text-muted-foreground">الحسابات المحظورة حالياً</p>
            </CardContent>
          </Card>
        </div>
      
      {showLeaderboard && topUsers.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">قائمة المتصدرين (أعلى النقاط)</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowLeaderboard(false)}>إخفاء</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topUsers.map((user, index) => (
                <div key={user.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      index === 0 ? 'bg-yellow-100 text-yellow-800' : 
                      index === 1 ? 'bg-gray-100 text-gray-800' : 
                      index === 2 ? 'bg-amber-100 text-amber-800' : 
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="font-medium">{user.full_name}</span>
                    <span className="text-xs text-muted-foreground">({getRoleName(user.role_id)})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Award className="h-4 w-4 text-amber-500" />
                    <span className="font-bold">{user.points || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
        
        <div className="mb-6 flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex items-center gap-2 w-full md:w-1/2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="البحث بالاسم، البريد الإلكتروني، أو الرمز التعريفي" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
        
        <div className="flex gap-2">
          <Button 
            variant="secondary" 
            onClick={() => {
              // Reset focus state and any open elements
              document.body.click();
              document.body.focus();
              // Remove any stale focus traps
              document.querySelectorAll('[data-focus-trap]').forEach(el => {
                if (el.parentElement) el.parentElement.removeChild(el);
              });
              toast({
                title: "تم إصلاح الواجهة",
                description: "تم إعادة تعيين حالة التركيز في الواجهة",
              });
            }}
            className="self-end"
          >
            إصلاح الواجهة
          </Button>
          
          <Button 
            variant="outline" 
            size="icon" 
            onClick={fetchUsers}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        </div>
        
      <Tabs defaultValue="all" value={activeTab} onValueChange={(value) => {
        setActiveTab(value);
        // Reset focus to the page container after tab change
        setTimeout(() => {
          const container = document.querySelector('.container');
          if (container) {
            (container as HTMLElement).setAttribute('tabindex', '-1');
            (container as HTMLElement).focus();
            (container as HTMLElement).removeAttribute('tabindex');
          }
        }, 0);
      }} className="w-full">
          <TabsList className="w-full mb-6 grid grid-cols-4 md:grid-cols-7">
            <TabsTrigger value="all">الكل</TabsTrigger>
            <TabsTrigger value="students">الطلاب</TabsTrigger>
            <TabsTrigger value="teachers">المعلمين</TabsTrigger>
            <TabsTrigger value="parents">أولياء الأمور</TabsTrigger>
            <TabsTrigger value="admins">المدراء</TabsTrigger>
            <TabsTrigger value="pending">في الانتظار</TabsTrigger>
            <TabsTrigger value="banned">المحظورين</TabsTrigger>
          </TabsList>
          
          <Card>
            <CardContent className="p-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                    <TableHead onClick={() => handleSortClick('full_name')} className="cursor-pointer hover:bg-muted/50">
                      الاسم الكامل {sortField === 'full_name' && <SortIcon field="full_name" />}
                    </TableHead>
                    <TableHead onClick={() => handleSortClick('email')} className="cursor-pointer hover:bg-muted/50">
                      البريد الإلكتروني {sortField === 'email' && <SortIcon field="email" />}
                    </TableHead>
                    <TableHead onClick={() => handleSortClick('role_id')} className="cursor-pointer hover:bg-muted/50">
                      الدور {sortField === 'role_id' && <SortIcon field="role_id" />}
                    </TableHead>
                      <TableHead>الرمز التعريفي</TableHead>
                    <TableHead onClick={() => handleSortClick('points')} className="cursor-pointer hover:bg-muted/50">
                      النقاط {sortField === 'points' && <SortIcon field="points" />}
                    </TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10">
                          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                          <p>جاري تحميل البيانات...</p>
                        </TableCell>
                      </TableRow>
                  ) : sortedUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10">
                          <p>لا يوجد مستخدمين متطابقين مع معايير البحث</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                    sortedUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.full_name}</TableCell>
                          <TableCell>{user.email || "-"}</TableCell>
                          <TableCell>{getRoleName(user.role_id)}</TableCell>
                          <TableCell className="flex items-center gap-1">
                            {user.user_code}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(user.user_code)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="font-bold">{user.points || 0}</span>
                            {(user.points ?? 0) > 0 && <Award className="h-3 w-3 text-amber-500" />}
                          </div>
                        </TableCell>
                          <TableCell>
                            {user.is_banned ? (
                              <span className="text-red-500 bg-red-100 px-2 py-1 rounded-full text-xs">
                                محظور
                              </span>
                            ) : !user.is_confirmed ? (
                              <span className="text-amber-500 bg-amber-100 px-2 py-1 rounded-full text-xs">
                                في انتظار التأكيد
                              </span>
                            ) : (
                              <span className="text-green-500 bg-green-100 px-2 py-1 rounded-full text-xs">
                                نشط
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuItem onClick={() => {
                                setSelectedUser(user);
                                setDetailsDialogOpen(true);
                              }}>
                                <Info className="h-4 w-4 mr-2 text-purple-500" />
                                عرض التفاصيل
                              </DropdownMenuItem>
                              
                                <DropdownMenuItem onClick={() => handleEditClick(user)}>
                                <Pencil className="h-4 w-4 mr-2 text-blue-500" />
                                تعديل بيانات المستخدم
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem onClick={() => handlePointsClick(user.id)}>
                                <Award className="h-4 w-4 mr-2 text-amber-500" />
                                تعديل رصيد النقاط
                                </DropdownMenuItem>
                                
                                {!user.is_confirmed && (
                                  <DropdownMenuItem onClick={() => handleApproveUser(user.id)}>
                                  <Shield className="h-4 w-4 mr-2 text-green-500" />
                                    تأكيد الحساب
                                  </DropdownMenuItem>
                                )}
                                
                                {user.role_id === 3 && (
                                  <DropdownMenuItem onClick={() => handleTeacherSubjectClick(user.id)}>
                                  <Pencil className="h-4 w-4 mr-2 text-purple-500" />
                                    ربط بالمواد الدراسية
                                  </DropdownMenuItem>
                                )}
                                
                                <DropdownMenuItem 
                                  onClick={() => handleBanClick(user.id)}
                                className="text-orange-600"
                                >
                                <UserX className="h-4 w-4 mr-2 text-orange-600" />
                                حظر مؤقت للمستخدم
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteClick(user.id)}
                                  className="text-red-600"
                                >
                                <Trash className="h-4 w-4 mr-2 text-red-600" />
                                حذف المستخدم نهائياً
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
        </Tabs>
      
      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open);
        if (!open) {
          // Short timeout to ensure focus is properly released
          setTimeout(() => document.body.focus(), 0);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل بيانات المستخدم</DialogTitle>
            <DialogDescription>
              قم بتعديل البيانات الشخصية للمستخدم
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="full-name">الاسم الكامل</Label>
              <Input
                id="full-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="أدخل الاسم الكامل"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="أدخل البريد الإلكتروني"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="user-code">الرمز التعريفي</Label>
              <Input
                id="user-code"
                value={editUserCode}
                onChange={(e) => setEditUserCode(e.target.value)}
                placeholder="أدخل الرمز التعريفي"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" onClick={handleEditSubmit}>
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Ban User Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={(open) => {
        setBanDialogOpen(open);
        if (!open) {
          setTimeout(() => document.body.focus(), 0);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-orange-600 flex items-center gap-2">
              <UserX className="h-5 w-5" />
              حظر المستخدم مؤقتاً
            </DialogTitle>
            <DialogDescription>
              <div className="my-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800">
                <span className="font-bold block mb-1">⚠️ تنبيه</span>
                سيتم منع المستخدم من الوصول إلى حسابه أثناء فترة الحظر. تأكد من أن هذا الإجراء ضروري.
              </div>
              اختر مدة الحظر للمستخدم:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Checkbox 
                id="permanent-ban" 
                checked={permanentBan} 
                onCheckedChange={(checked) => setPermanentBan(checked === true)}
              />
              <Label htmlFor="permanent-ban">حظر دائم</Label>
            </div>
            
            {!permanentBan && (
              <div className="space-y-2">
                <Label htmlFor="ban-duration">مدة الحظر</Label>
                <Select value={banDuration} onValueChange={setBanDuration}>
                  <SelectTrigger id="ban-duration">
                    <SelectValue placeholder="اختر مدة الحظر" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">ساعة واحدة</SelectItem>
                    <SelectItem value="1d">يوم واحد</SelectItem>
                    <SelectItem value="3d">ثلاثة أيام</SelectItem>
                    <SelectItem value="7d">أسبوع</SelectItem>
                    <SelectItem value="30d">شهر</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
              إلغاء
            </Button>
            <Button 
              type="submit" 
              onClick={handleBanSubmit}
              variant="destructive"
              className="bg-orange-600 hover:bg-orange-700"
            >
              تأكيد الحظر
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete User Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
        setDeleteDialogOpen(open);
        if (!open) {
          setTimeout(() => document.body.focus(), 0);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash className="h-5 w-5" />
              حذف المستخدم
            </DialogTitle>
            <DialogDescription>
              <div className="my-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-800">
                <span className="font-bold block mb-1">❗ تحذير</span>
                هل أنت متأكد من رغبتك في حذف هذا المستخدم؟ هذا الإجراء لا يمكن التراجع عنه وسيتم حذف جميع بيانات المستخدم بشكل نهائي.
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              إلغاء
            </Button>
            <Button 
              type="submit" 
              onClick={handleDeleteSubmit}
              variant="destructive"
            >
              حذف المستخدم نهائياً
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Points Dialog */}
      <Dialog open={pointsDialogOpen} onOpenChange={(open) => {
        setPointsDialogOpen(open);
        if (!open) {
          setTimeout(() => document.body.focus(), 0);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              تعديل رصيد النقاط
            </DialogTitle>
            <DialogDescription>
              قم بإدخال عدد النقاط التي تريد إضافتها أو خصمها من المستخدم
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="points-amount">عدد النقاط</Label>
              <Input
                id="points-amount"
                type="number"
                value={pointsAmount}
                onChange={(e) => setPointsAmount(Number(e.target.value))}
                placeholder="أدخل عدد النقاط (قيمة سالبة للخصم)"
              />
              <p className="text-sm text-muted-foreground">
                استخدم قيمة موجبة لإضافة نقاط وقيمة سالبة لخصم نقاط
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPointsDialogOpen(false)}>
              إلغاء
            </Button>
            <Button 
              variant="secondary"
              onClick={handleSyncPoints}
              className="mx-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              مزامنة الرصيد
            </Button>
            <Button 
              type="submit" 
              onClick={handlePointsSubmit}
              variant="default"
            >
              تأكيد التعديل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* User Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={(open) => {
        setDetailsDialogOpen(open);
        if (!open) {
          setTimeout(() => document.body.focus(), 0);
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-purple-600 flex items-center gap-2">
              <Info className="h-5 w-5" />
              تفاصيل المستخدم
            </DialogTitle>
            <DialogDescription>
              معلومات مفصلة عن المستخدم وحسابه
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">البيانات الشخصية</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="font-medium">الاسم الكامل:</div>
                  <div>{selectedUser.full_name}</div>
                  
                  <div className="font-medium">البريد الإلكتروني:</div>
                  <div>{selectedUser.email || "-"}</div>
                  
                  <div className="font-medium">الرمز التعريفي:</div>
                  <div>{selectedUser.user_code}</div>
                  
                  <div className="font-medium">الدور:</div>
                  <div>{getRoleName(selectedUser.role_id)}</div>
                  
                  <div className="font-medium">النقاط:</div>
                  <div className="font-semibold text-green-600">{selectedUser.points || 0}</div>
                  
                  <div className="font-medium">الحالة:</div>
                  <div>
                    {selectedUser.is_banned ? (
                      <span className="text-red-500 bg-red-100 px-2 py-1 rounded-full text-xs">
                        محظور
                      </span>
                    ) : !selectedUser.is_confirmed ? (
                      <span className="text-amber-500 bg-amber-100 px-2 py-1 rounded-full text-xs">
                        في انتظار التأكيد
                      </span>
                    ) : (
                      <span className="text-green-500 bg-green-100 px-2 py-1 rounded-full text-xs">
                        نشط
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <h3 className="text-lg font-semibold mb-2">سجل النشاط</h3>
                <div className="text-sm text-muted-foreground">
                  سيتم قريباً إضافة سجل النشاط للمستخدم (تسجيلات الدخول، الطلبات، آخر نشاط)
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              إغلاق
            </Button>
            <Button onClick={() => handleEditClick(selectedUser!)}>
              <Pencil className="h-4 w-4 mr-2" />
              تعديل البيانات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Teacher Subject Dialog */}
      <Dialog open={teacherDialogOpen} onOpenChange={(open) => {
        setTeacherDialogOpen(open);
        if (!open) {
          setTimeout(() => document.body.focus(), 0);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ربط المعلم بالمواد الدراسية</DialogTitle>
            <DialogDescription>
              اختر المواد الدراسية التي يدرسها هذا المعلم
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              {subjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  لا توجد مواد دراسية مضافة. قم بإضافة مواد دراسية أولاً.
                </p>
              ) : (
                subjects.map((subject) => (
                  <div key={subject.id} className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox 
                      id={`subject-${subject.id}`} 
                      checked={selectedSubjects.includes(subject.id)} 
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedSubjects([...selectedSubjects, subject.id])
                        } else {
                          setSelectedSubjects(selectedSubjects.filter(id => id !== subject.id))
                        }
                      }}
                    />
                    <Label htmlFor={`subject-${subject.id}`}>{subject.name}</Label>
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTeacherDialogOpen(false)}>
              إلغاء
            </Button>
            <Button 
              type="submit" 
              onClick={handleTeacherSubjectSubmit}
              disabled={subjects.length === 0}
            >
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 