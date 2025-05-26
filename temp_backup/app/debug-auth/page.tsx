"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DebugAuthPage() {
  const supabase = createClient()
  const [authStatus, setAuthStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [apiResponse, setApiResponse] = useState<any>(null)
  const [usersApiResponse, setUsersApiResponse] = useState<any>(null)
  
  useEffect(() => {
    async function checkAuth() {
      try {
        setLoading(true)
        
        // Get current session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        
        // Get current user
        const { data: userData, error: userError } = await supabase.auth.getUser()
        
        setAuthStatus({
          session: sessionData?.session ? {
            id: sessionData.session.user.id,
            email: sessionData.session.user.email,
            role: sessionData.session.user.app_metadata?.role,
            expiresAt: sessionData.session.expires_at
          } : null,
          user: userData?.user ? {
            id: userData.user.id,
            email: userData.user.email,
            role: userData.user.app_metadata?.role
          } : null,
          sessionError: sessionError?.message,
          userError: userError?.message
        })
      } catch (error) {
        console.error("Error checking auth:", error)
        setAuthStatus({ error: String(error) })
      } finally {
        setLoading(false)
      }
    }
    
    checkAuth()
  }, [supabase])
  
  const checkAuthEndpoint = async () => {
    try {
      const response = await fetch('/api/debug/check-auth')
      const data = await response.json()
      setApiResponse(data)
    } catch (error) {
      console.error("Error checking auth endpoint:", error)
      setApiResponse({ error: String(error) })
    }
  }
  
  const checkUsersApi = async () => {
    try {
      const userId = authStatus?.user?.id || 'unknown'
      const response = await fetch(`/api/users?excludeId=${userId}`)
      const data = await response.json()
      setUsersApiResponse(data)
    } catch (error) {
      console.error("Error checking users API:", error)
      setUsersApiResponse({ error: String(error) })
    }
  }
  
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Auth Debugging Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Client-side Auth Status</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading...</p>
            ) : (
              <pre className="bg-muted p-4 rounded-md overflow-auto max-h-96">
                {JSON.stringify(authStatus, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between">
              <span>Auth API Check</span>
              <Button onClick={checkAuthEndpoint}>Check Auth API</Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!apiResponse ? (
              <p>Click the button to check auth API</p>
            ) : (
              <pre className="bg-muted p-4 rounded-md overflow-auto max-h-96">
                {JSON.stringify(apiResponse, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between">
              <span>Users API Check</span>
              <Button onClick={checkUsersApi}>Check Users API</Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!usersApiResponse ? (
              <p>Click the button to check users API</p>
            ) : (
              <pre className="bg-muted p-4 rounded-md overflow-auto max-h-96">
                {JSON.stringify(usersApiResponse, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 