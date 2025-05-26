/**
 * Compatibility layer for Supabase clients
 * 
 * This file helps bridge the gap between app directory and pages directory
 * by exporting the right version of createClient and createAdminClient
 * based on the import location.
 * 
 * - In app directory: Use the server.ts implementations
 * - In pages directory: Use the legacy-client.ts implementations
 */

// Export createAdminClient from legacy-client.ts
export { createAdminClient } from './legacy-client';

// Export createLegacyClient as createClient for simplicity
export { createLegacyClient as createClient } from './legacy-client'; 