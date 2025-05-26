import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  try {
    // Create a Supabase client configured for middleware
    const res = NextResponse.next()
    const supabase = createMiddlewareClient({ req: request, res })
    
    // Refresh session if it exists (but don't create a new one)
    // Using getUser is more secure than getSession
    await supabase.auth.getUser()
    
    return res
  } catch (error) {
    console.error('Middleware error:', error)
    // Return the original response even if there's an error to avoid breaking navigation
    return NextResponse.next()
  }
}

// Specify which routes the middleware should run on
// Ignoring static files and certain API routes to avoid unnecessary processing
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     * - api/db-check (our database check route)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api/db-check).*)',
  ],
}
