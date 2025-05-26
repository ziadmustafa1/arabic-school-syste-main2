import { 
  PASSWORD_POLICY, 
  SENSITIVE_DATA_PATTERNS,
  CSRF_CONFIG
} from './config';

/**
 * Generates random bytes using Web Crypto API
 */
async function getRandomBytes(length: number): Promise<string> {
  const buffer = new Uint8Array(length);
  crypto.getRandomValues(buffer);
  return Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Validates password strength according to defined policy
 */
export function validatePassword(password: string): { isValid: boolean; message: string } {
  if (!password || password.length < PASSWORD_POLICY.MIN_LENGTH) {
    return { 
      isValid: false, 
      message: `Password must be at least ${PASSWORD_POLICY.MIN_LENGTH} characters long` 
    };
  }

  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSymbols = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const requirements = [];

  if (PASSWORD_POLICY.REQUIRE_LOWERCASE && !hasLowercase) {
    requirements.push('lowercase letter');
  }
  
  if (PASSWORD_POLICY.REQUIRE_UPPERCASE && !hasUppercase) {
    requirements.push('uppercase letter');
  }
  
  if (PASSWORD_POLICY.REQUIRE_NUMBERS && !hasNumbers) {
    requirements.push('number');
  }
  
  if (PASSWORD_POLICY.REQUIRE_SYMBOLS && !hasSymbols) {
    requirements.push('special character');
  }

  if (requirements.length > 0) {
    return {
      isValid: false,
      message: `Password must contain at least one ${requirements.join(', ')}`
    };
  }

  return { isValid: true, message: 'Password meets requirements' };
}

/**
 * Sanitizes data for logging by removing sensitive information
 */
export function sanitizeDataForLogs(data: any): any {
  if (!data) return data;

  if (typeof data === 'object') {
    const sanitized = { ...data };
    
    // If data is an object or array, recursively sanitize its properties
    Object.keys(sanitized).forEach(key => {
      const lowerKey = key.toLowerCase();
      
      // Check if this key matches any sensitive pattern
      if (SENSITIVE_DATA_PATTERNS.some(pattern => pattern.test(lowerKey))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = sanitizeDataForLogs(sanitized[key]);
      }
    });
    
    return sanitized;
  }
  
  return data;
}

/**
 * Generates a CSRF token
 */
export async function generateCSRFToken(): Promise<string> {
  return await getRandomBytes(CSRF_CONFIG.SECRET_LENGTH);
}

/**
 * Validates a CSRF token
 */
export function validateCSRFToken(requestToken: string, storedToken: string): boolean {
  if (!requestToken || !storedToken) return false;
  return requestToken === storedToken;
}

/**
 * Hash sensitive data using Web Crypto API
 */
export async function hashData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Escape HTML to prevent XSS
 */
export function escapeHTML(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Validate and sanitize input
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  // Remove any potentially dangerous characters
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
} 