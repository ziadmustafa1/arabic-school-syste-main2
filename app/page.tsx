import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function Home() {
  try {
    const supabase = await createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth/login")
  }

  // If user is logged in, get their role and redirect to appropriate dashboard
  const { data: userData } = await supabase.from("users").select("role_id").eq("id", session.user.id).single()

  if (userData) {
    const dashboardPaths = {
      1: "/student",
      2: "/parent",
      3: "/teacher",
      4: "/admin",
    }

    const path = dashboardPaths[userData.role_id as keyof typeof dashboardPaths] || "/auth/login"
    redirect(path)
  }

  redirect("/auth/login")
  } catch (error) {
    console.error("Error in Home page:", error)
    redirect("/auth/login")
  }
}
