import { createClient } from "@/lib/supabase/server"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Award, Medal, Trophy } from "lucide-react"
import { cookies } from "next/headers"

interface User {
  id: string
  full_name: string
  user_code: string
  role_id: number
}

interface LeaderboardEntry extends User {
  total_points: number
}

interface Transaction {
  user_id: string
  points: number
  is_positive: boolean
}

async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const supabase = await createClient()

    // Get all users, not just students
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, full_name, user_code, role_id")

    if (usersError) {
      console.error("Error fetching users:", usersError)
      return []
    }

    // Now get points for each user
    const userIds = users.map((user: User) => user.id)
    const { data: transactions, error: transactionsError } = await supabase
      .from("points_transactions")
      .select("user_id, points, is_positive")
      .in("user_id", userIds)

    if (transactionsError) {
      console.error("Error fetching transactions:", transactionsError)
      return []
    }

    // Calculate total points for each user
    const pointsByUser: Record<string, number> = {}
    
    for (const tx of transactions) {
      const userId = tx.user_id
      const points = tx.points
      const isPositive = tx.is_positive
      
      if (!pointsByUser[userId]) {
        pointsByUser[userId] = 0
      }
      
      pointsByUser[userId] += isPositive ? points : -points
    }
    
    // Combine user data with points
    const leaderboard = users.map((user: User) => ({
      id: user.id,
      full_name: user.full_name,
      user_code: user.user_code,
      role_id: user.role_id,
      total_points: pointsByUser[user.id] || 0
    }))

    // Sort by points (descending)
    return leaderboard.sort((a: LeaderboardEntry, b: LeaderboardEntry) => b.total_points - a.total_points)
  } catch (error) {
    console.error("Error generating leaderboard:", error)
    return []
  }
}

export default async function LeaderboardPage() {
  const leaderboard = await getLeaderboard()

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <h1 className="mb-6 text-2xl font-bold">لوحة المتصدرين</h1>

        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle>افضل المستخدمين</CardTitle>
            <CardDescription>قائمة بأفضل المستخدمين حسب مجموع النقاط</CardDescription>
          </CardHeader>
          <CardContent>
            {leaderboard.length === 0 ? (
              <p className="text-center text-muted-foreground">لا توجد بيانات متاحة</p>
            ) : (
              <div className="space-y-8">
                {/* Top 3 Students */}
                <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                  {leaderboard.length > 1 && (
                    <div className="order-2 flex flex-col items-center sm:order-1">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-silver p-1">
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-b from-gray-200 to-gray-400 text-white">
                          <Medal className="h-8 w-8" />
                        </div>
                      </div>
                      <h3 className="mt-2 text-lg font-semibold">{leaderboard[1].full_name}</h3>
                      <p className="text-sm text-muted-foreground">{leaderboard[1].user_code}</p>
                      <p className="mt-1 font-bold">{leaderboard[1].total_points} نقطة</p>
                    </div>
                  )}

                  {leaderboard.length > 0 && (
                    <div className="order-1 flex flex-col items-center sm:order-2">
                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gold p-1">
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-b from-yellow-300 to-yellow-500 text-white">
                          <Trophy className="h-10 w-10" />
                        </div>
                      </div>
                      <h3 className="mt-2 text-xl font-bold">{leaderboard[0].full_name}</h3>
                      <p className="text-sm text-muted-foreground">{leaderboard[0].user_code}</p>
                      <p className="mt-1 text-lg font-bold">{leaderboard[0].total_points} نقطة</p>
                    </div>
                  )}

                  {leaderboard.length > 2 && (
                    <div className="order-3 flex flex-col items-center">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-bronze p-1">
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-b from-amber-600 to-amber-800 text-white">
                          <Award className="h-8 w-8" />
                        </div>
                      </div>
                      <h3 className="mt-2 text-lg font-semibold">{leaderboard[2].full_name}</h3>
                      <p className="text-sm text-muted-foreground">{leaderboard[2].user_code}</p>
                      <p className="mt-1 font-bold">{leaderboard[2].total_points} نقطة</p>
                    </div>
                  )}
                </div>

                {/* Rest of the Leaderboard */}
                <div className="rounded-md border">
                  <div className="grid grid-cols-12 border-b bg-muted/50 p-4 font-medium">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-7">المستخدم</div>
                    <div className="col-span-2">الرمز</div>
                    <div className="col-span-2 text-left">النقاط</div>
                  </div>
                  {leaderboard.slice(3).map((student, index) => (
                    <div key={student.id} className="grid grid-cols-12 border-b p-4 last:border-0">
                      <div className="col-span-1 text-center font-medium">{index + 4}</div>
                      <div className="col-span-7">{student.full_name}</div>
                      <div className="col-span-2 text-muted-foreground">{student.user_code}</div>
                      <div className="col-span-2 text-left font-medium">{student.total_points}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
