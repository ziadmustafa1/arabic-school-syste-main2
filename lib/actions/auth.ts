"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { generateUserCode, getRoleCode } from "@/lib/utils"
import type { UserWithRole } from "@/lib/utils/auth-compat"

// Login with email and password
export async function login(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  try {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error("Authentication error:", error)
      return { error: error.message }
    }

    console.log("Authentication successful for user ID:", data.user.id)

    // Use admin client to bypass RLS policies
    const adminClient = await createAdminClient()

    // Get user role to redirect to appropriate dashboard
    const { data: userData, error: userError } = await adminClient
      .from("users")
      .select("role_id, is_confirmed, is_banned, ban_until")
      .eq("id", data.user.id)
      .single()

    if (userError) {
      console.error("Database error:", userError.message, "for user ID:", data.user.id)
      
      // Check if the user exists in the users table using admin client
      const { count, error: countError } = await adminClient
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("id", data.user.id)
      
      if (countError) {
        console.error("Error checking user existence:", countError)
      } else if (count === 0) {
        console.log("Creating missing user record")
        // Default to student role (1)
        const role_id = 1
        const roleCode = getRoleCode(role_id)
        const userCode = generateUserCode(roleCode)
        
        const { error: insertError } = await adminClient
          .from("users")
          .insert({
            id: data.user.id,
            email: data.user.email || email,
            full_name: data.user.user_metadata?.full_name || email.split('@')[0],
            role_id: role_id,
            user_code: userCode,
            is_confirmed: false, // New accounts need confirmation
          })
          
        if (insertError) {
          console.error("Error creating user record:", insertError)
          return { error: "حدث خطأ أثناء إنشاء سجل المستخدم" }
        }
        
        // Sign out the user since they need confirmation
        await supabase.auth.signOut()
        return { error: "حسابك بحاجة إلى موافقة الإدارة قبل تسجيل الدخول" }
      }
      
      return { error: "حدث خطأ أثناء جلب معلومات المستخدم" }
    }
    
    // Check if user account is confirmed
    if (!userData.is_confirmed) {
      // Sign out the user
      await supabase.auth.signOut()
      return { error: "حسابك بحاجة إلى موافقة الإدارة قبل تسجيل الدخول" }
    }
    
    // Check if user is banned
    if (userData.is_banned) {
      // Check if ban has expired
      if (userData.ban_until) {
        const banUntil = new Date(userData.ban_until)
        const now = new Date()
        
        if (banUntil > now) {
          // Ban is still active
          await supabase.auth.signOut()
          return { error: `حسابك محظور حتى ${banUntil.toLocaleString('ar-EG')}` }
        } else {
          // Ban has expired, remove it
          await adminClient
            .from("users")
            .update({
              is_banned: false,
              ban_until: null
            })
            .eq("id", data.user.id)
        }
      } else {
        // Permanent ban
        await supabase.auth.signOut()
        return { error: "حسابك محظور بشكل دائم. يرجى التواصل مع الإدارة." }
      }
    }

    const dashboardPaths = {
      1: "/student",
      2: "/parent",
      3: "/teacher",
      4: "/admin",
    }

    const path = dashboardPaths[userData.role_id as keyof typeof dashboardPaths] || "/"
    // Return the path instead of redirecting directly
    return { success: true, redirectTo: path }
  } catch (err) {
    // Check if this is a redirect error from Next.js
    if (err instanceof Error && (err as any).digest?.startsWith('NEXT_REDIRECT')) {
      // This is just a redirect, not an actual error
      // The redirect will happen automatically
      return { success: true }
    }
    
    console.error("Unexpected error during login:", err)
    return { error: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى." }
  }
}

// Register a new user
export async function register(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const name = formData.get("name") as string
  const role_id = Number(formData.get("role_id")) || 1 // Default to student

  const supabase = await createClient()

  // Check if the email is already registered
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle()

  if (existingUser) {
    return { error: "البريد الإلكتروني مسجل بالفعل" }
  }

  // Register the user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  // Create a user record in the users table
  if (data.user) {
    const roleCode = getRoleCode(role_id)
    const userCode = generateUserCode(roleCode)

    const { error: userError } = await supabase
      .from("users")
      .insert({
        id: data.user.id,
        email: email,
        full_name: name,
        role_id: role_id,
        user_code: userCode,
        is_confirmed: false, // Require admin confirmation
      })

    if (userError) {
      return { error: "حدث خطأ أثناء إنشاء سجل المستخدم" }
    }
    
    // Create notification for admin users
    const adminClient = await createAdminClient()
    await adminClient
      .from("notifications")
      .insert({
        user_id: null, // Special case for admin notifications
        title: "حساب جديد يحتاج إلى تأكيد",
        content: `حساب جديد بإسم "${name}" (${email}) يحتاج إلى موافقة الإدارة`,
        type: "new_account",
        reference_id: null,
        admin_only: true
      })
  }

  return { 
    success: true,
    message: "تم إنشاء الحساب بنجاح. جميع الحسابات الجديدة تحتاج إلى موافقة الإدارة قبل أن تتمكن من تسجيل الدخول. سيتم إبلاغك عندما يتم تأكيد حسابك." 
  }
}

// Logout
export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  
  // Clear cookies manually to ensure session is fully removed
  const cookieStore = cookies()
  cookieStore.delete("sb-refresh-token")
  cookieStore.delete("sb-access-token")
  
  // Return success instead of redirecting
  // Client will handle the redirect
  return { success: true }
}

// Get the current session
export async function getSession() {
  const supabase = await createClient()
  return await supabase.auth.getSession()
}

// Get the current user
export async function getUser() {
  const supabase = await createClient()
  return await supabase.auth.getUser()
}

export async function getCurrentUserServer(): Promise<UserWithRole | null> {
  try {
    const supabase = await createAdminClient()
    
    // Get session from cookie
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user?.id) {
      return null
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", session.user.id)
      .single()

    if (error || !user) {
      console.error("Error fetching user data:", error)
      return null
    }

    return user as UserWithRole
  } catch (error) {
    console.error("Error in getCurrentUserServer:", error)
    return null
  }
} 