# Account Creation Troubleshooting Guide

## 🚨 Problem
Unable to create any account - getting various errors when trying to sign up.

## 🔍 Step-by-Step Troubleshooting

### 1. **Check Supabase Project Status**
First, verify your Supabase project is working:

1. Go to: https://bqkmykfooztuhvwwalcu.supabase.co
2. Check if the project is active and not suspended
3. Look for any error messages in the dashboard

### 2. **Test Supabase Connection**
Let's test if the basic connection works:

```bash
# Run this in your terminal to test the connection
curl -X GET "https://bqkmykfooztuhvwwalcu.supabase.co/rest/v1/" \
  -H "apikey: REMOVED_SENSITIVE_DATA"
```

### 3. **Check Database Tables**
Verify the required tables exist:

1. Go to Supabase Dashboard → Table Editor
2. Check if these tables exist:
   - `users`
   - `leads`
   - `expenses`
   - `daily_inputs`
   - `user_settings`

### 4. **Verify RLS Policies**
Check if Row Level Security is properly configured:

1. Go to Supabase Dashboard → Authentication → Policies
2. Ensure all tables have proper RLS policies
3. Run the `fix-all-permissions-including-leads.sql` script again

### 5. **Test Different Signup Methods**

#### Option A: Email/Password Signup
Try with a completely new email:
- Use a different email address (e.g., test@example.com)
- Use a strong password (8+ characters, mix of letters/numbers)
- Wait 5-10 minutes between attempts

#### Option B: Google Sign-In
Use Google Sign-In instead:
- Click "Continue with Google" on the signup screen
- This bypasses email rate limiting entirely

### 6. **Check Network Connectivity**
Ensure your device has internet access:
- Try accessing other websites
- Check if you're on a restricted network (corporate firewall, etc.)

### 7. **Clear App Data**
Clear any cached data:
1. Close the app completely
2. Clear app data/cache (if possible)
3. Restart the app

### 8. **Check Console Logs**
Look for specific error messages in the app console:
- Rate limit errors
- Network errors
- Authentication errors
- Database errors

## 🛠️ Quick Fixes

### Fix 1: Reset Supabase Auth Settings
1. Go to Supabase Dashboard → Authentication → Settings
2. Reset rate limiting to defaults
3. Enable "Enable email confirmations" if disabled
4. Save changes

### Fix 2: Update Supabase Configuration
Check your `src/config/supabase.ts` file:
```typescript
const supabaseUrl = 'https://bqkmykfooztuhvwwalcu.supabase.co';
const supabaseAnonKey = 'REMOVED_SENSITIVE_DATA';
```

### Fix 3: Run Database Setup Script
Execute this SQL in your Supabase SQL Editor:
```sql
-- Check if users table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'users'
);

-- If it doesn't exist, create it
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    current_office TEXT DEFAULT 'Main Office',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);
```

## 🧪 Test Cases

### Test 1: Basic Signup
```
Email: test@example.com
Password: TestPassword123!
Name: Test User
```

### Test 2: Google Sign-In
1. Click "Continue with Google"
2. Select a Google account
3. Should bypass all email issues

### Test 3: Different Email Domain
```
Email: testuser@gmail.com
Password: StrongPassword456!
Name: Test User
```

## 📱 Common Error Messages & Solutions

| Error Message | Solution |
|---------------|----------|
| "Email rate limit exceeded" | Wait 5-10 minutes, use Google Sign-In |
| "Invalid email format" | Check email format, remove spaces |
| "Password too weak" | Use 8+ characters, mix letters/numbers |
| "User already exists" | Try signing in instead of signing up |
| "Network error" | Check internet connection |
| "Supabase connection failed" | Check project URL and API key |

## 🆘 Emergency Solutions

### If Nothing Works:

1. **Use Google Sign-In Only**
   - Temporarily disable email signup
   - Use only Google authentication

2. **Create Test Account Manually**
   - Go to Supabase Dashboard → Authentication → Users
   - Click "Add User"
   - Create a test account manually

3. **Check Supabase Status**
   - Visit: https://status.supabase.com
   - Check if there are any service issues

4. **Contact Support**
   - Supabase Support: https://supabase.com/support
   - Include your project URL and error messages

## 🔧 Development Mode

If you're in development:
1. Disable email confirmations in Supabase Auth settings
2. Increase rate limits to maximum values
3. Use test email addresses (e.g., test@example.com)

## 📞 Next Steps

If you're still having issues:
1. Try Google Sign-In first
2. Check the console logs for specific errors
3. Test with a different device/network
4. Contact support with specific error messages
