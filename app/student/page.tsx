"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { LayoutDashboard, Users, Award, Gift, CreditCard, MessageSquare, Bell, AlertCircle, Loader2, MinusCircle, School } from "lucide-react"
import { getCurrentUser } from "@/lib/utils/auth-compat"
import { PointsSyncButton } from "@/app/components/points-sync-button"
import { syncUserPointsBalance } from "@/lib/actions/update-points-balance"
import { showActionSuccessToast, showInfoToast } from "@/lib/utils/toast-messages"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  RefreshCcw,
  Crown,
  AlertTriangle,
  ChevronLeft,
  Zap,
  TrendingUp,
  BarChart,
  FileText
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface StudentData {
  id: string;
  name: string;
  points: number;
  avatar: string | null;
}

interface WeeklyPointData {
  user_id: string;
  sum_points: number;
}

// Action cards data
const actionCards = [
  { title: "شحن الرصيد", icon: CreditCard, href: "/student/recharge", color: "bg-blue-50 dark:bg-blue-950" },
  { title: "المكافآت", icon: Gift, href: "/student/rewards", color: "bg-green-50 dark:bg-green-950" },
  { title: "الشارات", icon: Award, href: "/student/badges", color: "bg-yellow-50 dark:bg-yellow-950" },
  { title: "النقاط", icon: FileText, href: "/student/statement", color: "bg-purple-50 dark:bg-purple-950" },
  { title: "الرسائل", icon: MessageSquare, href: "/messages", color: "bg-indigo-50 dark:bg-indigo-950" },
  { title: "سجلاتي", icon: FileText, href: "/student/records", color: "bg-pink-50 dark:bg-pink-950" },
  { title: "بيانات الصف", icon: School, href: "/student/class", color: "bg-orange-50 dark:bg-orange-950" },
  { title: "عرض التفاصيل", icon: ChevronLeft, href: "/student/details", color: "bg-teal-50 dark:bg-teal-950" },
]

// Medal components
const medals = [
  <div key="gold" className="text-2xl">🥇</div>,
  <div key="silver" className="text-2xl">🥈</div>,
  <div key="bronze" className="text-2xl">🥉</div>,
]

// Stats cards data
function getStatCards(points: number | undefined, rank: number | undefined, notifications: number | undefined, negativePoints: number | undefined, isRefreshing: boolean, handleRefreshPoints: () => void) {
  return [
    { 
      title: "رصيد النقاط", 
      value: points !== undefined ? points.toString() : "0", 
      icon: <RefreshCcw className={cn("h-5 w-5", isRefreshing && "animate-spin")} />,
      onClick: handleRefreshPoints,
      iconColor: "text-blue-500",
      className: "border-blue-100 bg-blue-50/50 dark:bg-blue-950/20" 
    },
    { 
      title: "الترتيب", 
      value: rank !== undefined ? `#${rank}` : "#0", 
      icon: <Crown className="h-5 w-5" />,
      iconColor: "text-amber-500",
      className: "border-amber-100 bg-amber-50/50 dark:bg-amber-950/20" 
    },
    { 
      title: "الإشعارات", 
      value: notifications !== undefined ? notifications.toString() : "0", 
      icon: <Bell className="h-5 w-5" />,
      badge: notifications && notifications > 0 ? notifications : undefined,
      href: "/notifications",
      iconColor: "text-purple-500",
      className: "border-purple-100 bg-purple-50/50 dark:bg-purple-950/20" 
    },
    { 
      title: "النقاط السلبية", 
      value: negativePoints !== undefined ? negativePoints.toString() : "0", 
      icon: <AlertTriangle className="h-5 w-5" />,
      href: "/student/negative-points",
      iconColor: "text-red-500",
      isWarning: negativePoints !== undefined && negativePoints > 0,
      className: "border-red-100 bg-red-50/50 dark:bg-red-950/20" 
    }
  ];
}

// Demo leaderboard data as fallback
const demoLeaderboard: StudentData[] = [
  { id: 'demo-1', name: 'أحمد محمد', points: 950, avatar: null },
  { id: 'demo-2', name: 'سارة أحمد', points: 890, avatar: null },
  { id: 'demo-3', name: 'محمد علي', points: 820, avatar: null },
  { id: 'demo-4', name: 'فاطمة حسن', points: 780, avatar: null },
  { id: 'demo-5', name: 'عمر خالد', points: 720, avatar: null },
  { id: 'demo-6', name: 'نور محمد', points: 680, avatar: null },
  { id: 'demo-7', name: 'ياسر أحمد', points: 650, avatar: null },
  { id: 'demo-8', name: 'ليلى عبدالله', points: 600, avatar: null },
  { id: 'demo-9', name: 'كريم سعيد', points: 550, avatar: null },
  { id: 'demo-10', name: 'هدى إبراهيم', points: 500, avatar: null },
];

