"use client"

import { useState, useEffect } from "react"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
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
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { Award, Edit, Trash2, Loader2, PlusCircle } from "lucide-react"
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { getAllTiers } from "@/lib/actions/tiers"
import { 
  createTier, 
  updateTier, 
  deleteTier,
  createLevel,
  updateLevel,
  deleteLevel
} from "@/lib/actions/tiers/admin"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"

export default function AdminTiersPage() {
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [tiers, setTiers] = useState<any[]>([])
  
  // Dialog states
  const [tierDialogOpen, setTierDialogOpen] = useState(false)
  const [levelDialogOpen, setLevelDialogOpen] = useState(false)
  
  // Form states
  const [editingTier, setEditingTier] = useState<any>(null)
  const [selectedTier, setSelectedTier] = useState<any>(null)
  const [editingLevel, setEditingLevel] = useState<any>(null)
  
  // Form fields
  const [tierName, setTierName] = useState('')
  const [tierDescription, setTierDescription] = useState('')
  const [tierMinPoints, setTierMinPoints] = useState('')
  const [tierMaxPoints, setTierMaxPoints] = useState('')
  const [tierColor, setTierColor] = useState('')
  
  const [levelName, setLevelName] = useState('')
  const [levelNumber, setLevelNumber] = useState('')
  const [levelDescription, setLevelDescription] = useState('')
  const [levelMinPoints, setLevelMinPoints] = useState('')
  const [levelMaxPoints, setLevelMaxPoints] = useState('')
  const [levelRewardPoints, setLevelRewardPoints] = useState('')
  
  // Add these state variables for confirmation dialogs
  const [deleteTierDialogOpen, setDeleteTierDialogOpen] = useState(false)
  const [deleteLevelDialogOpen, setDeleteLevelDialogOpen] = useState(false)
  const [tierToDelete, setTierToDelete] = useState<number | null>(null)
  const [levelToDelete, setLevelToDelete] = useState<number | null>(null)
  
  useEffect(() => {
    fetchTiers()
  }, [])
  
  const fetchTiers = async () => {
    setLoading(true)
    try {
      const result = await getAllTiers()
      if (result.success && result.data) {
        setTiers(result.data)
      } else {
        toast({
          title: "خطأ",
          description: result.message || "حدث خطأ أثناء جلب بيانات الطبقات",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error fetching tiers:", error)
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء جلب بيانات الطبقات",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }
  
  // Tier dialog handlers
  const openTierDialog = (tier?: any) => {
    if (tier) {
      // Edit mode
      setEditingTier(tier)
      setTierName(tier.name)
      setTierDescription(tier.description || '')
      setTierMinPoints(tier.min_points.toString())
      setTierMaxPoints(tier.max_points.toString())
      setTierColor(tier.color || '')
    } else {
      // Add mode
      setEditingTier(null)
      setTierName('')
      setTierDescription('')
      setTierMinPoints('')
      setTierMaxPoints('')
      setTierColor('')
    }
    setTierDialogOpen(true)
  }
  
  const handleTierSubmit = async () => {
    try {
      // Validate
      if (!tierName.trim()) {
        toast({
          title: "خطأ",
          description: "يرجى إدخال اسم الطبقة",
          variant: "destructive"
        })
        return
      }
      
      if (!tierMinPoints || !tierMaxPoints) {
        toast({
          title: "خطأ",
          description: "يرجى إدخال نطاق النقاط",
          variant: "destructive"
        })
        return
      }
      
      const minPoints = parseInt(tierMinPoints)
      const maxPoints = parseInt(tierMaxPoints)
      
      if (isNaN(minPoints) || isNaN(maxPoints)) {
        toast({
          title: "خطأ",
          description: "يرجى إدخال أرقام صحيحة للنقاط",
          variant: "destructive"
        })
        return
      }
      
      if (minPoints >= maxPoints) {
        toast({
          title: "خطأ",
          description: "يجب أن يكون الحد الأدنى للنقاط أقل من الحد الأقصى",
          variant: "destructive"
        })
        return
      }
      
      let result
      
      if (editingTier) {
        // Update
        result = await updateTier(
          editingTier.id,
          tierName,
          tierDescription || null,
          minPoints,
          maxPoints,
          tierColor || null
        )
      } else {
        // Create
        result = await createTier(
          tierName,
          tierDescription || null,
          minPoints,
          maxPoints,
          tierColor || null
        )
      }
      
      if (result.success) {
        toast({
          title: "تم بنجاح",
          description: result.message || (editingTier ? "تم تحديث الطبقة بنجاح" : "تم إنشاء الطبقة بنجاح"),
        })
        setTierDialogOpen(false)
        fetchTiers()
      } else {
        toast({
          title: "خطأ",
          description: result.message || "حدث خطأ أثناء حفظ الطبقة",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error saving tier:", error)
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ الطبقة",
        variant: "destructive"
      })
    }
  }
  
  const handleDeleteTier = async (tierId: number) => {
    setTierToDelete(tierId)
    setDeleteTierDialogOpen(true)
  }
  
  const confirmDeleteTier = async () => {
    if (!tierToDelete) return;
    
    try {
      const result = await deleteTier(tierToDelete)
      
      if (result.success) {
        toast({
          title: "تم بنجاح",
          description: result.message || "تم حذف الطبقة بنجاح"
        })
        fetchTiers()
      } else {
        toast({
          title: "خطأ",
          description: result.message || "حدث خطأ أثناء حذف الطبقة",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error deleting tier:", error)
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف الطبقة",
        variant: "destructive"
      })
    } finally {
      setDeleteTierDialogOpen(false)
    }
  }
  
  // Level dialog handlers
  const openLevelDialog = (tier: any, level?: any) => {
    setSelectedTier(tier)
    
    if (level) {
      // Edit mode
      setEditingLevel(level)
      setLevelName(level.name)
      setLevelNumber(level.level_number.toString())
      setLevelDescription(level.description || '')
      setLevelMinPoints(level.min_points.toString())
      setLevelMaxPoints(level.max_points.toString())
      setLevelRewardPoints(level.reward_points.toString())
    } else {
      // Add mode
      setEditingLevel(null)
      setLevelName('')
      setLevelNumber('')
      setLevelDescription('')
      setLevelMinPoints('')
      setLevelMaxPoints('')
      setLevelRewardPoints('0')
    }
    setLevelDialogOpen(true)
  }
  
  const handleLevelSubmit = async () => {
    try {
      // Validate
      if (!levelName.trim()) {
        toast({
          title: "خطأ",
          description: "يرجى إدخال اسم المستوى",
          variant: "destructive"
        })
        return
      }
      
      if (!levelNumber.trim()) {
        toast({
          title: "خطأ",
          description: "يرجى إدخال رقم المستوى",
          variant: "destructive"
        })
        return
      }
      
      if (!levelMinPoints || !levelMaxPoints) {
        toast({
          title: "خطأ",
          description: "يرجى إدخال نطاق النقاط",
          variant: "destructive"
        })
        return
      }
      
      const lvlNumber = parseInt(levelNumber)
      const minPoints = parseInt(levelMinPoints)
      const maxPoints = parseInt(levelMaxPoints)
      const rewardPoints = parseInt(levelRewardPoints || '0')
      
      if (isNaN(lvlNumber) || isNaN(minPoints) || isNaN(maxPoints) || isNaN(rewardPoints)) {
        toast({
          title: "خطأ",
          description: "يرجى إدخال أرقام صحيحة",
          variant: "destructive"
        })
        return
      }
      
      if (minPoints >= maxPoints) {
        toast({
          title: "خطأ",
          description: "يجب أن يكون الحد الأدنى للنقاط أقل من الحد الأقصى",
          variant: "destructive"
        })
        return
      }
      
      let result
      
      if (editingLevel) {
        // Update
        result = await updateLevel(
          editingLevel.id,
          selectedTier.id,
          levelName,
          lvlNumber,
          levelDescription || null,
          minPoints,
          maxPoints,
          rewardPoints
        )
      } else {
        // Create
        result = await createLevel(
          selectedTier.id,
          levelName,
          lvlNumber,
          levelDescription || null,
          minPoints,
          maxPoints,
          rewardPoints
        )
      }
      
      if (result.success) {
        toast({
          title: "تم بنجاح",
          description: result.message || (editingLevel ? "تم تحديث المستوى بنجاح" : "تم إنشاء المستوى بنجاح"),
        })
        setLevelDialogOpen(false)
        fetchTiers()
      } else {
        toast({
          title: "خطأ",
          description: result.message || "حدث خطأ أثناء حفظ المستوى",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error saving level:", error)
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ المستوى",
        variant: "destructive"
      })
    }
  }
  
  const handleDeleteLevel = async (levelId: number) => {
    setLevelToDelete(levelId)
    setDeleteLevelDialogOpen(true)
  }
  
  const confirmDeleteLevel = async () => {
    if (!levelToDelete) return;
    
    try {
      const result = await deleteLevel(levelToDelete)
      
      if (result.success) {
        toast({
          title: "تم بنجاح",
          description: result.message || "تم حذف المستوى بنجاح"
        })
        fetchTiers()
      } else {
        toast({
          title: "خطأ",
          description: result.message || "حدث خطأ أثناء حذف المستوى",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error deleting level:", error)
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف المستوى",
        variant: "destructive"
      })
    } finally {
      setDeleteLevelDialogOpen(false)
    }
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">إدارة الطبقات والمستويات</h1>
        <Button onClick={() => openTierDialog()}>
          إضافة طبقة جديدة <PlusCircle className="mr-2 h-4 w-4" />
        </Button>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>جاري التحميل...</span>
        </div>
      ) : tiers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <Award className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-center text-muted-foreground">
              لا توجد طبقات بعد. أضف طبقة جديدة للبدء.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible className="space-y-4">
          {tiers.map((tier) => (
            <AccordionItem 
              key={tier.id} 
              value={`tier-${tier.id}`} 
              className="border rounded-lg shadow-sm overflow-hidden"
              style={{ borderRight: `4px solid ${tier.color || '#888888'}` }}
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center">
                    <div 
                      className="w-6 h-6 rounded-full ml-3" 
                      style={{ backgroundColor: tier.color || '#888888' }}
                    />
                    <span className="text-lg font-bold">{tier.name}</span>
                  </div>
                  <span className="text-sm bg-muted/30 rounded-full px-3 py-1">
                    {tier.min_points} - {tier.max_points} نقطة
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 py-4">
                <div className="grid gap-4">
                  <div className="flex justify-between items-start border-b pb-4">
                    <div>
                      <h3 className="text-xl font-bold">{tier.name}</h3>
                      {tier.description && (
                        <p className="text-sm text-muted-foreground mt-1">{tier.description}</p>
                      )}
                      <div className="flex items-center mt-3 bg-muted/20 p-2 rounded-md">
                        <span className="text-sm font-medium">النقاط:</span>
                        <span className="text-sm font-bold mx-2 text-primary">{tier.min_points}</span>
                        <span className="text-sm">-</span>
                        <span className="text-sm font-bold mx-2 text-primary">{tier.max_points}</span>
                        <span className="text-sm">نقطة</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={(e) => {
                          e.stopPropagation()
                          openTierDialog(tier)
                        }}
                      >
                        <Edit className="h-4 w-4 ml-1" />
                        تعديل
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteTier(tier.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4 ml-1" />
                        حذف
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-3 border-b pb-2">
                      <h4 className="font-semibold text-lg">المستويات</h4>
                      <Button 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation()
                          openLevelDialog(tier)
                        }}
                      >
                        إضافة مستوى <PlusCircle className="mr-2 h-3 w-3" />
                      </Button>
                    </div>
                    
                    {tier.levels && tier.levels.length > 0 ? (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader className="bg-muted/70">
                            <TableRow>
                              <TableHead className="w-12 text-center font-bold">الرقم</TableHead>
                              <TableHead className="text-right font-bold">الاسم</TableHead>
                              <TableHead className="text-right font-bold">النقاط</TableHead>
                              <TableHead className="text-right font-bold">مكافأة الترقية</TableHead>
                              <TableHead className="w-20 text-center">الإجراءات</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tier.levels
                              .sort((a: any, b: any) => a.level_number - b.level_number)
                              .map((level: any, index: number) => (
                                <TableRow 
                                  key={level.id}
                                  className={index % 2 === 0 ? "bg-white" : "bg-muted/20"}
                                >
                                  <TableCell className="text-center font-medium">{level.level_number}</TableCell>
                                  <TableCell className="text-right font-semibold">{level.name}</TableCell>
                                  <TableCell className="text-right">{level.min_points} - {level.max_points} نقطة</TableCell>
                                  <TableCell className="text-right font-medium text-primary">{level.reward_points} نقطة</TableCell>
                                  <TableCell>
                                    <div className="flex justify-center gap-2">
                                      <Button 
                                        size="icon" 
                                        variant="ghost"
                                        onClick={() => openLevelDialog(tier, level)}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => handleDeleteLevel(level.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8 border rounded-md bg-muted/20">
                        <p className="text-sm text-muted-foreground">لا توجد مستويات لهذه الطبقة</p>
                      </div>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
      
      {/* Tier Dialog */}
      <Dialog open={tierDialogOpen} onOpenChange={setTierDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTier ? 'تعديل الطبقة' : 'إضافة طبقة جديدة'}</DialogTitle>
            <DialogDescription>
              أدخل معلومات الطبقة ونطاق النقاط المطلوب
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="tier-name">اسم الطبقة</Label>
              <Input
                id="tier-name"
                value={tierName}
                onChange={(e) => setTierName(e.target.value)}
                placeholder="مثال: الطبقة الذهبية"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="tier-description">وصف الطبقة</Label>
              <Textarea
                id="tier-description"
                value={tierDescription}
                onChange={(e) => setTierDescription(e.target.value)}
                placeholder="وصف اختياري للطبقة"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="tier-min-points">الحد الأدنى للنقاط</Label>
                <Input
                  id="tier-min-points"
                  type="number"
                  value={tierMinPoints}
                  onChange={(e) => setTierMinPoints(e.target.value)}
                  placeholder="1000"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="tier-max-points">الحد الأقصى للنقاط</Label>
                <Input
                  id="tier-max-points"
                  type="number"
                  value={tierMaxPoints}
                  onChange={(e) => setTierMaxPoints(e.target.value)}
                  placeholder="2999"
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="tier-color">لون الطبقة (اختياري)</Label>
              <div className="flex gap-2">
                <Input
                  id="tier-color"
                  value={tierColor}
                  onChange={(e) => setTierColor(e.target.value)}
                  placeholder="#FFD700"
                />
                <div 
                  className="w-10 h-10 rounded border"
                  style={{ backgroundColor: tierColor || '#888888' }}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTierDialogOpen(false)}>
              إلغاء
            </Button>
            <Button type="button" onClick={handleTierSubmit}>
              {editingTier ? 'تحديث' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Level Dialog */}
      <Dialog open={levelDialogOpen} onOpenChange={setLevelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLevel ? 'تعديل مستوى' : 'إضافة مستوى جديد'}
              {selectedTier && ` في ${selectedTier.name}`}
            </DialogTitle>
            <DialogDescription>
              أدخل معلومات المستوى ونطاق النقاط
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="level-name">اسم المستوى</Label>
                <Input
                  id="level-name"
                  value={levelName}
                  onChange={(e) => setLevelName(e.target.value)}
                  placeholder="مثال: المستوى الثاني"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="level-number">رقم المستوى</Label>
                <Input
                  id="level-number"
                  type="number"
                  value={levelNumber}
                  onChange={(e) => setLevelNumber(e.target.value)}
                  placeholder="2"
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="level-description">وصف المستوى</Label>
              <Textarea
                id="level-description"
                value={levelDescription}
                onChange={(e) => setLevelDescription(e.target.value)}
                placeholder="وصف اختياري للمستوى"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="level-min-points">الحد الأدنى للنقاط</Label>
                <Input
                  id="level-min-points"
                  type="number"
                  value={levelMinPoints}
                  onChange={(e) => setLevelMinPoints(e.target.value)}
                  placeholder="1000"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="level-max-points">الحد الأقصى للنقاط</Label>
                <Input
                  id="level-max-points"
                  type="number"
                  value={levelMaxPoints}
                  onChange={(e) => setLevelMaxPoints(e.target.value)}
                  placeholder="1499"
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="level-reward-points">
                نقاط المكافأة عند الترقية لهذا المستوى
              </Label>
              <Input
                id="level-reward-points"
                type="number"
                value={levelRewardPoints}
                onChange={(e) => setLevelRewardPoints(e.target.value)}
                placeholder="50"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLevelDialogOpen(false)}>
              إلغاء
            </Button>
            <Button type="button" onClick={handleLevelSubmit}>
              {editingLevel ? 'تحديث' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add confirmation dialogs at the bottom of the component */}
      <ConfirmationDialog
        open={deleteTierDialogOpen}
        onOpenChange={setDeleteTierDialogOpen}
        title="حذف الطبقة"
        description="هل أنت متأكد من حذف هذه الطبقة؟ سيتم حذف جميع المستويات التابعة لها."
        confirmText="حذف"
        onConfirm={confirmDeleteTier}
        variant="destructive"
      />
      
      <ConfirmationDialog
        open={deleteLevelDialogOpen}
        onOpenChange={setDeleteLevelDialogOpen}
        title="حذف المستوى"
        description="هل أنت متأكد من حذف هذا المستوى؟"
        confirmText="حذف"
        onConfirm={confirmDeleteLevel}
        variant="destructive"
      />
    </div>
  )
} 