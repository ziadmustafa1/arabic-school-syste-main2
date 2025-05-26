import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  
  // Sign out from Supabase Auth
  await supabase.auth.signOut()
  
  // Clear cookies manually - cookies() needs to be awaited
  const cookieStore = await cookies()
  
  // Clear all possible Supabase auth-related cookies
  const supabaseCookies = [
    "sb-refresh-token",
    "sb-access-token", 
    "sb-auth-token",
    "supabase-auth-token"
  ]
  
  for (const cookieName of supabaseCookies) {
    try {
      cookieStore.delete(cookieName)
    } catch (e) {
      console.error(`Failed to delete cookie: ${cookieName}`, e)
    }
  }
  
  // Return a redirect response
  return NextResponse.redirect(new URL("/auth/login", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"))
} 