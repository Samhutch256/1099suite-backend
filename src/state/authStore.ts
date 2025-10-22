import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabaseService } from '../services/supabaseService';
import { supabase } from '../config/supabase';
import { Platform } from 'react-native';
import { clearAuthData, isRefreshTokenError, handleRefreshTokenError } from '../utils/authUtils';

WebBrowser.maybeCompleteAuthSession();

// Google OAuth configuration
const googleConfig = {
  clientId: '515087564181-mb5m4vpkhf56j4jh07j34ouoogqbbj6e.apps.googleusercontent.com',
  scopes: ['openid', 'profile', 'email'],
  redirectUri: 'https://auth.expo.io/@hutch56/vibecode',
};

// Log the generated redirect URI
console.log('🔍 Generated redirect URI:', googleConfig.redirectUri);

// Google OAuth Discovery Document
const googleDiscovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

// Create the AuthRequest for Google Sign-In
const createGoogleAuthRequest = () => {
  return new AuthSession.AuthRequest({
    clientId: googleConfig.clientId,
    scopes: googleConfig.scopes,
    redirectUri: googleConfig.redirectUri,
    responseType: AuthSession.ResponseType.Code,
    extraParams: {
      prompt: 'select_account',
      access_type: 'offline',
    },
  });
};

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  photoURL?: string;
  provider: 'email' | 'google' | 'apple';
  createdAt: string;
  lastLoginAt: string;
  industry?: string;
  jobTitle?: string;
  onboardingCompleted?: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isMigrating: boolean;
  migrationCompleted: boolean;
  
  // Email auth
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  
  // Google auth
  signInWithGoogle: () => Promise<void>;
  

  
  // General auth
  signOut: () => Promise<void>;
  clearError: () => void;
  checkAuthState: () => Promise<void>;
  updateUserProfile: (updates: Partial<Pick<User, 'name' | 'email' | 'phone' | 'industry' | 'jobTitle' | 'onboardingCompleted'>>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  
  // Data sync
  migrateUserData: () => Promise<void>;
  consolidateAccounts: () => Promise<void>;
  
  // Supabase auth
  initializeSupabase: () => Promise<void>;
  syncWithContractorStore: () => Promise<void>;
}

// Helper function to ensure user profile is complete with stored data
const ensureCompleteUserProfile = async (user: User): Promise<User> => {
  // No migration needed - user ID comes from Supabase Auth
  return user;
};



