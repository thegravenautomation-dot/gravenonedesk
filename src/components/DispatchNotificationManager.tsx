import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function DispatchNotificationManager() {
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!profile?.branch_id) return;

    // Subscribe to dispatch-related notifications
    const channel = supabase
      .channel('dispatch-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `branch_id=eq.${profile.branch_id}`
        },
        (payload) => {
          const notification = payload.new;
          
          // Only show dispatch notifications to dispatch users or managers
          if (notification.title === 'Order Ready for Dispatch' && 
              (profile.department === 'Dispatch' || profile.role === 'admin' || profile.role === 'manager')) {
            
            // Enhanced notification for dispatch team
            toast({
              title: "🚚 Order Ready for Dispatch",
              description: notification.message,
              duration: 10000, // Longer duration for important notifications
            });

            // Play notification sound (optional)
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Order Ready for Dispatch', {
                body: notification.message,
                icon: '/favicon.ico'
              });
            }
          }
        }
      )
      .subscribe();

    // Request notification permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.branch_id, profile?.department, profile?.role, toast]);

  return null; // This is a utility component with no UI
}