import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { DollarSign, Bell, Package } from "lucide-react";

interface NotificationData {
  id: string;
  type: 'payment' | 'order_status' | 'dispatch';
  title: string;
  message: string;
  data?: any;
}

export function useRealtimeNotifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  useEffect(() => {
    if (!profile?.branch_id) return;

    const channels: any[] = [];

    // Payment notifications for Accounts & Sales
    if (['admin', 'manager', 'accountant', 'executive'].includes(profile.role)) {
      const paymentChannel = supabase
        .channel('payments-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'payments',
            filter: `branch_id=eq.${profile.branch_id}`
          },
          (payload) => {
            console.log('Payment notification received:', payload);
            
            const notification: NotificationData = {
              id: `payment-${payload.new.id}`,
              type: 'payment',
              title: 'New Payment Recorded',
              message: `Payment of ₹${payload.new.amount?.toLocaleString()} recorded`,
              data: payload.new
            };
            
            setNotifications(prev => [notification, ...prev.slice(0, 9)]);
            
            toast.success(`💰 Payment recorded: ₹${payload.new.amount?.toLocaleString()}`, {
              description: `Order payment received - ${payload.new.method || payload.new.payment_mode}`,
              duration: 5000
            });
          }
        )
        .subscribe();

      channels.push(paymentChannel);
    }

    // Order status notifications for Dispatch
    if (['admin', 'manager', 'dispatch'].includes(profile.role)) {
      const orderChannel = supabase
        .channel('orders-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `branch_id=eq.${profile.branch_id}`
          },
          (payload) => {
            console.log('Order status notification received:', payload);
            
            // Check if status changed to 'paid' (ready for dispatch)
            if (payload.new.status === 'paid' && payload.old.status !== 'paid') {
              const notification: NotificationData = {
                id: `order-${payload.new.id}`,
                type: 'dispatch',
                title: 'Order Ready for Dispatch',
                message: `Order ${payload.new.order_no} is fully paid and ready for shipping`,
                data: payload.new
              };
              
              setNotifications(prev => [notification, ...prev.slice(0, 9)]);
              
              toast.success(`📦 Ready for Dispatch: ${payload.new.order_no}`, {
                description: 'Order is fully paid and ready for shipping',
                duration: 6000
              });
            }
          }
        )
        .subscribe();

      channels.push(orderChannel);
    }

    // Customer ledger notifications for Accounts
    if (['admin', 'manager', 'accountant'].includes(profile.role)) {
      const ledgerChannel = supabase
        .channel('customer-ledger-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'customer_ledger',
            filter: `branch_id=eq.${profile.branch_id}`
          },
          (payload) => {
            console.log('Ledger notification received:', payload);
            
            if (payload.new.transaction_type === 'payment') {
              const notification: NotificationData = {
                id: `ledger-${payload.new.id}`,
                type: 'payment',
                title: 'Ledger Updated',
                message: `Customer ledger updated with payment of ₹${payload.new.credit_amount?.toLocaleString()}`,
                data: payload.new
              };
              
              setNotifications(prev => [notification, ...prev.slice(0, 9)]);
            }
          }
        )
        .subscribe();

      channels.push(ledgerChannel);
    }

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [profile?.branch_id, profile?.role]);

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  return {
    notifications,
    clearNotification,
    clearAllNotifications
  };
}