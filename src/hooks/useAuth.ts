import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  isGlobalAdmin: boolean;
  roleChecked: boolean;
}

const clearPersistedAuthSession = () => {
  if (typeof window === 'undefined') return;

  const keysToClear = new Set<string>(['supabase.auth.token']);

  try {
    const projectRef = new URL(import.meta.env.VITE_SUPABASE_URL).hostname.split('.')[0];
    keysToClear.add(`sb-${projectRef}-auth-token`);
    keysToClear.add(`sb-${projectRef}-auth-token-code-verifier`);
  } catch {
    // Ignore malformed URL envs and fall back to pattern-based cleanup below.
  }

  for (const storage of [window.localStorage, window.sessionStorage]) {
    Object.keys(storage)
      .filter((key) => key.startsWith('sb-') && key.includes('auth-token'))
      .forEach((key) => keysToClear.add(key));

    keysToClear.forEach((key) => storage.removeItem(key));
  }
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);

  // Check if user has admin role using security definer functions (bypasses RLS)
  const checkAdminRole = useCallback(async (userId: string) => {
    try {
      setRoleChecked(false);
      const [adminResult, globalAdminResult] = await Promise.all([
        supabase.rpc('is_admin', { _user_id: userId }),
        supabase.rpc('is_global_admin', { _user_id: userId }),
      ]);
      
      if (adminResult.error) {
        console.error('Error checking admin role:', adminResult.error);
        setIsAdmin(false);
        setIsGlobalAdmin(false);
        return;
      }
      
      setIsAdmin(!!adminResult.data);
      setIsGlobalAdmin(!!globalAdminResult.data);
    } catch (err) {
      console.error('Error checking admin role:', err);
      setIsAdmin(false);
      setIsGlobalAdmin(false);
    } finally {
      setRoleChecked(true);
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer admin check with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            checkAdminRole(session.user.id);
          }, 0);
        } else {
          setIsAdmin(false);
          setIsGlobalAdmin(false);
          setRoleChecked(true);
        }
        
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkAdminRole(session.user.id);
      } else {
        setIsAdmin(false);
        setIsGlobalAdmin(false);
        setRoleChecked(true);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [checkAdminRole]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    return { error };
  };

  const signOut = async () => {
    setIsLoading(true);
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setIsGlobalAdmin(false);
    setRoleChecked(true);

    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) {
        console.warn('Sign out returned an error; clearing stored session manually.', error);
      }
    } finally {
      clearPersistedAuthSession();
      window.location.replace('/auth');
    }
  };

  return {
    user,
    session,
    isLoading,
    isAdmin,
    isGlobalAdmin,
    roleChecked,
    signIn,
    signUp,
    signOut,
  };
}
