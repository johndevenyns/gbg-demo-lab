import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Theme = 'light' | 'dark';

export function useThemePreference() {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check localStorage first for instant render (no flash)
    const stored = localStorage.getItem('theme');
    return (stored === 'dark' ? 'dark' : 'light');
  });
  const [isLoading, setIsLoading] = useState(true);

  // Apply theme to document
  const applyTheme = useCallback((t: Theme) => {
    document.documentElement.classList.toggle('dark', t === 'dark');
    localStorage.setItem('theme', t);
  }, []);

  // Load preference from DB on auth change
  useEffect(() => {
    let cancelled = false;

    const loadPreference = async (userId: string) => {
      try {
        const { data } = await supabase
          .from('user_preferences')
          .select('theme')
          .eq('user_id', userId)
          .maybeSingle();

        if (cancelled) return;

        if (data?.theme) {
          const t = data.theme as Theme;
          setThemeState(t);
          applyTheme(t);
        }
      } catch (err) {
        console.error('Error loading theme preference:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          loadPreference(session.user.id);
        } else {
          setIsLoading(false);
        }
      }
    );

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadPreference(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // Apply initial theme
    applyTheme(theme);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setTheme = useCallback(async (newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);

    // Persist to DB
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const userId = session.user.id;

    // Upsert preference
    const { error } = await supabase
      .from('user_preferences')
      .upsert(
        { user_id: userId, theme: newTheme },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('Error saving theme preference:', error);
    }
  }, [applyTheme]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  return { theme, setTheme, toggleTheme, isLoading };
}
