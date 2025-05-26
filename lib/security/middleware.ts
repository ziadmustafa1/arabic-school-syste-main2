import { NextResponse, type NextRequest } from 'next/server'
import { SECURITY_HEADERS, RATE_LIMITS, CSRF_CONFIG } from './config'
import { generateCSRFToken } from './utils'

// Simple in-memory storage for rate limiting
// In production, this should use Redis or a similar distributed store
const loginAttempts: Record<string, { count: number; firstAttempt: number; blocked: boolean; blockExpiry: number }> = {}
const apiRequests: Record<string, { count: number; timestamp: number }> = {}

// Clean up the rate limiting records periodically
setInterval(() => {
  const now = Date.now()
  
  // Clean login attempts older than the window
  Object.keys(loginAttempts).forEach(ip => {
    if (now - loginAttempts[ip].firstAttempt > RATE_LIMITS.LOGIN_WINDOW_MINUTES * 60 * 1000) {
      if (!loginAttempts[ip].blocked) {
        delete loginAttempts[ip]
      } else if (now > loginAttempts[ip].blockExpiry) {
        delete loginAttempts[ip]
      }
    }
  })
  
  // Clean API requests older than the window
  Object.keys(apiRequests).forEach(key => {
    if (now - apiRequests[key].timestamp > RATE_LIMITS.API_REQUESTS_WINDOW * 1000) {
      delete apiRequests[key]
    }
  })
}, 60000) // Clean every minute

export async function securityMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Get client IP address - use X-Forwarded-For header or fallback to a default
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                  request.headers.get('x-real-ip') || 
                  '0.0.0.0'
  
  // Create response with security headers
  const response = NextResponse.next()
  
  // Add all security headers
  Object.entries(SECURITY_HEADERS).forEach(([name, value]) => {
    response.headers.set(name, value)
  })
  
  // Check if this is a login request
  if (pathname === '/auth/login' && request.method === 'POST') {
    // Rate limit login attempts
    if (!loginAttempts[clientIp]) {
      loginAttempts[clientIp] = { count: 0, firstAttempt: Date.now(), blocked: false, blockExpiry: 0 }
    }
    
    const attempt = loginAttempts[clientIp]
    
    // Check if blocked
    if (attempt.blocked) {
      if (Date.now() < attempt.blockExpiry) {
        return new NextResponse(
          JSON.stringify({ 
            error: 'Too many login attempts. Please try again later.' 
          }),
          { 
            status: 429,
            headers: { 
              'Content-Type': 'application/json',
              'Retry-After': Math.ceil((attempt.blockExpiry - Date.now()) / 1000).toString()
            }
          }
        )
      } else {
        // Block expired, reset
        attempt.blocked = false
        attempt.count = 1
        attempt.firstAttempt = Date.now()
      }
    } else {
      // Increment attempt counter
      attempt.count++
      
      // Check if too many attempts
      if (attempt.count > RATE_LIMITS.LOGIN_MAX_ATTEMPTS) {
        attempt.blocked = true
        attempt.blockExpiry = Date.now() + RATE_LIMITS.LOGIN_BLOCK_MINUTES * 60 * 1000
        
        return new NextResponse(
          JSON.stringify({ 
            error: 'Too many login attempts. Please try again later.' 
          }),
          { 
            status: 429,
            headers: { 
              'Content-Type': 'application/json',
              'Retry-After': (RATE_LIMITS.LOGIN_BLOCK_MINUTES * 60).toString()
            }
          }
        )
      }
    }
  }
  
  // Check if this is an API request
  if (pathname.startsWith('/api/')) {
    // Create a unique key for the rate limiter (combine IP and path)
    const rateLimitKey = `${clientIp}:${pathname}`
    
    // Check existing requests
    if (!apiRequests[rateLimitKey]) {
      apiRequests[rateLimitKey] = { count: 1, timestamp: Date.now() }
    } else {
      // Check if window has passed
      if (Date.now() - apiRequests[rateLimitKey].timestamp > RATE_LIMITS.API_REQUESTS_WINDOW * 1000) {
        // Reset
        apiRequests[rateLimitKey] = { count: 1, timestamp: Date.now() }
      } else {
        // Increment
        apiRequests[rateLimitKey].count++
        
        // Check if too many requests
        if (apiRequests[rateLimitKey].count > RATE_LIMITS.API_MAX_REQUESTS) {
          return new NextResponse(
            JSON.stringify({ error: 'Rate limit exceeded' }),
            { 
              status: 429,
              headers: { 
                'Content-Type': 'application/json',
                'Retry-After': RATE_LIMITS.API_REQUESTS_WINDOW.toString()
              }
            }
          )
        }
      }
    }
  }
  
  // Add CSRF protection for non-GET requests
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    // Get CSRF token from cookie
    const csrfCookie = request.cookies.get(CSRF_CONFIG.COOKIE_NAME)
    
    // Check CSRF token for non-API requests (assume API requests use a different auth mechanism)
    if (!pathname.startsWith('/api/') && !pathname.startsWith('/auth/')) {
      // Check if token in header matches cookie
      const csrfHeader = request.headers.get(CSRF_CONFIG.HEADER_NAME)
      
      if (!csrfCookie?.value || !csrfHeader || csrfCookie.value !== csrfHeader) {
        return new NextResponse(
          JSON.stringify({ error: 'Invalid CSRF token' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }
  } else if (request.method === 'GET' && !pathname.startsWith('/api/')) {
    // For GET requests, set a CSRF token cookie if it doesn't exist
    if (!request.cookies.get(CSRF_CONFIG.COOKIE_NAME)) {
      const token = await generateCSRFToken()
      response.cookies.set({
        name: CSRF_CONFIG.COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: CSRF_CONFIG.EXPIRY_MINUTES * 60,
        path: '/'
      })
    }
  }
  
  return response
} 