export default function StudentDashboard() {
  const [user, setUser] = useState<any>(null)
  const [points, setPoints] = useState(0)
  const [ranking, setRanking] = useState({ rank: 0, total: 0, pointsToNext: 0 })
  const [notifications, setNotifications] = useState(0)
  const [negativePoints, setNegativePoints] = useState(0)
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(true)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const [leaderboard, setLeaderboard] = useState<StudentData[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const router = useRouter()
  
  const supabase = createClient()

  useEffect(() => {
    loadData();
  }, [router, supabase]);

  async function loadData() {
    try {
      setLoading(true);
      setDataLoading(true);
      
      // Get user data
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/login');
        return;
      }

      setUser(user);
      console.log('Current user:', user);
      
      // Get user profile data
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("id, full_name, role_id")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Error getting profile:", profileError);
      } else {
        console.log('User profile data:', profile);
      }
      
      // Get user points
      try {
        // Method 1: Get from student_points table
        const { data: pointsData, error: pointsError } = await supabase
          .from("student_points")
          .select("points")
          .eq("student_id", user.id)
          .single();
          
        let pointsValue = 0;
        
        if (pointsError) {
          console.error("Error getting points from student_points:", pointsError);
        } else {
          console.log('Points data from student_points:', pointsData);
          pointsValue = pointsData?.points || 0;
        }
        
        // Method 2: Calculate from transactions as fallback
        if (pointsValue === 0) {
          console.log('Trying to calculate points from transactions');
          
          // Get positive transactions
          const { data: positiveTransactions, error: positiveError } = await supabase
            .from("points_transactions")
            .select("points")
            .eq("user_id", user.id)
            .eq("is_positive", true);
            
          // Get negative transactions
          const { data: negativeTransactions, error: negativeError } = await supabase
            .from("points_transactions")
            .select("points")
            .eq("user_id", user.id)
            .eq("is_positive", false);
            
          if (!positiveError && !negativeError) {
            const positivePoints = positiveTransactions?.reduce((sum, tx) => sum + (tx.points || 0), 0) || 0;
            const negativePoints = negativeTransactions?.reduce((sum, tx) => sum + (tx.points || 0), 0) || 0;
            const calculatedPoints = positivePoints - negativePoints;
            
            console.log(`Calculated points: Positive=${positivePoints}, Negative=${negativePoints}, Total=${calculatedPoints}`);
            
            if (calculatedPoints > 0) {
              pointsValue = calculatedPoints;
            }
          }
        }
        
        setPoints(pointsValue);
      } catch (error) {
        console.error("Failed to fetch points:", error);
        setPoints(0);
      }
      
      // Get notifications count
      try {
        const { count: notificationCount, error: notificationError } = await supabase
          .from("notifications")
          .select("*", { count: "exact" })
          .eq("user_id", user.id)
          .eq("is_read", false);
          
        if (notificationError) {
          console.error("Error getting notifications:", notificationError);
          setNotifications(0);
        } else {
          console.log('Notifications count:', notificationCount);
          setNotifications(notificationCount || 0);
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
        setNotifications(0);
      }
      
      // Get negative points - Try a simpler approach
      try {
        // Fetch all negative transactions and calculate sum manually
        const { data: negativeTransactions, error: negativePointsError } = await supabase
          .from("points_transactions")
          .select("points")
          .eq("user_id", user.id)
          .eq("is_positive", false);
          
        if (negativePointsError) {
          console.error("Error getting negative points:", negativePointsError);
          setNegativePoints(0);
        } else {
          console.log('Negative transactions data:', negativeTransactions);
          // Calculate sum in JavaScript instead of SQL
          const totalNegative = negativeTransactions?.reduce((sum, tx) => sum + (tx.points || 0), 0) || 0;
          setNegativePoints(totalNegative);
        }
      } catch (error) {
        console.error("Failed to fetch negative points:", error);
        setNegativePoints(0);
      }
      
      // Get real student data for rankings and leaderboard
      try {
        // First get all users who have a student role
        const { data: students, error: studentsError } = await supabase
          .from('users')
          .select('id, full_name')
          .eq('role_id', 1) // Assuming role_id 1 is for students
          .order('full_name');
          
        if (studentsError) {
          console.error("Error getting students:", studentsError);
        } else {
          console.log(`Found ${students?.length || 0} students`);
          
          // Then get points for all students
          const { data: allStudentPoints, error: pointsError } = await supabase
            .from('student_points')
            .select('student_id, points')
            .order('points', { ascending: false });
            
          if (pointsError) {
            console.error("Error getting student points:", pointsError);
          } else {
            console.log(`Found points for ${allStudentPoints?.length || 0} students`);
            
            // Combine student info with their points
            const studentsWithPoints = students
              .map(student => {
                const pointsRecord = allStudentPoints?.find(p => p.student_id === student.id);
                return {
                  id: student.id,
                  name: student.full_name || 'طالب بدون اسم',
                  points: pointsRecord?.points || 0
                };
              })
              .sort((a, b) => b.points - a.points); // Sort by points (descending)
              
            console.log('Combined student data:', studentsWithPoints);
            
            // Calculate ranking
            const userRank = studentsWithPoints.findIndex(s => s.id === user.id) + 1;
            const totalStudents = studentsWithPoints.length;
            
            // Points needed to advance to next rank
            let pointsToNext = 0;
            if (userRank > 1) {
              const userPoints = studentsWithPoints.find(s => s.id === user.id)?.points || 0;
              const nextRankPoints = studentsWithPoints[userRank - 2]?.points || 0;
              pointsToNext = nextRankPoints - userPoints;
            }
            
            setRanking({
              rank: userRank || 1,
              total: totalStudents || 1,
              pointsToNext: pointsToNext || 0
            });
            
            // Use real students for leaderboard
            const topStudents = studentsWithPoints.slice(0, 10).map(student => ({
              id: student.id,
              name: student.name,
              points: student.points,
              avatar: null
            }));
            
            if (topStudents.length > 0) {
              setLeaderboard(topStudents);
            } else {
              // Fallback to demo data if no real student data is available
              setLeaderboard(demoLeaderboard);
            }
          }
        }
      } catch (error) {
        console.error("Error getting student rankings:", error);
        // Default values if all fails
        setRanking({ rank: 1, total: 1, pointsToNext: 0 });
        setLeaderboard(demoLeaderboard);
      }

    } catch (error) {
      console.error("Error in loadData:", error);
    } finally {
      setLoading(false);
      setDataLoading(false);
    }
  }

  const handleNavigate = (path: string) => {
    setPendingNavigation(path)
    setConfirmDialogOpen(true)
  }

  const formatPath = (path: string) => {
    const pathMap: Record<string, string> = {
      '/student': 'الرئيسية',
      '/student/rewards': 'المكافآت',
      '/student/badges': 'الشارات',
      // Add more path mappings as needed
    }
    return pathMap[path] || path
  }

  const handleRefreshPoints = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      // Method 1: Call the fix-points API first
      try {
        const response = await fetch(`/api/fix-points?userId=${user?.id}`);
        if (response.ok) {
          const result = await response.json();
          console.log('Fix points API result:', result);
          if (result.points !== undefined) {
            setPoints(result.points);
            showActionSuccessToast(`تم تحديث النقاط: ${result.points} نقطة`);
            
            // Stop here if successful
            setIsRefreshing(false);
            return;
          }
        }
      } catch (apiError) {
        console.error("Error calling fix-points API:", apiError);
      }
      
      // Method 2: Import the function directly as fallback
      try {
        const { syncUserPointsBalance } = await import('@/lib/actions/update-points-balance');
        
        const result = await syncUserPointsBalance(user?.id || '', true);
        if (result.success && result.data) {
          setPoints(result.data.points || 0);
          showActionSuccessToast(`تم تحديث النقاط: ${result.data.points} نقطة`);
          
          // Also refresh all dashboard data
          await loadData();
        } else {
          showInfoToast(result.message || 'حدث خطأ أثناء تحديث النقاط');
        }
      } catch (syncError) {
        console.error("Error in syncUserPointsBalance:", syncError);
        
        // Method 3: Manual calculation as last resort
        try {
          console.log('Falling back to manual calculation');
          
          // Get positive transactions
          const { data: positiveTransactions } = await supabase
            .from("points_transactions")
            .select("points")
            .eq("user_id", user?.id)
            .eq("is_positive", true);
            
          // Get negative transactions
          const { data: negativeTransactions } = await supabase
            .from("points_transactions")
            .select("points")
            .eq("user_id", user?.id)
            .eq("is_positive", false);
            
          const positivePoints = positiveTransactions?.reduce((sum, tx) => sum + (tx.points || 0), 0) || 0;
          const negativePoints = negativeTransactions?.reduce((sum, tx) => sum + (tx.points || 0), 0) || 0;
          const calculatedPoints = positivePoints - negativePoints;
          
          console.log(`Calculated points: Positive=${positivePoints}, Negative=${negativePoints}, Total=${calculatedPoints}`);
          
          // Update student_points with the calculated value
          try {
            await supabase
              .from("student_points")
              .upsert({ 
                student_id: user?.id, 
                points: calculatedPoints 
              });
              
            setPoints(calculatedPoints);
            showActionSuccessToast(`تم تحديث النقاط يدويًا: ${calculatedPoints} نقطة`);
          } catch (updateError) {
            console.error("Exception updating student_points:", updateError);
            showInfoToast('تعذر تحديث سجل النقاط');
          }
        } catch (manualError) {
          console.error("Error in manual calculation:", manualError);
          showInfoToast('حدث خطأ أثناء حساب النقاط يدويًا');
        }
      }
    } catch (error) {
      console.error("Error refreshing points:", error);
      showInfoToast('حدث خطأ أثناء تحديث النقاط، يرجى المحاولة مرة أخرى');
    } finally {
      setIsRefreshing(false);
    }
  }

  // Calculate user's progress percentage among top 100
  const progressPercentage = Math.max(0, Math.min(100, 100 - (ranking.rank / ranking.total) * 100))

  if (loading) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center min-h-[80vh]">
        <div className="text-center">
          <div className="animate-spin mb-4 h-12 w-12 border-t-4 border-blue-500 border-solid rounded-full mx-auto"></div>
          <p>جار التحميل...</p>
        </div>
      </div>
    )
  }

  if (!user) return null
  
  const statCards = getStatCards(points, ranking.rank, notifications, negativePoints, isRefreshing, handleRefreshPoints);

  return (
    <div className="container max-w-7xl mx-auto px-3 sm:px-4 md:px-6 pb-16 sm:pb-10 rtl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 my-4 sm:my-6">
        <h1 className="text-xl sm:text-2xl font-bold">لوحة التحكم</h1>
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => {
            showInfoToast('تم تحديث البيانات')
            window.location.reload()
          }}
        >
          تحديث
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        {statCards.map((stat, index) => (
          <StatCard 
            key={index}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            iconColor={stat.iconColor}
            onClick={stat.onClick}
            badge={stat.badge}
            href={stat.href}
            isWarning={stat.isWarning}
            className={stat.className}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
        {/* Leaderboard */}
        <Card className="col-span-1 lg:col-span-2 border-t-4 border-t-blue-500 shadow-sm">
          <CardContent className="p-0">
            <div className="p-3 sm:p-4 border-b flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                لوحة المتصدرين
              </h2>
            </div>

            <ScrollArea className="h-64 sm:h-72 p-3 sm:p-4">
              {dataLoading ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
                  <p className="text-sm text-gray-500">جاري تحميل البيانات...</p>
                </div>
              ) : leaderboard.length > 0 ? (
                leaderboard.map((student, index) => (
                  <div 
                    key={student.id}
                    className={cn(
                      "flex items-center justify-between p-2 sm:p-3 rounded-lg mb-2",
                      index < 3 ? "bg-blue-50/50 dark:bg-blue-950/20" : "bg-gray-50 dark:bg-gray-900/20",
                      user?.id === student.id && "border border-blue-300 dark:border-blue-700"
                    )}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="flex items-center justify-center w-6 sm:w-8 h-6 sm:h-8">
                        {index < 3 ? medals[index] : <span className="text-xs sm:text-sm text-gray-500">#{index + 1}</span>}
                      </div>
                      <Avatar className="h-8 w-8 sm:h-10 sm:w-10 border">
                        <AvatarImage src={student.avatar || ''} alt={student.name} />
                        <AvatarFallback>{student.name.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm sm:text-base font-medium">{student.name}</p>
                        <p className="text-xs sm:text-sm text-gray-500">{student.points} نقطة</p>
                      </div>
                    </div>
                    {user?.id === student.id && (
                      <div className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs px-2 py-1 rounded-full">
                        أنت
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Users className="h-10 w-10 mb-2 opacity-30" />
                  <p>لا يوجد بيانات متاحة</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      showInfoToast('تم تحديث البيانات')
                      window.location.reload()
                    }}
                    className="mt-4"
                  >
                    إعادة المحاولة
                  </Button>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* User Rank Progress */}
        <Card className="border-t-4 border-t-indigo-500 shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 flex items-center gap-2">
              <BarChart className="h-5 w-5 text-indigo-500" />
              تقدمك
            </h2>
            
            <div className="space-y-4 sm:space-y-6">
              <div className="text-center mb-4 sm:mb-8">
                <span className="text-3xl sm:text-5xl font-bold text-indigo-600 dark:text-indigo-400">#{ranking.rank}</span>
                <p className="text-sm sm:text-base text-gray-500 mt-2">
                  {ranking.total > 1 
                    ? `ترتيبك من بين ${ranking.total} طالب`
                    : 'أنت الطالب الوحيد في النظام حاليًا'
                  }
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span>الترتيب الحالي</span>
                  <span>الأول</span>
                </div>
                {ranking.total > 1 ? (
                  <>
                    <Progress value={progressPercentage} className="h-2 sm:h-3" />
                    <p className="text-xs text-gray-500 mt-1">
                      {ranking.rank === 1 
                        ? 'أنت في المركز الأول! أحسنت!'
                        : `أنت ضمن أفضل ${Math.round(progressPercentage)}% من الطلاب`
                      }
                    </p>
                  </>
                ) : (
                  <>
                    <Progress value={100} className="h-2 sm:h-3" />
                    <p className="text-xs text-gray-500 mt-1">
                      أنت الطالب الوحيد في النظام حاليًا
                    </p>
                  </>
                )}
              </div>
              
              <div className="pt-3 sm:pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs sm:text-sm font-medium">نقاط مطلوبة للمركز التالي</span>
                  <span className="text-xs sm:text-sm font-medium text-indigo-600">
                    {ranking.rank === 1 
                      ? 'أنت بالفعل في المركز الأول'
                      : `${ranking.pointsToNext} نقطة`
                    }
                  </span>
                </div>
                <Button variant="outline" className="w-full mt-3 sm:mt-4 text-sm">
                  عرض التفاصيل الكاملة
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Cards */}
      <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
        <Zap className="h-5 w-5 text-blue-500" />
        الخدمات السريعة
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
        {actionCards.map((card) => (
          <Link href={card.href} key={card.title}>
            <Card className={cn(
              "group h-24 sm:h-28 flex flex-col items-center justify-center transition-all hover:shadow-md cursor-pointer",
              "border-transparent hover:border-blue-300 dark:hover:border-blue-700",
              card.color
            )}>
              <CardContent className="flex flex-col items-center justify-center p-2 sm:p-4 h-full w-full">
                <card.icon className="h-6 w-6 sm:h-8 sm:w-8 text-gray-600 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-1 sm:mb-2" />
                <span className="text-xs sm:text-sm font-medium text-center">{card.title}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        onConfirm={() => {
          if (pendingNavigation) {
            router.push(pendingNavigation)
          }
          setConfirmDialogOpen(false)
        }}
        title="تأكيد الانتقال"
        description="هل أنت متأكد أنك تريد مغادرة هذه الصفحة؟"
        confirmText="نعم، انتقل"
        cancelText="لا، ابقَ هنا"
      />
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string
  icon: React.ReactNode
  iconColor?: string
  onClick?: () => void
  badge?: number
  href?: string
  isWarning?: boolean
  className?: string
}

function StatCard({
  title,
  value,
  icon,
  iconColor = "text-gray-500",
  onClick,
  badge,
  href,
  isWarning = false,
  className
}: StatCardProps) {
  const content = (
    <Card className={cn(
      "relative overflow-hidden transition-all hover:shadow-md",
      isWarning && "border-red-300 dark:border-red-700",
      className
    )}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{title}</p>
            <p className={cn(
              "text-xl sm:text-2xl font-bold mt-1",
              isWarning && "text-red-600 dark:text-red-400"
            )}>
              {value}
            </p>
          </div>
          <div 
            className={cn(
              "p-1.5 sm:p-2 rounded-full",
              iconColor,
              onClick ? "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" : ""
            )}
            onClick={onClick}
          >
            {icon}
          </div>
        </div>
        
        {badge !== undefined && (
          <div className="absolute top-2 sm:top-3 left-2 sm:left-3 bg-red-500 text-white text-xs w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-full">
            {badge > 9 ? '9+' : badge}
          </div>
        )}
      </CardContent>
    </Card>
  )
  
  if (href) {
    return <Link href={href}>{content}</Link>
  }
  
  return content
}
