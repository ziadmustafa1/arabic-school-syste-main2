# Security Module for Arabic School System

This module provides comprehensive security features for the Arabic School System application. It implements various security best practices to protect against common web vulnerabilities and attacks.

## Features

### 1. Security Headers
- Content Security Policy (CSP) to prevent XSS attacks
- X-Content-Type-Options to prevent MIME type sniffing
- X-Frame-Options to prevent clickjacking
- X-XSS-Protection for additional XSS protection
- Referrer-Policy to control referrer information
- Permissions-Policy to control browser features
- Strict-Transport-Security for HTTPS enforcement

### 2. CSRF Protection
- Token-based CSRF protection for all forms and API requests
- Automatic token generation and validation
- React components for easy integration with forms

### 3. Input Validation & Sanitization
- Server-side input sanitization to prevent XSS and injection attacks
- Client-side input validation and sanitization components
- Password strength validation

### 4. Rate Limiting
- Protection against brute force attacks
- API rate limiting to prevent abuse
- Login attempt limiting

### 5. Security Logging
- Comprehensive security event logging
- Suspicious activity detection
- Admin dashboard for security monitoring

### 6. Database Security
- Row Level Security (RLS) policies
- Proper data access controls
- Audit logging

## How to Use

### Basic Setup

The security features are automatically enabled through the middleware. No additional configuration is needed for basic protection.

### Using Secure Components

#### CSRF Protection in Forms

```tsx
import { SecureForm } from '@/components/security/secure-form'

export function MyForm() {
  const handleSubmit = async (formData: FormData) => {
    // Process form data
  }
  
  return (
    <SecureForm onSubmit={handleSubmit}>
      {/* Form fields */}
      <input name="field1" />
      <button type="submit">Submit</button>
    </SecureForm>
  )
}
```

#### Secure Input Component

```tsx
import { SecureInput } from '@/components/security/secure-input'

export function MyComponent() {
  return (
    <SecureInput 
      name="username" 
      sanitize={true} 
      onChange={(value) => console.log(value)}
    />
  )
}
```

### Security Logging

```tsx
import { logSecurityEvent, SecurityEventType } from '@/lib/security/logger'

// Log a security event
await logSecurityEvent({
  event_type: SecurityEventType.SUSPICIOUS_ACTIVITY,
  user_id: userId,
  ip_address: clientIp,
  details: { reason: 'Unusual login pattern' },
  severity: 'high'
})
```

### Password Validation

```tsx
import { validatePassword } from '@/lib/security/utils'

const { isValid, message } = validatePassword(userPassword)
if (!isValid) {
  // Show error message to user
}
```

## Security Dashboard

An admin security dashboard is available at `/admin/security`. This dashboard provides:

- Overview of security events
- Filtering by severity and time range
- Detailed event logs
- User activity monitoring

## Configuration

Security settings can be configured in `lib/security/config.ts`. The following settings can be adjusted:

- Password policy requirements
- Rate limiting thresholds
- CSRF token settings
- Cookie security settings
- Session timeouts

## Best Practices

1. Always use the secure components provided by this module
2. Validate and sanitize all user inputs
3. Use proper authentication checks for protected routes
4. Monitor the security dashboard regularly
5. Keep dependencies updated
6. Follow the principle of least privilege for database access

## Security Maintenance

- Regularly review security logs
- Update security policies as needed
- Test for vulnerabilities periodically
- Keep the security module updated with latest patches 