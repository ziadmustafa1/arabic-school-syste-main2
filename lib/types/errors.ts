/**
 * Database error interface to properly type PostgreSQL/Supabase errors
 */
export interface DatabaseError {
  code: string;
  details: string | null;
  hint: string | null;
  message: string;
}

/**
 * Custom API response interface for consistent error handling
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
} 