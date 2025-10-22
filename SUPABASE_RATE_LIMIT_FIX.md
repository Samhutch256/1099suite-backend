# Fixing Supabase Email Rate Limit Error

## 🚨 Problem
When trying to create a new account, you're getting "email rate limit exceeded" error.

## 🔍 Root Cause
Supabase has built-in rate limiting for email authentication to prevent spam and abuse. This happens when:
- Multiple signup attempts are made too quickly
- Too many accounts are created from the same IP address
- Supabase's default rate limits are too restrictive for your use case

## 🛠️ Solutions

### 1. **Immediate Fix - Wait and Retry**
- Wait 5-10 minutes before trying to create the account again
- Rate limits typically reset automatically after a short period

### 2. **Adjust Supabase Rate Limits**
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to your project: https://bqkmykfooztuhvwwalcu.supabase.co
3. Go to **Settings** → **Auth** → **Rate Limiting**
4. Adjust the following settings:
   - **Email signup rate limit**: Increase from default (usually 5 per hour) to a higher value
   - **Email signin rate limit**: Increase if needed
   - **Password reset rate limit**: Adjust if needed

### 3. **Alternative: Use Google Sign-In**
Instead of email/password signup, use Google Sign-In which typically has higher rate limits:
- Click "Continue with Google" on the signup screen
- This bypasses email rate limiting entirely

### 4. **Check for Existing Account**
The error might also occur if:
- An account with that email already exists
- The email was recently used for signup

Try signing in instead of signing up if you think the account might already exist.

### 5. **Contact Supabase Support (if needed)**
If the issue persists:
1. Go to Supabase Dashboard
2. Click **Support** in the sidebar
3. Submit a ticket about rate limiting for your specific use case

## 🔧 Technical Details

### Current Rate Limits (Default)
- **Email signup**: 5 per hour per IP
- **Email signin**: 10 per hour per IP
- **Password reset**: 3 per hour per email

### Recommended Settings for Development
- **Email signup**: 20 per hour per IP
- **Email signin**: 50 per hour per IP
- **Password reset**: 10 per hour per email

## 📱 User Experience Improvements

### Add Better Error Handling
The app should show more specific error messages:

```typescript
// In src/state/authStore.ts, improve error handling:
catch (error) {
  let errorMessage = 'Failed to create account';
  
  if (error instanceof Error) {
    if (error.message.includes('rate limit')) {
      errorMessage = 'Too many signup attempts. Please wait a few minutes and try again.';
    } else if (error.message.includes('already registered')) {
      errorMessage = 'An account with this email already exists. Please sign in instead.';
    } else {
      errorMessage = error.message;
    }
  }
  
  set({ 
    error: errorMessage,
    isLoading: false 
  });
  throw error;
}
```

### Add Retry Logic
Consider adding automatic retry logic with exponential backoff for rate limit errors.

## 🎯 Quick Test
1. Wait 5-10 minutes
2. Try creating the account again
3. If it still fails, use Google Sign-In as an alternative
4. Check your Supabase dashboard for rate limit settings

## 📞 Need Help?
If you continue to experience issues:
1. Check the Supabase dashboard for any error logs
2. Try using a different email address
3. Use Google Sign-In instead of email/password
4. Contact support if the problem persists
