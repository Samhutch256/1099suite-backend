# Fix for Ciarra's "Failed to add lead" Error

## Problem
Ciarra can't upload leads and gets the error "Failed to add lead. Please try again." This appears to be a database permissions or RLS (Row Level Security) policy issue.

## Verified Facts
- ✅ Ciarra DOES have a record in `public.users` (ID: ec20423e-0faf-4925-ac76-78ed5172b243)
- ✅ Ciarra's email is ciarra.newman@gmail.com
- ❌ Lead creation is failing despite having a user record

## Most Likely Causes
1. **RLS Policy Misconfiguration**: The Row Level Security policy may not be properly checking auth.uid()
2. **Missing Permissions**: The `authenticated` role may not have INSERT permission on the `leads` table
3. **Authentication State Mismatch**: auth.uid() may not be matching Ciarra's actual user ID when she tries to create leads
4. **Foreign Key Constraint**: The foreign key between `leads.user_id` and `users.id` may have issues

## Solution

### ⭐ RECOMMENDED: Fix for ALL Users (Existing + Future)
**Use this to fix permissions for everyone permanently:**

1. Open your Supabase dashboard: https://supabase.com/dashboard/project/bqkmykfooztuhvwwalcu
2. Navigate to the SQL Editor
3. Open the file `fix-all-users-lead-permissions.sql`
4. Copy and paste the entire contents into the SQL Editor
5. Click "Run" to execute

**This will:**
- ✅ Grant permissions to ALL authenticated users (not just Ciarra)
- ✅ Set up RLS policies correctly for everyone
- ✅ Create a trigger so NEW users automatically get permissions
- ✅ Fix any existing users missing from public.users
- ✅ Run comprehensive tests to verify everything works
- ✅ Show you a list of all users at the end

**After running this, ALL users (current and future) will be able to create leads automatically!**

### Option 2: Quick Manual Fix
If you want to manually run just the essential commands, run this in SQL Editor:

```sql
-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;

-- Recreate insert policy
DROP POLICY IF EXISTS "Users can insert own leads" ON public.leads;
CREATE POLICY "Users can insert own leads"
  ON public.leads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Option 3: Fix the Trigger (Prevents Future Issues)
The trigger that automatically creates users might be missing or broken. Run:

```sql
-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
```

## Code Changes Made
I've also improved the error handling in the app so that users will see the actual error message instead of just "Failed to add lead":

1. **Updated `/src/screens/AddLeadScreen.tsx`**: Now shows the actual error message in the alert
2. **Updated `/src/services/supabaseService.ts`**: Logs detailed error information and throws more descriptive errors

These changes will help diagnose the issue if it persists.

## Verification
After running the fix:
1. Have Ciarra try to add a lead again
2. If it still fails, the error message will now show the actual problem
3. Send me the error message if it still doesn't work

## Root Cause Analysis
The RLS policy on the `leads` table requires:
```sql
CREATE POLICY "Users can insert own leads" ON public.leads
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

This policy checks if the authenticated user ID (`auth.uid()`) matches the `user_id` in the lead being created.

Possible root causes:
1. **Missing GRANT**: The `authenticated` role may not have INSERT permission on the table
2. **Policy Misconfiguration**: The RLS policy may have been dropped or misconfigured
3. **Auth State Issue**: `auth.uid()` may not be properly set during Ciarra's session
4. **Foreign Key Issue**: The `user_id` foreign key to `public.users` may be preventing inserts

## Prevention
To prevent this issue for future users:
1. Ensure the trigger in Option 3 is in place
2. Consider adding a migration that checks and fixes this automatically on app startup
3. Add better error messages in the app that indicate this specific issue

