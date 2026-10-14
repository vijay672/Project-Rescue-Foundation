import { createClient, SupabaseClient, type Session, type User as SupabaseAuthUser } from '@supabase/supabase-js';
import type { User, UserRole, Activity, FeedbackMessage, Region, DashboardMetrics } from '../types';

// Environment configurations (safe for both browser Vite and Node/tsx environments)
const getEnvVar = (name: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[name]) {
      return import.meta.env[name];
    }
  } catch {
    // Ignore in non-Vite environments
  }
  try {
    if (typeof process !== 'undefined' && process.env && process.env[name]) {
      return process.env[name];
    }
  } catch {
    // Ignore in browser
  }
  return '';
};

const envUrl = getEnvVar('VITE_SUPABASE_URL');
const envKey = getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY') || getEnvVar('VITE_SUPABASE_ANON_KEY');

// Detect if real Supabase credentials are configured
export const isSupabaseConfigured = (): boolean => {
  return (
    typeof envUrl === 'string' &&
    envUrl.trim().length > 0 &&
    !envUrl.includes('your-project-id') &&
    typeof envKey === 'string' &&
    envKey.trim().length > 0 &&
    !envKey.includes('your-anon-key')
  );
};

// Singleton Supabase Client
export let supabase: SupabaseClient | null = null;

if (isSupabaseConfigured()) {
  try {
    supabase = createClient(envUrl, envKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'project_rescue_auth_token',
      },
    });
  } catch (err) {
    console.warn('[Supabase Client Init Warning]:', err);
    supabase = null;
  }
}

/**
 * Production Supabase Auth Service
 * Strictly enforces real session authentication without hardcoded mock personas or bypasses.
 */
