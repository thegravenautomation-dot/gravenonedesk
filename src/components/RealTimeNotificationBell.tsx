import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Bell, BellOff, Check, CheckCheck, Trash2, Circle, ExternalLink } from "lucide-react";
import { useRealTimeNotifications } from "@/hooks/useRealTimeNotifications";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export function RealTimeNotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead, 
    clearNotifications 
  } = useRealTimeNotifications();

  // Debug logging
  useEffect(() => {
    console.log('Notification Bell - Notifications:', notifications);
    console.log('Notification Bell - Unread Count:', unreadCount);
    console.log('Notification Bell - Loading:', loading);
  }, [notifications, unreadCount, loading]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <Circle className="h-3 w-3 text-green-500 fill-current" />;
      case 'warning':
        return <Circle className="h-3 w-3 text-yellow-500 fill-current" />;
      case 'error':
        return <Circle className="h-3 w-3 text-red-500 fill-current" />;
      default:
        return <Circle className="h-3 w-3 text-blue-500 fill-current" />;
    }
  };

  const navigateToEntity = async (notification: any) => {
    const { entity_type, entity_id } = notification;
    
    try {
      switch (entity_type) {
        case 'payment':
          // Find the order associated with this payment
          const { data: paymentData, error: paymentError } = await supabase
            .from('payments')
            .select('order_id, orders(*)')
            .eq('id', entity_id)
            .single();
          
          if (paymentError) throw paymentError;
          
          if (paymentData?.order_id) {
            // Navigate to accounts dashboard and scroll to the order
            navigate('/accounts');
            toast({
              title: "Navigating to Payment",
              description: `Showing order ${paymentData.orders?.order_no} payment details`,
            });
          }
          break;
          
        case 'order':
          // Navigate to sales dashboard for order management
          navigate('/sales');
          toast({
            title: "Navigating to Order",
            description: "Opening sales dashboard to view order details",
          });
          break;
          
        case 'lead':
          // Navigate to sales dashboard for lead management
          navigate('/sales');
          toast({
            title: "Navigating to Lead",
            description: "Opening sales dashboard to view lead details",
          });
          break;
          
        case 'shipment':
          // Navigate to dispatch dashboard
          navigate('/dispatch');
          toast({
            title: "Navigating to Shipment",
            description: "Opening dispatch dashboard to view shipment details",
          });
          break;
          
        case 'customer':
          // Navigate to accounts dashboard for customer management
          navigate('/accounts');
          toast({
            title: "Navigating to Customer",
            description: "Opening accounts dashboard to view customer details",
          });
          break;
          
        default:
          // For other types, just show a generic message
          toast({
            title: "Notification Details",
            description: notification.message,
          });
          break;
      }
    } catch (error) {
      console.error('Error navigating to entity:', error);
      toast({
        title: "Navigation Error",
        description: "Could not navigate to the related item",
        variant: "destructive",
      });
    }
  };

  const handleNotificationClick = async (notification: any) => {
    try {
      // Mark as read if not already read
      if (!notification.is_read) {
        await markAsRead(notification.id);
      }
      
      // Navigate to the relevant entity
      await navigateToEntity(notification);
      
      // Close the popover
      setIsOpen(false);
      
    } catch (error) {
      console.error('Error handling notification click:', error);
      toast({
        title: "Error",
        description: "Failed to process notification",
        variant: "destructive",
      });
    }
  };

  const handleToggle = (open: boolean) => {
    console.log('Popover toggle:', open);
    setIsOpen(open);
  };

  if (loading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Bell className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={handleToggle}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="relative"
          onClick={() => {
            console.log('Bell clicked, current state:', isOpen);
            setIsOpen(!isOpen);
          }}
        >
          {notifications.length > 0 ? (
            <Bell className={`h-4 w-4 ${unreadCount > 0 ? 'text-primary' : ''}`} />
          ) : (
            <BellOff className="h-4 w-4" />
          )}
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead}
                title="Mark all as read"
              >
                <CheckCheck className="h-4 w-4" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearNotifications}
              title="Clear all"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <BellOff className="h-8 w-8 mx-auto mb-2" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-accent/50 transition-colors cursor-pointer group ${
                    !notification.is_read ? 'bg-accent/20' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-medium text-foreground flex items-center gap-2">
                          {notification.title}
                          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                        </p>
                        {!notification.is_read && (
                          <Circle className="h-2 w-2 text-blue-500 fill-current flex-shrink-0 ml-2" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-xs"
                onClick={() => setIsOpen(false)}
              >
                View All Notifications
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}