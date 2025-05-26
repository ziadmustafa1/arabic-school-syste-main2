import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// Create a Supabase client with admin privileges using service role key
const adminSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 })
    }

    // Get user by email
    const { data: users, error: userError } = await adminSupabase.auth.admin.listUsers()

    if (userError) {
      console.error("Error listing users:", userError)
      return NextResponse.json({ success: false, error: userError.message }, { status: 500 })
    }

    const user = users?.users?.find((u) => u.email === email)

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    // Update user to confirm email
    const { error: updateError } = await adminSupabase.auth.admin.updateUserById(user.id, {
      email_confirm: true,
      user_metadata: { email_confirmed: true },
    })

    if (updateError) {
      console.error("Error confirming email:", updateError)
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, userId: user.id })
  } catch (error: any) {
    console.error("Error in confirm-email API:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
