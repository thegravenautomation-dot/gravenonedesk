import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function useRealTimeOrders() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    if (!profile?.branch_id) return;

    const channel = supabase
      .channel('orders-payments-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `branch_id=eq.${profile.branch_id}`
        },
        (payload) => {
          console.log('Order update received:', payload);
          setLastUpdate(new Date());
          
          // Show toast for significant order updates
          if (payload.eventType === 'UPDATE') {
            const oldRecord = payload.old;
            const newRecord = payload.new;
            
            if (oldRecord?.status !== newRecord?.status) {
              toast({
                title: "Order Status Updated",
                description: `Order ${newRecord.order_no} status changed to ${newRecord.status}`,
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `branch_id=eq.${profile.branch_id}`
        },
        (payload) => {
          console.log('Payment update received:', payload);
          setLastUpdate(new Date());
          
          // Show toast for payment updates
          if (payload.eventType === 'INSERT') {
            const payment = payload.new;
            toast({
              title: "Payment Recorded",
              description: `Payment of ₹${payment.amount} recorded successfully`,
              variant: "default",
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_ledger',
          filter: `branch_id=eq.${profile.branch_id}`
        },
        (payload) => {
          console.log('Ledger update received:', payload);
          setLastUpdate(new Date());
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.branch_id, toast]);

  return {
    lastUpdate,
    // Trigger a re-fetch by returning the timestamp
    refreshTrigger: lastUpdate.getTime()
  };
}