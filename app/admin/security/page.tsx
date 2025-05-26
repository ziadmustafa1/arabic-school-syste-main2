"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AdminLayout } from '@/components/layouts/admin-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertTriangle, AlertCircle, Shield, ShieldAlert, ShieldCheck, Clock, Search } from 'lucide-react'
import { SecurityEventType } from '@/lib/security/logger'

// Security event with additional fields from database
interface SecurityEvent {
  id: string
  event_type: SecurityEventType
  user_id: string | null
  ip_address: string | null
  user_agent: string | null
  details: any
  severity: 'low' | 'medium' | 'high' | 'critical'
  created_at: string
  user?: {
    full_name: string
    email: string
  }
}

export default function SecurityDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [timeRange, setTimeRange] = useState<string>('24h')
  
  // Load security events
  useEffect(() => {
    async function loadSecurityEvents() {
      setLoading(true)
      
      try {
        const supabase = createClient()
        
        // Calculate time range
        let timeFilter = new Date()
        switch (timeRange) {
          case '24h':
            timeFilter.setHours(timeFilter.getHours() - 24)
            break
          case '7d':
            timeFilter.setDate(timeFilter.getDate() - 7)
            break
          case '30d':
            timeFilter.setDate(timeFilter.getDate() - 30)
            break
          default:
            timeFilter.setHours(timeFilter.getHours() - 24)
        }
        
        // Build query
        let query = supabase
          .from('security_logs')
          .select(`
            *,
            user:user_id (
              full_name,
              email
            )
          `)
          .gte('created_at', timeFilter.toISOString())
          .order('created_at', { ascending: false })
        
        // Apply severity filter
        if (filter !== 'all') {
          query = query.eq('severity', filter)
        }
        
        // Apply search filter if provided
        if (searchTerm) {
          query = query.or(`ip_address.ilike.%${searchTerm}%,user_id.eq.${searchTerm},event_type.ilike.%${searchTerm}%`)
        }
        
        const { data, error } = await query
        
        if (error) {
          console.error('Error loading security events:', error)
          return
        }
        
        setEvents(data || [])
      } catch (error) {
        console.error('Unexpected error:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadSecurityEvents()
  }, [filter, timeRange, searchTerm])
  
  // Get severity icon
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <ShieldAlert className="h-5 w-5 text-destructive" />
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-destructive" />
      case 'medium':
        return <AlertCircle className="h-5 w-5 text-amber-500" />
      case 'low':
        return <ShieldCheck className="h-5 w-5 text-muted-foreground" />
      default:
        return <Shield className="h-5 w-5" />
    }
  }
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ar-EG')
  }
  
  // Get event count by severity
  const getEventCountBySeverity = (severity: string) => {
    return events.filter(event => event.severity === severity).length
  }
  
  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">لوحة الأمان</h1>
          <Button onClick={() => router.refresh()}>
            <Clock className="mr-2 h-4 w-4" />
            تحديث
          </Button>
        </div>
        
        {/* Stats cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">أحداث حرجة</CardTitle>
              <ShieldAlert className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getEventCountBySeverity('critical')}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">أحداث عالية الخطورة</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getEventCountBySeverity('high')}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">أحداث متوسطة الخطورة</CardTitle>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getEventCountBySeverity('medium')}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">أحداث منخفضة الخطورة</CardTitle>
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getEventCountBySeverity('low')}</div>
            </CardContent>
          </Card>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Tabs value={filter} onValueChange={setFilter} className="w-full md:w-auto">
              <TabsList>
                <TabsTrigger value="all">الكل</TabsTrigger>
                <TabsTrigger value="critical">حرجة</TabsTrigger>
                <TabsTrigger value="high">عالية</TabsTrigger>
                <TabsTrigger value="medium">متوسطة</TabsTrigger>
                <TabsTrigger value="low">منخفضة</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <Tabs value={timeRange} onValueChange={setTimeRange} className="w-full md:w-auto">
              <TabsList>
                <TabsTrigger value="24h">24 ساعة</TabsTrigger>
                <TabsTrigger value="7d">7 أيام</TabsTrigger>
                <TabsTrigger value="30d">30 يوم</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {/* Security events table */}
        <Card>
          <CardHeader>
            <CardTitle>سجل أحداث الأمان</CardTitle>
            <CardDescription>
              عرض أحداث الأمان المسجلة في النظام
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد أحداث أمنية مسجلة
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الخطورة</TableHead>
                      <TableHead>نوع الحدث</TableHead>
                      <TableHead>المستخدم</TableHead>
                      <TableHead>عنوان IP</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>التفاصيل</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getSeverityIcon(event.severity)}
                            <span>{event.severity}</span>
                          </div>
                        </TableCell>
                        <TableCell>{event.event_type}</TableCell>
                        <TableCell>
                          {event.user ? (
                            <div className="flex flex-col">
                              <span>{event.user.full_name}</span>
                              <span className="text-xs text-muted-foreground">{event.user.email}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{event.ip_address || '-'}</TableCell>
                        <TableCell>{formatDate(event.created_at)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => alert(JSON.stringify(event.details, null, 2))}>
                            عرض
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
} 