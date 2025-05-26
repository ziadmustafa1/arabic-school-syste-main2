"use server"

import { sanitizeDataForLogs } from './utils'
import { createAdminClient } from '@/lib/supabase/admin'

// Define security event types
export enum SecurityEventType {
  LOGIN_ATTEMPT = 'login_attempt',
  LOGIN_SUCCESS = 'login_success', 
  LOGIN_FAILURE = 'login_failure',
  ACCOUNT_LOCKOUT = 'account_lockout',
  PASSWORD_RESET = 'password_reset',
  ADMIN_ACTION = 'admin_action',
  API_RATE_LIMIT = 'api_rate_limit',
  CSRF_FAILURE = 'csrf_failure',
  XSS_ATTEMPT = 'xss_attempt',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity'
}

// Security log entry interface
export interface SecurityLogEntry {
  event_type: SecurityEventType;
  user_id?: string | null;
  ip_address?: string;
  user_agent?: string;
  details?: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp?: Date;
}

/**
 * Log a security event
 */
export async function logSecurityEvent({
  event_type,
  user_id = null,
  ip_address,
  user_agent,
  details = {},
  severity = 'medium'
}: SecurityLogEntry) {
  try {
    console.log(`[Security] ${severity.toUpperCase()} - ${event_type}`, 
      sanitizeDataForLogs({user_id, ip_address, details})
    )
    
    // Store security events in the database
    const adminClient = await createAdminClient()
    
    const { error } = await adminClient.from('security_logs').insert({
      event_type,
      user_id,
      ip_address,
      user_agent,
      details: sanitizeDataForLogs(details),
      severity,
      created_at: new Date().toISOString()
    })
    
    if (error) {
      console.error('Failed to log security event:', error)
    }
    
    // For critical events, create notifications for admins
    if (severity === 'critical') {
      await adminClient.from('notifications').insert({
        user_id: null, // Special case for admin notifications
        title: 'Security Alert',
        content: `Critical security event: ${event_type}. Please check security logs.`,
        type: 'security_alert',
        reference_id: null,
        admin_only: true
      })
    }
  } catch (error) {
    console.error('Error logging security event:', error)
  }
}

/**
 * Check for suspicious activity patterns
 */
export async function checkSuspiciousActivity(userId: string, ip_address?: string): Promise<boolean> {
  try {
    const adminClient = await createAdminClient()
    
    // Check for recent failed login attempts
    const { data: loginFailures } = await adminClient
      .from('security_logs')
      .select('count')
      .eq('user_id', userId)
      .eq('event_type', SecurityEventType.LOGIN_FAILURE)
      .gte('created_at', new Date(Date.now() - 1000 * 60 * 60).toISOString()) // Last hour
      .count()
    
    // If there are more than 5 failed attempts in the last hour
    if (loginFailures && loginFailures.count > 5) {
      await logSecurityEvent({
        event_type: SecurityEventType.SUSPICIOUS_ACTIVITY,
        user_id: userId,
        ip_address,
        details: { reason: 'Multiple failed login attempts' },
        severity: 'high'
      })
      
      return true
    }
    
    // Check for access from unusual locations
    if (ip_address) {
      const { data: ipHistory } = await adminClient
        .from('security_logs')
        .select('ip_address')
        .eq('user_id', userId)
        .eq('event_type', SecurityEventType.LOGIN_SUCCESS)
        .order('created_at', { ascending: false })
        .limit(10)
      
      // If this IP has never been seen before for this user
      if (ipHistory && !ipHistory.some(log => log.ip_address === ip_address)) {
        await logSecurityEvent({
          event_type: SecurityEventType.SUSPICIOUS_ACTIVITY,
          user_id: userId,
          ip_address,
          details: { reason: 'Login from new location' },
          severity: 'medium'
        })
        
        return true
      }
    }
    
    return false
  } catch (error) {
    console.error('Error checking suspicious activity:', error)
    return false
  }
} 