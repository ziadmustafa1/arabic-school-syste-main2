"use client"

import { useState, useEffect } from "react"
import { getUserTierInfo, getUserTierRewards } from "@/lib/actions/tiers"
import { updateStudentPoints } from "@/app/actions/update-student-points"
import { createClient } from "@/lib/supabase/client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Loader2, ChevronRight, Award, Gift, Medal, Trophy, Star, RefreshCw } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export default function UserTierPage() {
  const [loading, setLoading] = useState(true)
  const [userTier, setUserTier] = useState<any>(null)
  const [userRewards, setUserRewards] = useState<any[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const supabase = createClient()
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [tierResult, rewardsResult] = await Promise.all([
          getUserTierInfo(),
          getUserTierRewards()
        ])
        
        if (tierResult.success && tierResult.data) {
          console.log("User tier info:", tierResult.data)
          setUserTier(tierResult.data)
        }
        
        if (rewardsResult.success && rewardsResult.data) {
          console.log("User rewards:", rewardsResult.data)
          setUserRewards(rewardsResult.data)
        }
      } catch (error) {
        console.error("Error fetching tier data:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])
  
  const getTierIcon = (tier: any) => {
    if (!tier) return null
    
    const tierIcons = {
      'برونزية': <Award className="h-8 w-8 text-[#CD7F32]" />,
      'فضية': <Medal className="h-8 w-8 text-[#C0C0C0]" />,
      'ذهبية': <Trophy className="h-8 w-8 text-[#FFD700]" />,
      'بلاتينية': <Star className="h-8 w-8 text-[#E5E4E2]" />
    }
    
    return tierIcons[tier.name] || <Award className="h-8 w-8" />
  }
  
  const getRewardIcon = (reward: any) => {
    if (!reward) return null
    
    const rewardType = reward.tier_rewards?.reward_type
    
    if (rewardType === 'points') {
      return <Award className="h-6 w-6 text-green-500" />
    } else if (rewardType === 'badge') {
      return <Medal className="h-6 w-6 text-blue-500" />
    } else if (rewardType === 'coupon') {
      return <Gift className="h-6 w-6 text-purple-500" />
    } else {
      return <Star className="h-6 w-6 text-yellow-500" />
    }
  }
  
  // New function to force a refresh of the points calculation
  const forceRefreshPoints = async () => {
    try {
      setRefreshing(true)
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !user.id) {
        toast({
          title: "خطأ",
          description: "لم يتم العثور على معلومات المستخدم",
          variant: "destructive"
        })
        return
      }
      
      // First, try to get accurate points from student_points
      const { data: pointsData } = await supabase
        .from("student_points")
        .select("points")
        .eq("student_id", user.id)
        .single()
      
      if (pointsData && pointsData.points > 0) {
        // If we have points in the student_points table, force a refresh
        const tierResult = await getUserTierInfo(user.id)
        if (tierResult.success && tierResult.data) {
          setUserTier(tierResult.data)
          toast({
            title: "تم تحديث المستوى",
            description: `تم تحديث نقاطك: ${tierResult.data.points} نقطة`
          })
        }
      } else {
        // If no points in student_points, try the API
        const response = await fetch(`/api/fix-points?userId=${user.id}&force=true`)
        if (response.ok) {
          const result = await response.json()
          
          if (result.success && result.totalPoints >= 0) {
            // Update tier info with the new points
            const tierResult = await getUserTierInfo(user.id)
            if (tierResult.success && tierResult.data) {
              setUserTier(tierResult.data)
              toast({
                title: "تم تحديث المستوى",
                description: `تم تحديث نقاطك: ${tierResult.data.points} نقطة`
              })
            }
          } else {
            toast({
              title: "تحذير",
              description: "لم نتمكن من تحديث النقاط",
              variant: "destructive"
            })
          }
        }
      }
    } catch (error) {
      console.error("Error refreshing points:", error)
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث النقاط",
        variant: "destructive"
      })
    } finally {
      setRefreshing(false)
    }
  }
  
  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">مستوى التقدم والمكافآت</h1>
          
          {/* Add refresh button */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={forceRefreshPoints} 
            disabled={refreshing || loading}
          >
            {refreshing ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                جاري التحديث...
              </>
            ) : (
              <>
                <RefreshCw className="ml-2 h-4 w-4" />
                تحديث النقاط
              </>
            )}
          </Button>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>جاري التحميل...</span>
          </div>
        ) : !userTier ? (
          <div className="text-center p-8">
            <p className="text-lg">لم يتم العثور على معلومات المستوى</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {/* Current Tier */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle>المستوى الحالي</CardTitle>
                <CardDescription>
                  إجمالي النقاط: {userTier.points}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 space-x-reverse mb-6">
                  <div className={cn(
                    "p-3 rounded-full",
                    userTier.currentTier?.color ? `bg-[${userTier.currentTier.color}]/10` : "bg-primary/10"
                  )}>
                    {getTierIcon(userTier.currentTier)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{userTier.currentTier?.name || "لا توجد طبقة حالية"}</h3>
                    {userTier.currentLevel && (
                      <p className="text-sm text-muted-foreground">
                        المستوى {userTier.currentLevel.level_number}: {userTier.currentLevel.name}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Progress bars */}
                <div className="space-y-4">
                  {/* Level progress */}
                  {userTier.currentLevel && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>تقدم المستوى</span>
                        <span>{userTier.progress?.levelProgress || 0}%</span>
                      </div>
                      <Progress value={userTier.progress?.levelProgress || 0} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{userTier.currentLevel.min_points} نقطة</span>
                        <span>{userTier.currentLevel.max_points} نقطة</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Tier progress */}
                  {userTier.currentTier && (
                    <div className="space-y-2 mt-4">
                      <div className="flex justify-between text-sm">
                        <span>تقدم الطبقة</span>
                        <span>{userTier.progress?.tierProgress || 0}%</span>
                      </div>
                      <Progress value={userTier.progress?.tierProgress || 0} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{userTier.currentTier.min_points} نقطة</span>
                        <span>{userTier.currentTier.max_points} نقطة</span>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Next level or tier */}
                <div className="mt-6 space-y-4">
                  {userTier.nextLevel && (
                    <div className="p-4 border rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-2">المستوى التالي</h4>
                      <div className="flex justify-between items-center">
                        <span>{userTier.nextLevel.name}</span>
                        <div className="flex items-center">
                          <span className="text-sm">{userTier.pointsToNextLevel} نقطة متبقية</span>
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {userTier.nextTier && (
                    <div className="p-4 border rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-2">الطبقة التالية</h4>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "p-2 rounded-full",
                            userTier.nextTier?.color ? `bg-[${userTier.nextTier.color}]/10` : "bg-primary/10"
                          )}>
                            {getTierIcon(userTier.nextTier)}
                          </div>
                          <span>{userTier.nextTier.name}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-sm">{userTier.pointsToNextTier} نقطة متبقية</span>
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Rewards */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>المكافآت المكتسبة</CardTitle>
                <CardDescription>
                  المكافآت التي حصلت عليها
                </CardDescription>
              </CardHeader>
              <CardContent>
                {userRewards.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>لم تحصل على أي مكافآت بعد</p>
                    <p className="text-xs mt-2">استمر في جمع النقاط للحصول على مكافآت!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userRewards.map((reward) => (
                      <TooltipProvider key={reward.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-default">
                              <div className="p-2 rounded-full bg-muted">
                                {getRewardIcon(reward)}
                              </div>
                              <div className="ml-3 flex-1">
                                <h4 className="font-medium text-sm">{reward.tier_rewards?.name}</h4>
                                <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                                  {reward.tier_rewards?.description || 
                                  `حصلت عليها في ${new Date(reward.awarded_at).toLocaleDateString('ar-SA')}`}
                                </p>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1 max-w-xs">
                              <p className="font-medium">{reward.tier_rewards?.name}</p>
                              <p className="text-xs">{reward.tier_rewards?.description}</p>
                              <p className="text-xs">
                                {reward.tier_rewards?.reward_type === 'points' && `${reward.tier_rewards?.points_value} نقطة`}
                                {reward.tier_rewards?.reward_type === 'badge' && 'شارة'}
                                {reward.tier_rewards?.reward_type === 'coupon' && 'كوبون خصم'}
                                {reward.tier_rewards?.reward_type === 'special' && 'مكافأة خاصة'}
                              </p>
                              <p className="text-xs">
                                تم الحصول عليها في {new Date(reward.awarded_at).toLocaleDateString('ar-SA')}
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Tier History */}
            {userTier.tierHistory && userTier.tierHistory.length > 0 && (
              <Card className="md:col-span-3">
                <CardHeader className="pb-2">
                  <CardTitle>سجل الترقيات</CardTitle>
                  <CardDescription>
                    تاريخ ترقيات المستويات والطبقات الخاصة بك
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {userTier.tierHistory.map((history: any) => (
                      <div key={history.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-full",
                            history.tiers?.color ? `bg-[${history.tiers.color}]/10` : "bg-primary/10"
                          )}>
                            {getTierIcon(history.tiers)}
                          </div>
                          <div>
                            <h4 className="font-medium">{history.tiers?.name}</h4>
                            {history.levels && (
                              <p className="text-xs text-muted-foreground">
                                المستوى {history.levels.level_number}: {history.levels.name}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(history.achieved_at).toLocaleDateString('ar-SA')}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
} 