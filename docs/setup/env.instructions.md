# Environment Variables Setup

To fix the Row-Level Security (RLS) policy issues with the classes management feature, you need to set up environment variables for the service role key.

## Steps to Set Up

1. Create a `.env.local` file in the root of your project (if it doesn't exist)
2. Add the following variables to your `.env.local` file:

```
# Supabase 
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Service role key with admin privileges (keep this secure!)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

3. Replace the placeholders with your actual Supabase project details:
   - `your-project-id.supabase.co` - Your Supabase project URL
   - `your-anon-key` - Your public anon key (already in use in your app)
   - `your-service-role-key` - The service role key from your Supabase project settings

## How to Find Your Service Role Key

1. Go to your Supabase project dashboard
2. Click on "Settings" in the sidebar
3. Select "API" from the settings menu
4. Find the "Project API keys" section
5. Copy the "service_role key" (not the anon/public key)

## Security Note

The service role key has admin privileges and can bypass RLS policies. Keep it secure and never expose it in client-side code. It should only be used in server-side operations like the server actions we created.

After setting up the environment variables, restart your Next.js development server for the changes to take effect. 