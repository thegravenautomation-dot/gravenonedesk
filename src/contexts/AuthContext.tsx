import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'

interface Profile {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'manager' | 'executive' | 'accountant' | 'hr' | 'procurement' | 'dispatch'
  branch_id: string
  phone: string | null
  employee_id: string | null
  department: string | null
  designation: string | null
  joining_date: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, userData: Partial<Profile>) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isActive = true; // Prevent state updates if component unmounts

    // Listen for auth changes first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isActive) return;
      
      console.log('Auth event:', event, session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Use setTimeout to prevent blocking the auth callback
        setTimeout(() => {
          if (isActive) {
            fetchProfile(session.user.id);
          }
        }, 100);
      } else {
        setProfile(null);
        // Clear any cached data on sign out
        localStorage.removeItem('supabase.auth.token');
      }
      setLoading(false);
    });

    // Then get initial session with timeout protection
    const getInitialSession = async () => {
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session fetch timeout')), 5000)
        );

        const sessionPromise = supabase.auth.getSession();
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;

        if (!isActive) return;

        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [])

  const fetchProfile = async (userId: string) => {
    try {
      // Add timeout protection (10 seconds)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
      );

      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

      if (error) {
        console.error('Profile fetch error:', error);
        // Don't throw error, just log it and continue
        return;
      }
      
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Don't throw error to prevent auth flow from breaking
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUp = async (email: string, password: string, userData: Partial<Profile>) => {
    const redirectUrl = `${window.location.origin}/auth`
    
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: userData // Pass user data as metadata to trigger
      }
    })
    if (error) throw error
  }

  const signOut = async () => {
    try {
      // Clear local state first
      setUser(null);
      setSession(null);
      setProfile(null);
      
      // Clear any local storage items
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('DEMO_MODE');
      
      // Sign out from Supabase (this will trigger the auth state change)
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}