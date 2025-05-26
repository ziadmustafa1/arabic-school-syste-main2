// Security configuration for the Arabic school management system

// Password policy
export const PASSWORD_POLICY = {
  MIN_LENGTH: 10,           // Minimum password length
  REQUIRE_LOWERCASE: true,  // Must contain lowercase letters
  REQUIRE_UPPERCASE: true,  // Must contain uppercase letters
  REQUIRE_NUMBERS: true,    // Must contain numbers
  REQUIRE_SYMBOLS: true,    // Must contain symbols
  MAX_AGE_DAYS: 90,         // Password expiry in days
}

// Rate limiting configuration
export const RATE_LIMITS = {
  LOGIN_MAX_ATTEMPTS: 5,         // Maximum login attempts
  LOGIN_WINDOW_MINUTES: 15,      // Time window for login attempts
  LOGIN_BLOCK_MINUTES: 30,       // Block time after exceeding attempts
  API_REQUESTS_WINDOW: 60,       // Time window for API rate limiting (seconds)
  API_MAX_REQUESTS: 100,         // Maximum requests per window
}

// Security headers
export const SECURITY_HEADERS = {
  'Content-Security-Policy': 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob:; " +
    "font-src 'self'; " +
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co; " +
    "frame-ancestors 'none'; " +
    "form-action 'self';",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload'
}

// CSRF Protection
export const CSRF_CONFIG = {
  SECRET_LENGTH: 32,       // Length of CSRF token
  COOKIE_NAME: 'csrf_token',
  HEADER_NAME: 'X-CSRF-Token',
  EXPIRY_MINUTES: 60       // Token expiry in minutes
}

// Cookie security settings
export const COOKIE_CONFIG = {
  SECURE: true,             // HTTPS only
  HTTP_ONLY: true,          // Not accessible via JavaScript
  SAME_SITE: 'lax' as const,// SameSite policy
  MAX_AGE: 1000 * 60 * 60 * 24 // 1 day in milliseconds
}

// Sensitive data patterns to sanitize in logs
export const SENSITIVE_DATA_PATTERNS = [
  /password/i,
  /token/i,
  /key/i,
  /secret/i,
  /auth/i,
  /credential/i,
]

// Session configuration
export const SESSION_CONFIG = {
  EXPIRY_HOURS: 24,        // Session expiry time
  REFRESH_MINUTES: 15,     // Session refresh interval
  IDLE_TIMEOUT_MINUTES: 30 // Timeout for inactive sessions
} 