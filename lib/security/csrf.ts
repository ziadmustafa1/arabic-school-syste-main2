import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { CSRF_CONFIG } from "./config"
import { generateCSRFToken } from "./utils"

/**
 * Middleware to handle CSRF token validation
 */
export function withCsrf(handler: Function) {
  return async (req: NextRequest) => {
    // Skip CSRF check for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return handler(req)
    }
    
    const cookieStore = cookies()
    const csrfCookie = cookieStore.get(CSRF_CONFIG.COOKIE_NAME)
    const csrfHeader = req.headers.get(CSRF_CONFIG.HEADER_NAME)
    
    // Validate CSRF token
    if (!csrfCookie?.value || !csrfHeader || csrfCookie.value !== csrfHeader) {
      return NextResponse.json(
        { error: 'Invalid or missing CSRF token' },
        { status: 403 }
      )
    }
    
    // CSRF is valid, proceed with the handler
    return handler(req)
  }
}

/**
 * Generate a new CSRF token and set it as a cookie
 */
export async function generateCsrfToken() {
  const token = generateCSRFToken()
  const cookieStore = cookies()
  
  cookieStore.set(CSRF_CONFIG.COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: CSRF_CONFIG.EXPIRY_MINUTES * 60,
    path: '/'
  })
  
  return token
}

/**
 * Get the current CSRF token from cookies or generate a new one
 */
export async function getCsrfToken() {
  const cookieStore = cookies()
  const existingToken = cookieStore.get(CSRF_CONFIG.COOKIE_NAME)
  
  if (existingToken) {
    return existingToken.value
  }
  
  return generateCsrfToken()
} 