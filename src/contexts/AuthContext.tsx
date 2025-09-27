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

    // Restore session from localStorage on app load
    const restoreSession = () => {
      try {
        const storedSession = localStorage.getItem('graven-session');
        const storedProfile = localStorage.getItem('graven-profile');
        
        if (storedSession && storedProfile) {
          const sessionData = JSON.parse(storedSession);
          const profileData = JSON.parse(storedProfile);
          
          // Only restore if session is not expired
          if (sessionData.expires_at && new Date(sessionData.expires_at * 1000) > new Date()) {
            setSession(sessionData);
            setUser(sessionData.user);
            setProfile(profileData);
          } else {
            // Clean up expired data
            localStorage.removeItem('graven-session');
            localStorage.removeItem('graven-profile');
          }
        }
      } catch (error) {
        console.error('Error restoring session:', error);
        localStorage.removeItem('graven-session');
        localStorage.removeItem('graven-profile');
      }
    };

    // Restore session first
    restoreSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isActive) return;
      
      console.log('Auth event:', event, session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      
      // Store or clear session data in localStorage
      if (session?.user) {
        try {
          localStorage.setItem('graven-session', JSON.stringify(session));
          // Use setTimeout to prevent blocking the auth callback
          setTimeout(() => {
            if (isActive) {
              fetchProfile(session.user.id);
            }
          }, 100);
        } catch (error) {
          console.error('Error storing session:', error);
        }
      } else {
        setProfile(null);
        // Clear all cached data on sign out
        localStorage.removeItem('graven-session');
        localStorage.removeItem('graven-profile');
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

        if (session) {
          setSession(session);
          setUser(session.user);
          localStorage.setItem('graven-session', JSON.stringify(session));
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

    // Only fetch initial session if we don't have a restored session
    if (!session) {
      getInitialSession();
    } else {
      setLoading(false);
    }

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
      // Store profile data in localStorage for persistence
      try {
        localStorage.setItem('graven-profile', JSON.stringify(data));
      } catch (error) {
        console.error('Error storing profile:', error);
      }
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
      
      // Clear all local storage items
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('graven-session');
      localStorage.removeItem('graven-profile');
      localStorage.removeItem('DEMO_MODE');
      
      // Clear sessionStorage as well
      sessionStorage.clear();
      
      // Sign out from Supabase (this will trigger the auth state change)
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      console.log('User signed out successfully');
      
      // Force redirect to auth page after cleanup
      setTimeout(() => {
        window.location.href = '/auth';
      }, 100);
      
    } catch (error) {
      console.error('Sign out error:', error);
      // Even if Supabase signOut fails, clear local data and redirect
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/auth';
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