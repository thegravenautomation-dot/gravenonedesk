-- Enable real-time for payments and orders tables
ALTER TABLE public.payments REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.customer_ledger REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_ledger;

-- Create notifications table for real-time alerts
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    branch_id UUID NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info', -- info, success, warning, error
    entity_type TEXT, -- order, payment, customer, etc.
    entity_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND branch_id = notifications.branch_id
));

CREATE POLICY "System can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND branch_id = notifications.branch_id
));

-- Add notifications to realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create function to send payment notifications
CREATE OR REPLACE FUNCTION public.notify_payment_recorded()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert notification for payment recorded
    INSERT INTO public.notifications (
        branch_id,
        title,
        message,
        type,
        entity_type,
        entity_id
    ) VALUES (
        NEW.branch_id,
        'Payment Recorded',
        'Payment of ₹' || NEW.amount || ' recorded for Order ' || (
            SELECT order_no FROM public.orders WHERE id = NEW.order_id
        ),
        'success',
        'payment',
        NEW.id
    );

    -- Check if order is fully paid and notify dispatch
    DECLARE
        order_total NUMERIC;
        total_payments NUMERIC;
    BEGIN
        SELECT total_amount INTO order_total
        FROM public.orders 
        WHERE id = NEW.order_id;
        
        SELECT COALESCE(SUM(amount), 0) INTO total_payments
        FROM public.payments 
        WHERE order_id = NEW.order_id;
        
        -- If fully paid, notify dispatch and update order status
        IF total_payments >= order_total THEN
            -- Update order status to paid
            UPDATE public.orders 
            SET status = 'paid'
            WHERE id = NEW.order_id;
            
            -- Notify dispatch team
            INSERT INTO public.notifications (
                branch_id,
                title,
                message,
                type,
                entity_type,
                entity_id
            ) VALUES (
                NEW.branch_id,
                'Order Ready for Dispatch',
                'Order ' || (SELECT order_no FROM public.orders WHERE id = NEW.order_id) || ' is fully paid and ready for dispatch',
                'info',
                'order',
                NEW.order_id
            );
        END IF;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for payment notifications
DROP TRIGGER IF EXISTS payment_notification_trigger ON public.payments;
CREATE TRIGGER payment_notification_trigger
    AFTER INSERT ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_payment_recorded();

-- Create function to notify order updates
CREATE OR REPLACE FUNCTION public.notify_order_updated()
RETURNS TRIGGER AS $$
BEGIN
    -- Only notify on status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.notifications (
            branch_id,
            title,
            message,
            type,
            entity_type,
            entity_id
        ) VALUES (
            NEW.branch_id,
            'Order Status Updated',
            'Order ' || NEW.order_no || ' status changed from ' || COALESCE(OLD.status, 'unknown') || ' to ' || NEW.status,
            CASE 
                WHEN NEW.status = 'completed' THEN 'success'
                WHEN NEW.status = 'cancelled' THEN 'warning'
                ELSE 'info'
            END,
            'order',
            NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for order status notifications
DROP TRIGGER IF EXISTS order_status_notification_trigger ON public.orders;
CREATE TRIGGER order_status_notification_trigger
    AFTER UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_order_updated();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_branch_created ON public.notifications(branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON public.notifications(entity_type, entity_id);