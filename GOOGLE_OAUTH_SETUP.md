# Google OAuth Setup Guide

## 🔧 **Step 1: Google Cloud Console Setup**

### **Create Web Client ID:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** > **Credentials**
4. Click **"Create Credentials"** > **"OAuth 2.0 Client IDs"**
5. Choose **"Web application"**
6. Name: "1099Suite Web Client"
7. Add these **Authorized redirect URIs**:
   - `https://auth.expo.io/@hutch56/vibecode`
   - `https://1099suite-backend-production.up.railway.app/auth/google/callback`
8. **Copy the Web Client ID** (it will look like: `123456789-abcdefghijklmnop.apps.googleusercontent.com`)

### **Configure OAuth Consent Screen:**
1. Go to **APIs & Services** > **OAuth consent screen**
2. **App name**: "1099Suite"
3. **User support email**: Your email
4. **Developer contact information**: Your email
5. **App domain**: Add `1099suite-backend-production.up.railway.app`
6. **Authorized domains**: Add `expo.io` and `railway.app`
7. **Add Test Users**: Add your email as a test user (CRITICAL!)
8. **Scopes**: Add `openid`, `profile`, `email`

### **Enable APIs:**
1. Go to **APIs & Services** > **Library**
2. Enable these APIs:
   - **Google+ API** (or Google Identity)
   - **Google OAuth2 API**

## 🔧 **Step 2: Update Code**

### **Current Configuration in `src/state/authStore.ts`:**
```typescript
// This is the current configuration:
const googleConfig = {
  clientId: Platform.select({
    ios: 'com.googleusercontent.apps.515087564181-l37598hadv1v7jgg6psjbgcr1darh2n7',
    default: '515087564181-mb5m4vpkhf56j4jh07j34ouoogqbbj6e.apps.googleusercontent.com',
  }),
  scopes: ['openid', 'profile', 'email'],
  redirectUri: AuthSession.makeRedirectUri({
    scheme: 'suite1099',
    path: 'redirect',
  }),
};
```

## 📋 **Your Client IDs:**

### **iOS Client ID:**
```
com.googleusercontent.apps.515087564181-l37598hadv1v7jgg6psjbgcr1darh2n7
```

### **Web Client ID:**
```
515087564181-mb5m4vpkhf56j4jh07j34ouoogqbbj6e.apps.googleusercontent.com
```
*(This is the currently configured web client ID)*

## ✅ **What this enables:**
- **Expo Go**: Uses web client ID
- **TestFlight/App Store**: Uses iOS client ID
- **Automatic selection** based on platform

## 🚀 **Current Status:**
✅ **Configuration is already set up correctly**
- iOS Client ID: `com.googleusercontent.apps.515087564181-l37598hadv1v7jgg6psjbgcr1darh2n7`
- Web Client ID: `515087564181-mb5m4vpkhf56j4jh07j34ouoogqbbj6e.apps.googleusercontent.com`
- Redirect URI: `suite1099://redirect` (generated from scheme: 'suite1099', path: 'redirect')

## 🔧 **Troubleshooting OAuth Errors**

**If you get "Access blocked: Authorization Error":**

1. **Check OAuth Consent Screen:**
   - Go to Google Cloud Console → APIs & Services → OAuth consent screen
   - Ensure your email is added as a test user
   - Verify app name and domains are correct

2. **Check Redirect URIs:**
   - Go to Google Cloud Console → APIs & Services → Credentials
   - Edit your Web Application OAuth 2.0 Client ID
   - Verify these redirect URIs are added:
     - `https://auth.expo.io/@hutch56/vibecode`
     - `https://1099suite-backend-production.up.railway.app/auth/google/callback`

3. **Check App Verification:**
   - Your app is in "Testing" mode (not published)
   - Only test users can sign in
   - Add your email as a test user if not already added

**To test:**
1. Ensure the redirect URIs in Google Cloud Console match the list above
2. Test with `npx expo start --clear`
3. Google Sign-In should work in both environments! 