export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isMigrating: false,
      migrationCompleted: false,

      signUpWithEmail: async (email: string, password: string, name: string) => {
        try {
          set({ isLoading: true, error: null });
          
          // Trim whitespace from inputs
          const trimmedEmail = email?.trim() || '';
          const trimmedPassword = password?.trim() || '';
          const trimmedName = name?.trim() || '';
          
          // Validate input
          if (!trimmedName) {
            throw new Error('Please enter your full name');
          }
          
          if (!trimmedEmail) {
            throw new Error('Please enter your email address');
          }
          
          if (!trimmedPassword) {
            throw new Error('Please enter a password');
          }
          
          if (trimmedPassword.length < 6) {
            throw new Error('Password must be at least 6 characters');
          }
          
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            throw new Error('Please enter a valid email address');
          }
          
          console.log("🔐 signUpUser() starting...", { emailMasked: trimmedEmail.replace(/(.{2}).+(@.*)/, "$1***$2") });

          // Use Supabase as primary authentication
          const { data, error } = await supabase.auth.signUp({
            email: trimmedEmail,
            password: trimmedPassword,
            options: {
              data: { full_name: trimmedName ?? null } // stored in auth.user_metadata
            }
          });

          if (error) {
            console.error("❌ Supabase signUp error:", error);
            throw new Error(error.message || "Failed to create account");
          }

          // If email confirmation is ON, session may be null here. That's OK because the DB trigger creates public.users.
          console.log("✅ signUp success:", {
            userId: data.user?.id,
            sessionPresent: Boolean(data.session)
          });

          if (data.user) {
            // Manually create user profile in case trigger doesn't work
            try {
              await supabaseService.createUserProfile(data.user.id, data.user.email || trimmedEmail, trimmedName);
              console.log("✅ User profile created manually");
            } catch (profileError) {
              console.warn("⚠️ Manual profile creation failed, but continuing:", profileError);
            }
            
            // Fetch the user row to verify provisioning
            const { data: userData, error: userError } = await supabase
              .from("users")
              .select("*")
              .eq("id", data.user.id)
              .single();
            
            console.log("🔍 User row verification:", { userData, userError });
            
            let user: User = {
              id: data.user.id,
              email: data.user.email || trimmedEmail,
              name: trimmedName,
              provider: 'email',
              createdAt: data.user.created_at || new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
            };
            
            set({ user, isAuthenticated: true, isLoading: false, error: null });
            console.log('✅ User signed up successfully with Supabase:', user.email);
            
            // Sync with contractor store to initialize Supabase data
            await get().syncWithContractorStore();
          } else {
            throw new Error('Failed to create user account');
          }
          
        } catch (error) {
          let errorMessage = 'Failed to create account';
          
          if (error instanceof Error) {
            if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
              errorMessage = 'Too many signup attempts. Please wait a few minutes and try again, or use Google Sign-In.';
            } else if (error.message.includes('already registered') || error.message.includes('already exists')) {
              errorMessage = 'An account with this email already exists. Please sign in instead.';
            } else if (error.message.includes('invalid email')) {
              errorMessage = 'Please enter a valid email address.';
            } else if (error.message.includes('weak password')) {
              errorMessage = 'Password is too weak. Please use a stronger password.';
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
      },

      signInWithEmail: async (email: string, password: string) => {
        try {
          set({ isLoading: true, error: null });
          console.log('Attempting email sign in for:', email);
          
          // Trim whitespace from inputs
          const trimmedEmail = email?.trim() || '';
          const trimmedPassword = password?.trim() || '';
          
          if (!trimmedEmail) {
            throw new Error('Please enter your email address');
          }
          
          if (!trimmedPassword) {
            throw new Error('Please enter your password');
          }
          
          // Use Supabase as primary authentication
          const { user: supabaseUser } = await supabaseService.signInWithEmail(trimmedEmail, trimmedPassword);
          console.log('User authenticated successfully via Supabase:', supabaseUser.email);
          
          // Get user profile from Supabase database
          const userProfile = await supabaseService.getUser(supabaseUser.id);
          
          let user: User = {
            id: supabaseUser.id,
            email: supabaseUser.email || trimmedEmail,
            name: userProfile?.name || supabaseUser.user_metadata?.name || trimmedEmail.split('@')[0],
            provider: 'email',
            createdAt: supabaseUser.created_at || new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
            industry: userProfile?.settings?.industry,
            jobTitle: userProfile?.settings?.jobTitle,
            onboardingCompleted: userProfile?.settings?.onboardingCompleted,
          };
          
          set({ user, isAuthenticated: true, isLoading: false, error: null });
          console.log('✅ User signed in successfully with Supabase:', user.email);
          
          // Sync with contractor store to load Supabase data
          await get().syncWithContractorStore();
          
        } catch (error) {
          console.error('Sign in error:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to sign in',
            isLoading: false 
          });
          throw error;
        }
      },

                                      signInWithGoogle: async () => {
          try {
            set({ isLoading: true, error: null });
            console.log('🔐 Starting Google Sign-In...');
            
            // Force close any existing web browser sessions
            console.log('🔧 Force closing any existing web browser sessions...');
            try {
              await WebBrowser.maybeCompleteAuthSession();
            } catch (e) {
              console.log('🔧 WebBrowser session clear attempt:', e);
            }
            
            // Add a delay to ensure sessions are cleared
            console.log('🔧 Waiting for sessions to clear...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Build the Google OAuth URL manually
            const params = new URLSearchParams({
              client_id: googleConfig.clientId,
              redirect_uri: googleConfig.redirectUri,
              response_type: 'code',
              scope: googleConfig.scopes.join(' '),
              prompt: 'select_account',
              access_type: 'offline',
            });
            
            const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
            console.log('🔍 Auth URL:', authUrl);
            
            // Open the OAuth URL in a web browser
            console.log('🔍 Opening OAuth URL in browser...');
            const result = await WebBrowser.openAuthSessionAsync(authUrl, googleConfig.redirectUri);
            console.log('🔍 WebBrowser result:', result);
          
                     if (result.type === 'success') {
             console.log('✅ Google OAuth successful, result:', result);
             
             // Extract the authorization code from the URL
             const url = new URL(result.url);
             const code = url.searchParams.get('code');
            
            if (!code) {
              throw new Error('No authorization code received from Google');
            }
            
            // Exchange the code for tokens using your backend
            const response = await fetch('https://1099suite-backend-production.up.railway.app/auth/google/callback', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ code }),
            });
            
            if (!response.ok) {
              throw new Error('Failed to exchange authorization code');
            }
            
            const data = await response.json();
            console.log('✅ Backend OAuth response:', data);
            
            // Create user object from backend response
            const user: User = {
              id: data.user.sub || `google_${Date.now()}`,
              email: data.user.email,
              name: data.user.name,
              photoURL: data.user.picture,
              provider: 'google',
              createdAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
            };
            
            // Manually create user profile in case trigger doesn't work
            try {
              await supabaseService.createUserProfile(user.id, user.email, user.name);
              console.log("✅ Google user profile created manually");
            } catch (profileError) {
              console.warn("⚠️ Manual Google profile creation failed, but continuing:", profileError);
            }
            
            set({ user, isAuthenticated: true, isLoading: false, error: null });
            console.log('✅ Google Sign-In successful:', user.email);
            
          } else if (result.type === 'cancel') {
            console.log('❌ Google Sign-In cancelled by user');
            set({ isLoading: false, error: null });
          } else {
            console.log('❌ Google Sign-In failed with result type:', result.type);
            console.log('❌ Google Sign-In failed with result:', result);
            throw new Error(`Google Sign-In failed: ${result.type}`);
          }
          
        } catch (error) {
          console.error('❌ Google Sign-In error:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Google Sign-In failed',
            isLoading: false 
          });
          throw error;
        }
      },



      signOut: async () => {
        try {
          set({ isLoading: true });
          console.log('🔓 Signing out user...');
          
          // Sign out from Supabase
          await supabaseService.signOut();
          
          // Clear local storage
          await SecureStore.deleteItemAsync('auth_token');
          
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false, 
            error: null,
            isMigrating: false,
            migrationCompleted: false
          });
          console.log('✅ User signed out successfully');
        } catch (error) {
          console.error('❌ Sign out failed:', error);
          set({ isLoading: false });
          throw error;
        }
      },

      clearError: () => {
        set({ error: null });
      },

      checkAuthState: async () => {
        try {
          set({ isLoading: true });
          
          // First, try to get the current session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          // If there's a session error related to refresh tokens, clear the session and require re-authentication
          if (sessionError) {
            console.warn('⚠️ Session error detected:', sessionError.message);
            
            if (isRefreshTokenError(sessionError)) {
              console.log('🔄 Refresh token error detected, clearing session and requiring re-authentication');
              await clearAuthData();
              set({ 
                user: null, 
                isAuthenticated: false, 
                isLoading: false,
                error: 'Your session has expired. Please sign in again.'
              });
              return;
            }
          }
          
          if (!session || !session.user) {
            // No valid session, clear user and require login
            set({ 
              user: null, 
              isAuthenticated: false, 
              isLoading: false 
            });
            return;
          }

          // Valid session found, get user data
          const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();
          if (error || !supabaseUser) {
            console.error('❌ Failed to get user data:', error);
            
            if (isRefreshTokenError(error)) {
              console.log('🔄 Refresh token error in getUser, clearing session');
              await clearAuthData();
              set({ 
                user: null, 
                isAuthenticated: false, 
                isLoading: false,
                error: 'Your session has expired. Please sign in again.'
              });
              return;
            }
            
            set({ 
              user: null, 
              isAuthenticated: false, 
              isLoading: false 
            });
            return;
          }

          // Create user object from Supabase data
          let user: User = {
            id: supabaseUser.id,
            email: supabaseUser.email || '',
            name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
            photoURL: supabaseUser.user_metadata?.avatar_url,
            provider: (supabaseUser.app_metadata?.provider as 'email' | 'google' | 'apple') || 'email',
            createdAt: supabaseUser.created_at,
            lastLoginAt: new Date().toISOString(),
          };

          // Ensure user profile is complete
          user = await ensureCompleteUserProfile(user);

          set({ 
            user, 
            isAuthenticated: true, 
            isLoading: false,
            error: null
          });
          
          console.log('✅ User authenticated:', user.email);
          
        } catch (error) {
          console.error('❌ Auth state check failed:', error);
          
          if (isRefreshTokenError(error)) {
            console.log('🔄 Refresh token error in checkAuthState, clearing session');
            await clearAuthData();
            set({ 
              user: null, 
              isAuthenticated: false, 
              isLoading: false,
              error: 'Your session has expired. Please sign in again.'
            });
            return;
          }
          
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false 
          });
        }
      },

      updateUserProfile: async (updates) => {
        try {
          const { user } = get();
          if (!user) throw new Error('No user logged in');

          console.log('🔄 Updating user profile with:', updates);
          const updatedUser = { ...user, ...updates };
          
          // Try to update in Supabase database, but don't fail if it doesn't work
          try {
            await supabaseService.createOrUpdateUser(user.id, {
              email: user.email,
              name: user.name,
              settings: {
                industry: updatedUser.industry,
                jobTitle: updatedUser.jobTitle,
                onboardingCompleted: updatedUser.onboardingCompleted,
              },
            });
            console.log('✅ User profile updated in Supabase');
          } catch (supabaseError) {
            console.warn('⚠️ Failed to update user profile in Supabase, continuing with local storage:', supabaseError);
            // Don't throw the error - we can continue without Supabase sync
          }

          // Update state
          console.log('✅ User profile updated in local state');
          set({ user: updatedUser });
        } catch (error) {
          console.error('Error updating user profile:', error);
          throw error;
        }
      },

      changePassword: async (currentPassword: string, newPassword: string) => {
        try {
          set({ isLoading: true, error: null });
          if (!currentPassword?.trim()) {
            throw new Error('Please enter your current password');
          }
          if (!newPassword?.trim()) {
            throw new Error('Please enter a new password');
          }
          if (newPassword.length < 8) {
            throw new Error('New password must be at least 8 characters');
          }
          if (/^\s+$/.test(newPassword)) {
            throw new Error('Password cannot be only whitespace');
          }

          await supabaseService.changePassword(currentPassword, newPassword);
          set({ isLoading: false, error: null });
        } catch (error) {
          let message = 'Failed to change password';
          if (error instanceof Error) message = error.message;
          set({ isLoading: false, error: message });
          throw error;
        }
      },

      requestPasswordReset: async (email: string) => {
        try {
          set({ isLoading: true, error: null });
          const trimmedEmail = email?.trim() || '';
          if (!trimmedEmail) throw new Error('Please enter your email address');
          await supabaseService.requestPasswordReset(trimmedEmail);
          set({ isLoading: false, error: null });
        } catch (error) {
          let message = 'Failed to send reset email';
          if (error instanceof Error) message = error.message;
          set({ isLoading: false, error: message });
          throw error;
        }
      },

      migrateUserData: async () => {
        // No migration needed - user ID comes from Supabase Auth
        console.log('ℹ️ No migration needed - using Supabase Auth user ID');
      },

      consolidateAccounts: async () => {
        const { user, isMigrating } = get();
        if (!user || isMigrating) {
          console.log('⏭️ Skipping consolidation: no user or migration in progress');
          return;
        }

        try {
          console.log('🔄 Starting account consolidation for:', user.email);
          
          // Import consolidation service
          const { accountConsolidationService } = await import('../services/accountConsolidationService');
          
          // Always use Supabase Auth user ID
          const primaryUserId = await accountConsolidationService.consolidateAccountsByEmail(user.email, user.id);
          // Do not update user ID if it is already the Supabase ID
          if (user.id !== primaryUserId) {
            console.warn('Tried to consolidate to a non-Supabase user ID. Skipping.');
            return;
          }
          
        } catch (error) {
          console.error('❌ Failed to consolidate accounts:', error);
        }
      },

      initializeSupabase: async () => {
        try {
          // Handle migration of old user IDs to UUID format
          const { user } = get();
          if (user && user.id.startsWith('user_') && !user.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            console.log('🔄 User has old format ID, forcing logout for migration...');
            // Force logout to ensure clean state
            set({ user: null, isAuthenticated: false, error: null });
            await SecureStore.deleteItemAsync('auth_token');
            console.log('✅ User logged out, please sign in again with your credentials');
          }
          
          // Check if there's an existing Supabase session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          // Handle session errors, especially refresh token errors
          if (sessionError) {
            console.warn('⚠️ Session error during initialization:', sessionError.message);
            
            if (isRefreshTokenError(sessionError)) {
              console.log('🔄 Refresh token error during initialization, clearing session');
              await clearAuthData();
              set({ 
                user: null, 
                isAuthenticated: false, 
                error: 'Your session has expired. Please sign in again.'
              });
              return;
            }
          }
          
          if (session?.user) {
            const user: User = {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || '',
              provider: 'email',
              createdAt: session.user.created_at || new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
            };
            
            set({ user, isAuthenticated: true, error: null });
            await get().syncWithContractorStore();
          }
          
          // Listen for auth changes with better error handling
          supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('🔄 Auth state:', event, 'user:', session?.user?.id);
            
            try {
              if (session?.user) {
                // Fetch the user row to verify provisioning
                const { data: userData, error: userError } = await supabase
                  .from("users")
                  .select("*")
                  .eq("id", session.user.id)
                  .single();
                
                console.log("🔍 User row verification on auth change:", { userData, userError });
                
                const user: User = {
                  id: session.user.id,
                  email: session.user.email || '',
                  name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || '',
                  provider: 'email',
                  createdAt: session.user.created_at || new Date().toISOString(),
                  lastLoginAt: new Date().toISOString(),
                };
                
                set({ user, isAuthenticated: true, error: null });
                await get().syncWithContractorStore();
              } else {
                set({ user: null, isAuthenticated: false, error: null });
              }
            } catch (authChangeError) {
              console.error('❌ Error in auth state change handler:', authChangeError);
              
              if (isRefreshTokenError(authChangeError)) {
                console.log('🔄 Refresh token error in auth state change, clearing session');
                await clearAuthData();
                set({ 
                  user: null, 
                  isAuthenticated: false, 
                  error: 'Your session has expired. Please sign in again.'
                });
              }
            }
          });
          
        } catch (error) {
          console.error('Failed to initialize Supabase:', error);
          
          if (isRefreshTokenError(error)) {
            console.log('🔄 Refresh token error during Supabase initialization, clearing session');
            await clearAuthData();
            set({ 
              user: null, 
              isAuthenticated: false, 
              error: 'Your session has expired. Please sign in again.'
            });
            return;
          }
        }
      },

      syncWithContractorStore: async () => {
        const { user } = get();
        if (!user) return;

        try {
          console.log('🔄 Syncing with contractor store for user:', user.id);
          // Note: We'll handle contractor store sync separately to avoid circular dependencies
          // The contractor store will be initialized when needed
        } catch (error) {
          console.error('Failed to sync with contractor store:', error);
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      migrate: (persistedState, version) => {
        if (
          persistedState &&
          typeof persistedState === 'object' &&
          'user' in persistedState &&
          persistedState.user
        ) {
          let changed = false;
          let user = persistedState.user as User;
          if (!user.createdAt) {
            user = { ...user, createdAt: new Date().toISOString() };
            changed = true;
          }
          if (!user.lastLoginAt) {
            user = { ...user, lastLoginAt: new Date().toISOString() };
            changed = true;
          }
          if (changed) {
            return {
              ...persistedState,
              user,
            };
          }
        }
        return persistedState;
      },
    }
  )
);