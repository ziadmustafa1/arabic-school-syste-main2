# Database Function Fix Instructions

## Issue: Missing `execute_raw_sql` Function

The application was attempting to call a database function called `execute_raw_sql` with a single parameter, but this function doesn't exist in the database. Instead, there's a function called `execute_sql_with_params` that accepts two parameters: `sql_query` and `params`.

## Fix Summary

Two fixes have been applied:

1. **Code Update**: All occurrences of `execute_raw_sql` in the code have been updated to use `execute_sql_with_params` instead, with properly parameterized queries for better security.

2. **Database Compatibility Layer**: A new database migration has been created that adds an `execute_raw_sql` function that forwards calls to the existing `execute_sql_with_params` function. This ensures backward compatibility with any code that might still be using the old function name.

## Files Updated

- `lib/actions/update-points-balance.ts`
- `app/api/fix-points/route.ts`
- `app/actions/recharge-fix.ts`
- `app/actions/points-fix.ts`
- `scripts/fixes/apply-fix-user-rewards.js`

## New Files Added

- `supabase/migrations/20240801000000_create_execute_raw_sql.sql` - Migration to add compatibility function
- `scripts/fix-execute-raw-sql.js` - Script to apply the migration
- `package.json` - Added a new script to run the fix

## How to Apply the Fix

1. **Apply code changes**: The code changes have already been applied to the repository.

2. **Apply database migration**: Run the following command to add the `execute_raw_sql` function to your database:

```bash
npm run fix-db-function
```

This will create the missing `execute_raw_sql` function in your database, which will forward all calls to the existing `execute_sql_with_params` function.

## Verification

After applying the fix, you should no longer see errors like:

```
[syncUserPointsBalance] Direct SQL error or empty result: {
  code: 'PGRST202',
  details: 'Searched for the function public.execute_raw_sql with parameter sql_query or with a single unnamed json/jsonb parameter, but no matches were found in the schema cache.',
  hint: 'Perhaps you meant to call the function public.execute_raw_sql(params, query)',
  message: 'Could not find the function public.execute_raw_sql(sql_query) in the schema cache'
} null
```

The points calculation should now work correctly using the parameterized queries through the `execute_sql_with_params` function. 