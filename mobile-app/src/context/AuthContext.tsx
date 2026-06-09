import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../api/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isPremium: boolean;
  premiumUntil: string | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isPremium: false,
  premiumUntil: null,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumUntil, setPremiumUntil] = useState<string | null>(null);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('premium_until')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data && data.premium_until) {
        setPremiumUntil(data.premium_until);
        const premiumDate = new Date(data.premium_until);
        setIsPremium(premiumDate > new Date());
      } else {
        setPremiumUntil(null);
        setIsPremium(false);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setPremiumUntil(null);
      setIsPremium(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setPremiumUntil(null);
        setIsPremium(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Make sure we stop loading when profile fetches are finished or failed
  useEffect(() => {
    if (user && premiumUntil !== undefined) {
      setLoading(false);
    }
  }, [user, premiumUntil]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isPremium, premiumUntil, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
