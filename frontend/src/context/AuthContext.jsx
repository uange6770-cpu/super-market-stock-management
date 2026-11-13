import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL, key = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = url && key ? createClient(url, key) : null;
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null), [ready, setReady] = useState(false);
  useEffect(() => { if (!supabase) { setReady(true); return; } supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); }); const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s)); return () => data.subscription.unsubscribe(); }, []);
  const value = {
    session,
    ready,
    configured: !!supabase,
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signUp: (email, password, fullName) => supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    }),
    signOut: () => supabase?.auth.signOut(),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
