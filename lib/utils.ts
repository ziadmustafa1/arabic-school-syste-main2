import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date string to a more readable format
 */
export function formatDate(dateString: string) {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("ar-SA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date)
}

/**
 * Format time string
 */
export function formatTime(dateString: string) {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("ar-SA", {
    hour: "numeric",
    minute: "numeric",
  }).format(date)
}

/**
 * Handle API error and return a consistent error message
 */
export function handleError(error: any, defaultMessage = "حدث خطأ غير متوقع"): string {
  console.error("API Error:", error)
  
  if (typeof error === "string") {
    return error
  }
  
  if (error instanceof Error) {
    return error.message
  }
  
  if (error && error.message) {
    return error.message
  }
  
  return defaultMessage
}

/**
 * Create a consistent response object
 */
export function createResponse<T>(success: boolean, data?: T, message?: string) {
  return {
    success,
    data: data || null,
    message: message || (success ? "تمت العملية بنجاح" : "حدث خطأ أثناء العملية"),
  }
}

/**
 * Truncate text to a specific length
 */
export function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text
  return `${text.substring(0, maxLength)}...`
}

/**
 * Calculate readable time since date
 */
export function timeSince(date: string | Date) {
  const now = new Date()
  const then = new Date(date)
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)
  
  if (seconds < 60) return "الآن"
  
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `منذ ${minutes} دقيقة`
  
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `منذ ${hours} ساعة`
  
  const days = Math.floor(hours / 24)
  if (days < 30) return `منذ ${days} يوم`
  
  const months = Math.floor(days / 30)
  if (months < 12) return `منذ ${months} شهر`
  
  const years = Math.floor(months / 12)
  return `منذ ${years} سنة`
}

// Generate a random user code based on role code (ST, PA, TE, PR)
export function generateUserCode(roleCode: string): string {
  // Generate 5 random digits
  const randomDigits = Math.floor(10000 + Math.random() * 90000).toString()
  return `${roleCode}${randomDigits}`
}

// Format points with Arabic numerals
export function formatPoints(points: number): string {
  return points.toLocaleString("ar-EG")
}

// Get user role name by role ID
export async function getRoleName(roleId: number): Promise<string> {
  const roles = {
    1: "طالب",
    2: "ولي أمر",
    3: "معلم",
    4: "مدير",
  }

  return roles[roleId as keyof typeof roles] || ""
}

// Get role code by role ID
export function getRoleCode(roleId: number): string {
  const roleCodes = {
    1: "ST",
    2: "PA",
    3: "TE",
    4: "PR",
  }

  return roleCodes[roleId as keyof typeof roleCodes] || ""
}

// Get dashboard path by role ID
export function getDashboardPath(roleId: number): string {
  const paths = {
    1: "/student",
    2: "/parent",
    3: "/teacher",
    4: "/admin",
  }

  return paths[roleId as keyof typeof paths] || "/"
}
