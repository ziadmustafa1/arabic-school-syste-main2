"use client"

import { useState } from "react"
import { register } from "@/lib/actions/auth"
import { useRouter } from "next/navigation"

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await register(formData)
      
      if (result?.error) {
        setError(result.error)
      } else if (result?.success) {
        // Registration successful, redirect to login
        router.push("/auth/login?registered=true")
      }
    } catch (err) {
      setError("حدث خطأ أثناء التسجيل")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-8">
      <div className="w-full max-w-md space-y-8 rounded-lg border bg-white p-6 shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold">إنشاء حساب جديد</h1>
          <p className="text-gray-600">أنشئ حسابك في نظام المدرسة</p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 text-right">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form action={handleSubmit} className="space-y-6">
          <div className="space-y-2 text-right">
            <label htmlFor="name" className="block text-sm font-medium">
              الاسم الكامل
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="w-full rounded-md border p-2 text-right"
              placeholder="محمد أحمد"
              dir="rtl"
            />
          </div>
          
          <div className="space-y-2 text-right">
            <label htmlFor="email" className="block text-sm font-medium">
              البريد الإلكتروني
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-md border p-2 text-right"
              placeholder="email@example.com"
              dir="rtl"
            />
          </div>

          <div className="space-y-2 text-right">
            <label htmlFor="password" className="block text-sm font-medium">
              كلمة المرور
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-md border p-2 text-right"
              placeholder="••••••••"
              dir="rtl"
            />
          </div>

          <div className="space-y-2 text-right">
            <label htmlFor="role_id" className="block text-sm font-medium">
              نوع الحساب
            </label>
            <select
              id="role_id"
              name="role_id"
              required
              className="w-full rounded-md border p-2 text-right"
              dir="rtl"
            >
              <option value="1">طالب</option>
              <option value="2">ولي أمر</option>
              <option value="3">معلم</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:bg-blue-300"
          >
            {isLoading ? "جاري التسجيل..." : "تسجيل"}
          </button>
        </form>

        <div className="text-center text-sm">
          <a href="/auth/login" className="text-blue-600 hover:underline">
            لديك حساب بالفعل؟ قم بتسجيل الدخول
          </a>
        </div>
      </div>
    </div>
  )
}