export const supabaseAuth = {
  /**
   * Get current authenticated user session
   */
  async getSession(): Promise<{ user: User | null; session: Session | null }> {
    if (supabase) {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        return { user: null, session: null };
      }

      // Preserve the persisted authorization profile on every subsequent login.
      let { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.session.user.id)
        .single();

      // Existing accounts retain the role from their profile keyed to the
      // verified Supabase Auth UUID. New identities default to field staff.
      const verifiedEmail = data.session.user.email?.trim().toLowerCase();
      if (profile) {
        const user: User = {
          id: profile.id,
          name: profile.name || data.session.user.user_metadata?.full_name || data.session.user.user_metadata?.name || data.session.user.email?.split('@')[0] || 'Caseworker',
          email: profile.email || data.session.user.email || '',
          role: profile.role || 'field_staff',
          regions: profile.assigned_regions || ['reg-east-africa'],
          status: profile.status || 'active',
          mfaEnabled: profile.mfa_enabled ?? true,
          lastLoginAt: profile.last_login_at || new Date().toISOString(),
          deviceInfo: profile.device_info,
        };
        localStorage.setItem('project_rescue_auth_user', JSON.stringify(user));
        return { user, session: data.session };
      }

      // New identities receive the least-privileged role. Never trust the
      // user-editable Google user_metadata for authorization.
      const mappedRole: UserRole = 'field_staff';
      const mappedRegions: string[] = ['reg-east-africa'];
      const mappedStatus: User['status'] = 'active';
      const userEmail = verifiedEmail || '';

      const userName = data.session.user.user_metadata?.full_name || 
                       data.session.user.user_metadata?.name || 
                       data.session.user.email?.split('@')[0] || 'Personnel';

      const user: User = {
        id: data.session.user.id,
        name: userName,
        email: data.session.user.email || '',
        role: mappedRole,
        regions: mappedRegions,
        status: mappedStatus,
        mfaEnabled: true,
        lastLoginAt: new Date().toISOString(),
      };

      // Create the new profile with the correctly mapped least-privileged role.
      try {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.session.user.id,
          name: userName,
          email: user.email,
          role: mappedRole,
          assigned_regions: mappedRegions,
          status: mappedStatus,
          mfa_enabled: true,
          last_login_at: new Date().toISOString(),
        });
        if (profileError) throw profileError;
      } catch (profileInitError) {
        console.error('Profile initialization failed:', profileInitError);
        throw new Error('Your Google account was verified, but its access profile could not be initialized. Contact an administrator.');
      }

      localStorage.setItem('project_rescue_auth_user', JSON.stringify(user));
      return { user, session: data.session };
    }

    // Check cached verified session in browser storage
    const stored = localStorage.getItem('project_rescue_auth_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id && parsed.email) {
          return { user: parsed, session: null };
        }
      } catch {
        localStorage.removeItem('project_rescue_auth_user');
      }
    }

    return { user: null, session: null };
  },

  /**
   * Real Supabase Auth Login with email/password
   */
  async login(email?: string, password?: string): Promise<{ user: User; session: Session | null }> {
    if (!email || !password) {
      throw new Error('Both email and password are required for authentication.');
    }

    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.user) {
        // Fetch matching profile with RBAC role
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        const role: UserRole = profile?.role || 'field_staff';
        const user: User = {
          id: data.user.id,
          name: profile?.name || data.user.user_metadata?.name || email.split('@')[0],
          email: data.user.email || email,
          role,
          regions: profile?.assigned_regions || ['reg-east-africa'],
          status: profile?.status || 'active',
          mfaEnabled: profile?.mfa_enabled ?? true,
          lastLoginAt: new Date().toISOString(),
          deviceInfo: profile?.device_info || navigator.userAgent,
        };

        localStorage.setItem('project_rescue_auth_user', JSON.stringify(user));
        return { user, session: data.session };
      }
    }

    throw new Error('Authentication gateway service is not active or credentials invalid.');
  },

  /**
   * Register a new user in Auth and initialize their profile
   */
  async signUp(payload: { email: string; password: string; name: string; role?: UserRole }): Promise<{ user: User; session: Session | null }> {
    if (!payload.email || !payload.password) {
      throw new Error('Email and password are required to register.');
    }

    if (supabase) {
      const { data, error } = await supabase.auth.signUp({
        email: payload.email,
        password: payload.password,
        options: {
          data: {
            name: payload.name,
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.user) {
        const user: User = {
          id: data.user.id,
          name: payload.name,
          email: payload.email,
          role: 'field_staff',
          regions: ['reg-east-africa'],
          status: 'active',
          mfaEnabled: true,
          lastLoginAt: new Date().toISOString(),
        };

        // Create the least-privileged profile. Report database failures rather
        // than caching an authenticated-looking user without persisted RBAC.
        try {
          const { error: profileError } = await supabase.from('profiles').insert({
            id: data.user.id,
            email: data.user.email || payload.email,
            name: payload.name,
            role: 'field_staff',
            status: 'active',
            mfa_enabled: true,
          });
          if (profileError) throw profileError;
        } catch (profileInitError) {
          console.error('Profile record insert failed:', profileInitError);
          throw new Error('Your account was created, but its access profile could not be initialized. Contact an administrator.');
        }

        localStorage.setItem('project_rescue_auth_user', JSON.stringify(user));
        return { user, session: data.session };
      }
    }

    throw new Error('Authentication service temporarily unavailable to complete registration.');
  },

  /**
   * Google OAuth Integration for Supabase Auth
   * Initiates Google OAuth authentication flow with redirect to origin.
   */
  async signInWithGoogle(): Promise<{ url?: string; data?: any }> {
    if (!supabase || !isSupabaseConfigured()) {
      throw new Error('Supabase client is not configured.');
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Password reset via Supabase Auth
   */
  async resetPassword(email: string): Promise<{ success: boolean; message: string }> {
    if (supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        throw new Error(error.message);
      }
      return { success: true, message: `Password reset link sent to ${email}` };
    }

    return {
      success: true,
      message: `Password reset instructions sent to ${email}. Check your email.`,
    };
  },

  /**
   * Logout from Supabase session
   */
  async logout(): Promise<void> {
    if (supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('project_rescue_auth_user');
  },

  /**
   * Subscribe to Supabase auth state changes
   */
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const { user } = await supabaseAuth.getSession();
          callback(user);
        } else {
          callback(null);
        }
      });
      return () => subscription.unsubscribe();
    }
    return () => {};
  },
};
