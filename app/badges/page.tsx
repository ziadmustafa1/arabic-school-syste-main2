"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { Award, Search, Medal, RefreshCw, Info } from "lucide-react"
import { cn } from "@/lib/utils"

export default function BadgesAndMedalsPage() {
  const [activeTab, setActiveTab] = useState("badges")
  const [badges, setBadges] = useState([])
  const [medals, setMedals] = useState([])
  const [userBadges, setUserBadges] = useState([])
  const [userMedals, setUserMedals] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchBadgesAndMedals()
  }, [])

  const fetchBadgesAndMedals = async () => {
    setLoading(true)
    try {
      // Use server actions to fetch badges and medals
      const [badgesResult, userBadgesResult, medalsResult, userMedalsResult] = await Promise.all([
        // Use the admin action for public badges
        fetch('/api/badges').then(res => res.json()),
        // Use client for user-specific data
        supabase
          .from("user_badges")
          .select("*, badges(*)")
          .order("awarded_at", { ascending: false }),
        // Use the admin action for public medals
        fetch('/api/medals').then(res => res.json()),
        // Use client for user-specific data
        supabase
          .from("user_medals")
          .select("*, medals(*)")
          .order("awarded_at", { ascending: false }),
      ]);
      
      // Process badges result
      if (badgesResult.success) {
        setBadges(badgesResult.data || []);
      } else {
        console.error("Error fetching badges:", badgesResult.error);
      }
      
      // Process user badges result
      if (!userBadgesResult.error) {
        setUserBadges(userBadgesResult.data || []);
      } else {
        console.error("Error fetching user badges:", userBadgesResult.error);
      }
      
      // Process medals result
      if (medalsResult.success) {
        setMedals(medalsResult.data || []);
      } else {
        console.error("Error fetching medals:", medalsResult.error);
      }
      
      // Process user medals result
      if (!userMedalsResult.error) {
        setUserMedals(userMedalsResult.data || []);
      } else {
        console.error("Error fetching user medals:", userMedalsResult.error);
      }
      
    } catch (error) {
      console.error("Error fetching badges and medals:", error);
    } finally {
      setLoading(false);
    }
  }

  // Filter badges and medals based on search term
  const filteredBadges = badges.filter(badge => 
    badge.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (badge.description && badge.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )
  
  const filteredMedals = medals.filter(medal => 
    medal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (medal.description && medal.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )
  
  const filteredUserBadges = userBadges.filter(userBadge => 
    userBadge.badges.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (userBadge.badges.description && userBadge.badges.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )
  
  const filteredUserMedals = userMedals.filter(userMedal => 
    userMedal.medals.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (userMedal.medals.description && userMedal.medals.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">الشارات والأوسمة</h1>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">شاراتي</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userBadges.length}</div>
              <p className="text-xs text-muted-foreground">الشارات التي حصلت عليها</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">أوسمتي</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userMedals.length}</div>
              <p className="text-xs text-muted-foreground">الأوسمة التي حصلت عليها</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الشارات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{badges.length}</div>
              <p className="text-xs text-muted-foreground">الشارات المتاحة في النظام</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الأوسمة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{medals.length}</div>
              <p className="text-xs text-muted-foreground">الأوسمة المتاحة في النظام</p>
            </CardContent>
          </Card>
        </div>
        
        <div className="mb-6 flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex items-center gap-2 w-full md:w-1/2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="البحث عن الشارات والأوسمة..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
        
        <Tabs defaultValue="badges" value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
          <TabsList className="w-full mb-6 grid grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="badges">الشارات المتاحة</TabsTrigger>
            <TabsTrigger value="my-badges">شاراتي</TabsTrigger>
            <TabsTrigger value="medals">الأوسمة المتاحة</TabsTrigger>
            <TabsTrigger value="my-medals">أوسمتي</TabsTrigger>
          </TabsList>
          
          {/* شارات متاحة */}
          <TabsContent value="badges">
            <Card>
              <CardContent className="p-0">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الشارة</TableHead>
                        <TableHead>الاسم</TableHead>
                        <TableHead>الوصف</TableHead>
                        <TableHead>النقاط المطلوبة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-10">
                            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                            <p>جاري تحميل البيانات...</p>
                          </TableCell>
                        </TableRow>
                      ) : filteredBadges.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-10">
                            <p>لا توجد شارات متطابقة مع معايير البحث</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredBadges.map((badge) => (
                          <TableRow key={badge.id}>
                            <TableCell>
                              {badge.image_url ? (
                                <img 
                                  src={badge.image_url} 
                                  alt={badge.name} 
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                  <Award className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{badge.name}</TableCell>
                            <TableCell>{badge.description || "-"}</TableCell>
                            <TableCell>{badge.min_points}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* شاراتي */}
          <TabsContent value="my-badges">
            <Card>
              <CardContent className="p-0">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الشارة</TableHead>
                        <TableHead>الاسم</TableHead>
                        <TableHead>الوصف</TableHead>
                        <TableHead>تاريخ الحصول</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-10">
                            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                            <p>جاري تحميل البيانات...</p>
                          </TableCell>
                        </TableRow>
                      ) : filteredUserBadges.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-10">
                            <Info className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            <p>لم تحصل على أي شارات بعد</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUserBadges.map((userBadge) => (
                          <TableRow key={userBadge.id}>
                            <TableCell>
                              {userBadge.badges.image_url ? (
                                <img 
                                  src={userBadge.badges.image_url} 
                                  alt={userBadge.badges.name} 
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                  <Award className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{userBadge.badges.name}</TableCell>
                            <TableCell>{userBadge.badges.description || "-"}</TableCell>
                            <TableCell>{new Date(userBadge.awarded_at).toLocaleDateString('ar-EG')}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* أوسمة متاحة */}
          <TabsContent value="medals">
            <Card>
              <CardContent className="p-0">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الوسام</TableHead>
                        <TableHead>الاسم</TableHead>
                        <TableHead>الوصف</TableHead>
                        <TableHead>النقاط المطلوبة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-10">
                            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                            <p>جاري تحميل البيانات...</p>
                          </TableCell>
                        </TableRow>
                      ) : filteredMedals.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-10">
                            <p>لا توجد أوسمة متطابقة مع معايير البحث</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredMedals.map((medal) => (
                          <TableRow key={medal.id}>
                            <TableCell>
                              {medal.image_url ? (
                                <img 
                                  src={medal.image_url} 
                                  alt={medal.name} 
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                  <Medal className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{medal.name}</TableCell>
                            <TableCell>{medal.description || "-"}</TableCell>
                            <TableCell>{medal.min_points}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* أوسمتي */}
          <TabsContent value="my-medals">
            <Card>
              <CardContent className="p-0">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الوسام</TableHead>
                        <TableHead>الاسم</TableHead>
                        <TableHead>الوصف</TableHead>
                        <TableHead>تاريخ الحصول</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-10">
                            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                            <p>جاري تحميل البيانات...</p>
                          </TableCell>
                        </TableRow>
                      ) : filteredUserMedals.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-10">
                            <Info className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            <p>لم تحصل على أي أوسمة بعد</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUserMedals.map((userMedal) => (
                          <TableRow key={userMedal.id}>
                            <TableCell>
                              {userMedal.medals.image_url ? (
                                <img 
                                  src={userMedal.medals.image_url} 
                                  alt={userMedal.medals.name} 
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                  <Medal className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{userMedal.medals.name}</TableCell>
                            <TableCell>{userMedal.medals.description || "-"}</TableCell>
                            <TableCell>{new Date(userMedal.awarded_at).toLocaleDateString('ar-EG')}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
} 