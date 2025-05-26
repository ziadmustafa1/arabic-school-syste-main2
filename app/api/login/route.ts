import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient as createSupabaseClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Email and password are required" }, { status: 400 })
    }

    // Create a Supabase client with the cookies
    const supabase = await createSupabaseClient()

    // Create admin client for operations that require admin privileges
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!, 
      {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      }
    )

    // Check if user exists
    const { data: users, error: userError } = await adminSupabase.auth.admin.listUsers()

    if (userError) {
      console.error("Error listing users:", userError)
      return NextResponse.json({ success: false, error: userError.message }, { status: 500 })
    }

    const user = users?.users?.find((u) => u.email === email)

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    // Update user to confirm email if needed
    if (!user.email_confirmed_at) {
      await adminSupabase.auth.admin.updateUserById(user.id, {
        email_confirm: true,
        user_metadata: { email_confirmed: true },
      })
    }

    // Sign in the user using the route handler client to properly set cookies
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error("Login error:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 401 })
    }

    if (!data.user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    // Get user role to redirect to appropriate dashboard
    const { data: userData, error: userDataError } = await supabase
      .from("users")
      .select("role_id")
      .eq("id", data.user.id)
      .single()

    if (userDataError) {
      console.error("User data fetch error:", userDataError)
      return NextResponse.json({ success: false, error: userDataError.message }, { status: 500 })
    }

    // Determine redirect path
    const dashboardPaths = {
      1: "/student",
      2: "/parent",
      3: "/teacher",
      4: "/admin",
    }

    const redirectUrl = dashboardPaths[userData.role_id as keyof typeof dashboardPaths] || "/"

    return NextResponse.json({
      success: true,
      userId: data.user.id,
      redirectUrl,
    })
  } catch (error: any) {
    console.error("Error in login API:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
