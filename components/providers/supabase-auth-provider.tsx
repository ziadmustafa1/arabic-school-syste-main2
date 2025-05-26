"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { User } from "@supabase/supabase-js"

interface AuthContextProps {
  user: User | null
  isLoading: boolean
  error: string | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  isLoading: true,
  error: null,
  signOut: async () => {},
})

export const useAuth = () => useContext(AuthContext)

export default function SupabaseAuthProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true)
        
        // Get user session
        const {
          data: { session },
        } = await supabase.auth.getSession()
        
        if (session?.user) {
          setUser(session.user)
        }
      } catch (error) {
        console.error("Error initializing auth:", error)
        setError("Failed to initialize authentication")
      } finally {
        setIsLoading(false)
      }
    }

    initialize()

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
    } catch (error) {
      console.error("Error signing out:", error)
      setError("Failed to sign out")
    }
  }

  const value = {
    user,
    isLoading,
    error,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
} 