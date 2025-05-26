"use client"

import { useState } from "react"
import { UserSelector } from "@/components/ui/user-selector"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { DashboardLayout } from "@/components/dashboard-layout"

export default function UserSelectorExample() {
  const [selectedUser, setSelectedUser] = useState<string>("")
  const [selectedStudent, setSelectedStudent] = useState<string>("")
  const [selectedTeacher, setSelectedTeacher] = useState<string>("")
  const [selectedParent, setSelectedParent] = useState<string>("")

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">مثال اختيار المستخدمين</h1>
        
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>اختيار جميع المستخدمين</CardTitle>
              <CardDescription>
                يعرض هذا المكون جميع المستخدمين مع إمكانية التصفية
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="all-users">اختر مستخدم</Label>
                <UserSelector
                  value={selectedUser}
                  onChange={setSelectedUser}
                  placeholder="اختر أي مستخدم..."
                />

                {selectedUser && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-md">
                    <p className="text-sm text-gray-700">
                      <span className="font-bold">المستخدم المحدد:</span> {selectedUser}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>اختيار طالب فقط</CardTitle>
              <CardDescription>
                يعرض هذا المكون الطلاب فقط
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="students-only">اختر طالب</Label>
                <UserSelector
                  value={selectedStudent}
                  onChange={setSelectedStudent}
                  placeholder="اختر طالب..."
                  roles={[1]} // 1 = طالب
                />

                {selectedStudent && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-md">
                    <p className="text-sm text-gray-700">
                      <span className="font-bold">الطالب المحدد:</span> {selectedStudent}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>اختيار مدرس فقط</CardTitle>
              <CardDescription>
                يعرض هذا المكون المدرسين فقط
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="teachers-only">اختر مدرس</Label>
                <UserSelector
                  value={selectedTeacher}
                  onChange={setSelectedTeacher}
                  placeholder="اختر مدرس..."
                  roles={[3]} // 3 = مدرس
                />

                {selectedTeacher && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-md">
                    <p className="text-sm text-gray-700">
                      <span className="font-bold">المدرس المحدد:</span> {selectedTeacher}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>اختيار ولي أمر فقط</CardTitle>
              <CardDescription>
                يعرض هذا المكون أولياء الأمور فقط
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="parents-only">اختر ولي أمر</Label>
                <UserSelector
                  value={selectedParent}
                  onChange={setSelectedParent}
                  placeholder="اختر ولي أمر..."
                  roles={[2]} // 2 = ولي أمر
                />

                {selectedParent && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-md">
                    <p className="text-sm text-gray-700">
                      <span className="font-bold">ولي الأمر المحدد:</span> {selectedParent}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
} 