import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Award, BarChart2, BookOpen, CreditCard, Settings, Users, Gift, BadgeCheck } from "lucide-react"

export default function AdminDashboard() {
  return (
    <div className="container px-4 py-4 sm:py-6 mx-auto">
      <h1 className="mb-4 sm:mb-6 text-xl sm:text-2xl font-bold">لوحة تحكم المدير</h1>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="flex flex-col h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-3">
            <CardTitle className="text-sm font-medium">إدارة المستخدمين</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex-grow px-4 py-2">
            <p className="text-base sm:text-xl font-bold">المستخدمين</p>
            <p className="text-xs text-muted-foreground">إدارة حسابات الطلاب والمعلمين وأولياء الأمور</p>
          </CardContent>
          <CardFooter className="px-4 pb-3 pt-0">
            <Link href="/admin/users" className="w-full">
              <Button className="w-full text-sm" size="sm">إدارة المستخدمين</Button>
            </Link>
          </CardFooter>
        </Card>

        <Card className="flex flex-col h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-3">
            <CardTitle className="text-sm font-medium">فئات النقاط</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex-grow px-4 py-2">
            <p className="text-base sm:text-xl font-bold">فئات النقاط</p>
            <p className="text-xs text-muted-foreground">إدارة فئات النقاط وتحديد قيمها الافتراضية</p>
          </CardContent>
          <CardFooter className="px-4 pb-3 pt-0">
            <Link href="/admin/points-categories" className="w-full">
              <Button className="w-full text-sm" size="sm">إدارة فئات النقاط</Button>
            </Link>
          </CardFooter>
        </Card>

        <Card className="flex flex-col h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-3">
            <CardTitle className="text-sm font-medium">بطاقات الشحن</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex-grow px-4 py-2">
            <p className="text-base sm:text-xl font-bold">بطاقات الشحن</p>
            <p className="text-xs text-muted-foreground">إنشاء وإدارة بطاقات شحن النقاط</p>
          </CardContent>
          <CardFooter className="px-4 pb-3 pt-0">
            <Link href="/admin/cards" className="w-full">
              <Button className="w-full text-sm" size="sm">إدارة بطاقات الشحن</Button>
            </Link>
          </CardFooter>
        </Card>

        <Card className="flex flex-col h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-3">
            <CardTitle className="text-sm font-medium">المكافآت</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex-grow px-4 py-2">
            <p className="text-base sm:text-xl font-bold">المكافآت</p>
            <p className="text-xs text-muted-foreground">إدارة مكافآت النقاط لكل الأدوار (طلاب، معلمين، أولياء أمور)</p>
          </CardContent>
          <CardFooter className="px-4 pb-3 pt-0">
            <Link href="/admin/rewards" className="w-full">
              <Button className="w-full text-sm" size="sm">إدارة المكافآت</Button>
            </Link>
          </CardFooter>
        </Card>

        <Card className="flex flex-col h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-3">
            <CardTitle className="text-sm font-medium">المواد الدراسية</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex-grow px-4 py-2">
            <p className="text-base sm:text-xl font-bold">المواد الدراسية</p>
            <p className="text-xs text-muted-foreground">إدارة المواد الدراسية وتخصيصها للمعلمين</p>
          </CardContent>
          <CardFooter className="px-4 pb-3 pt-0">
            <Link href="/admin/subjects" className="w-full">
              <Button className="w-full text-sm" size="sm">إدارة المواد الدراسية</Button>
            </Link>
          </CardFooter>
        </Card>

        <Card className="flex flex-col h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-3">
            <CardTitle className="text-sm font-medium">التقارير</CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex-grow px-4 py-2">
            <p className="text-base sm:text-xl font-bold">التقارير</p>
            <p className="text-xs text-muted-foreground">عرض تقارير النقاط والنشاطات</p>
          </CardContent>
          <CardFooter className="px-4 pb-3 pt-0">
            <Link href="/admin/reports" className="w-full">
              <Button className="w-full text-sm" size="sm">عرض التقارير</Button>
            </Link>
          </CardFooter>
        </Card>

        <Card className="flex flex-col h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-3">
            <CardTitle className="text-sm font-medium">إعدادات النظام</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex-grow px-4 py-2">
            <p className="text-base sm:text-xl font-bold">الإعدادات</p>
            <p className="text-xs text-muted-foreground">تخصيص إعدادات النظام</p>
          </CardContent>
          <CardFooter className="px-4 pb-3 pt-0">
            <Link href="/admin/settings" className="w-full">
              <Button className="w-full text-sm" size="sm">إدارة الإعدادات</Button>
            </Link>
          </CardFooter>
        </Card>

        <Card className="flex flex-col h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-3">
            <CardTitle className="text-sm font-medium">الشارات</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex-grow px-4 py-2">
            <p className="text-base sm:text-xl font-bold">الشارات</p>
            <p className="text-xs text-muted-foreground">إدارة شارات النقاط والإنجازات</p>
          </CardContent>
          <CardFooter className="px-4 pb-3 pt-0">
            <Link href="/admin/badges" className="w-full">
              <Button className="w-full text-sm" size="sm">إدارة الشارات</Button>
            </Link>
          </CardFooter>
        </Card>

        <Card className="flex flex-col h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-3">
            <CardTitle className="text-sm font-medium">الأوسمة</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex-grow px-4 py-2">
            <p className="text-base sm:text-xl font-bold">الأوسمة</p>
            <p className="text-xs text-muted-foreground">إدارة أوسمة التميز والإنجازات</p>
          </CardContent>
          <CardFooter className="px-4 pb-3 pt-0">
            <Link href="/admin/medals" className="w-full">
              <Button className="w-full text-sm" size="sm">إدارة الأوسمة</Button>
            </Link>
          </CardFooter>
        </Card>
        
        <Card className="flex flex-col h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-3">
            <CardTitle className="text-sm font-medium">شارات المكافآت</CardTitle>
            <BadgeCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex-grow px-4 py-2">
            <p className="text-base sm:text-xl font-bold">شارات المكافآت</p>
            <p className="text-xs text-muted-foreground">إدارة شارات تضيف نقاط للمستخدم</p>
          </CardContent>
          <CardFooter className="px-4 pb-3 pt-0">
            <Link href="/admin/emblems" className="w-full">
              <Button className="w-full text-sm" size="sm">إدارة شارات المكافآت</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
