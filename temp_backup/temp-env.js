// Temporary file to set environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://xceeiogswmfqawlwsaez.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjZWVpb2dzd21mcWF3bHdzYWV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTg3MTQ4MywiZXhwIjoyMDYxNDQ3NDgzfQ.KdKymyB2RA659EMBWA3pim7_NUhD6I6JZ9Yx-KHRpww';
 
// Run the fix-points-balance script
require('./scripts/fix-points-balance.js'); 