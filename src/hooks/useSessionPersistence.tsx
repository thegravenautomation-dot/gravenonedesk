import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to handle session persistence and routing state
 * Ensures users stay on the correct page after browser refresh
 */
export function useSessionPersistence() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    // Store current route in sessionStorage when authenticated
    if (user && location.pathname !== '/auth') {
      sessionStorage.setItem('graven-last-route', location.pathname);
    }

    // Restore route after authentication
    if (user && location.pathname === '/') {
      const lastRoute = sessionStorage.getItem('graven-last-route');
      if (lastRoute && lastRoute !== '/auth' && lastRoute !== '/') {
        navigate(lastRoute, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }

    // Redirect to auth if not authenticated and on protected route
    if (!user && location.pathname !== '/auth' && location.pathname !== '/' && location.pathname !== '/vendor/register') {
      navigate('/auth', { replace: true });
    }
  }, [user, loading, location.pathname, navigate]);

  return { user, loading };
}