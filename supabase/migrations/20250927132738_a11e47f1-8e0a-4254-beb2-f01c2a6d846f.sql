-- Create customer segments table
CREATE TABLE public.customer_segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  criteria JSONB NOT NULL DEFAULT '{}',
  color TEXT DEFAULT '#3B82F6',
  is_automated BOOLEAN DEFAULT true,
  branch_id UUID NOT NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create customer analytics table for tracking key metrics
CREATE TABLE public.customer_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  branch_id UUID NOT NULL,
  
  -- Engagement metrics
  total_orders INTEGER DEFAULT 0,
  total_spent NUMERIC DEFAULT 0,
  avg_order_value NUMERIC DEFAULT 0,
  last_order_date DATE,
  first_order_date DATE,
  
  -- Behavioral metrics
  days_since_last_order INTEGER DEFAULT 0,
  order_frequency NUMERIC DEFAULT 0, -- orders per month
  lifetime_value NUMERIC DEFAULT 0,
  predicted_clv NUMERIC DEFAULT 0, -- customer lifetime value prediction
  
  -- Engagement scores
  engagement_score INTEGER DEFAULT 50, -- 0-100
  loyalty_tier TEXT DEFAULT 'new' CHECK (loyalty_tier IN ('new', 'bronze', 'silver', 'gold', 'platinum')),
  churn_risk TEXT DEFAULT 'low' CHECK (churn_risk IN ('low', 'medium', 'high')),
  
  -- Segmentation
  primary_segment_id UUID,
  segment_ids UUID[] DEFAULT '{}',
  
  -- Timestamps
  last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  UNIQUE(customer_id, branch_id)
);

-- Create customer interactions table for tracking touchpoints
CREATE TABLE public.customer_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  branch_id UUID NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('email', 'call', 'meeting', 'quote_sent', 'order_placed', 'payment_received', 'support_ticket', 'website_visit')),
  interaction_source TEXT, -- email, phone, website, etc.
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_interactions ENABLE ROW LEVEL SECURITY;

-- Create policies for customer_segments
CREATE POLICY "Branch access policy for customer_segments" 
ON public.customer_segments 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.branch_id = customer_segments.branch_id
  )
);

-- Create policies for customer_analytics
CREATE POLICY "Branch access policy for customer_analytics" 
ON public.customer_analytics 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.branch_id = customer_analytics.branch_id
  )
);

-- Create policies for customer_interactions
CREATE POLICY "Branch access policy for customer_interactions" 
ON public.customer_interactions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.branch_id = customer_interactions.branch_id
  )
);

-- Create triggers for timestamps
CREATE TRIGGER update_customer_segments_updated_at
BEFORE UPDATE ON public.customer_segments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_analytics_updated_at
BEFORE UPDATE ON public.customer_analytics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate customer analytics
CREATE OR REPLACE FUNCTION public.calculate_customer_analytics(p_customer_id UUID, p_branch_id UUID)
RETURNS VOID AS $$
DECLARE
  analytics_record RECORD;
  order_stats RECORD;
  days_since_last INTEGER;
  frequency_per_month NUMERIC;
  engagement INTEGER;
  loyalty TEXT;
  churn_risk_level TEXT;
BEGIN
  -- Calculate order statistics
  SELECT 
    COUNT(*) as total_orders,
    COALESCE(SUM(total_amount), 0) as total_spent,
    COALESCE(AVG(total_amount), 0) as avg_order_value,
    MAX(order_date) as last_order_date,
    MIN(order_date) as first_order_date
  INTO order_stats
  FROM public.orders 
  WHERE customer_id = p_customer_id AND branch_id = p_branch_id;
  
  -- Calculate days since last order
  days_since_last := COALESCE(
    EXTRACT(DAY FROM (CURRENT_DATE - order_stats.last_order_date)), 
    999
  );
  
  -- Calculate order frequency (orders per month)
  IF order_stats.first_order_date IS NOT NULL THEN
    frequency_per_month := order_stats.total_orders / GREATEST(
      EXTRACT(MONTH FROM AGE(COALESCE(order_stats.last_order_date, CURRENT_DATE), order_stats.first_order_date)) + 1,
      1
    );
  ELSE
    frequency_per_month := 0;
  END IF;
  
  -- Calculate engagement score (0-100)
  engagement := LEAST(100, GREATEST(0, 
    (CASE WHEN order_stats.total_orders > 0 THEN 20 ELSE 0 END) +
    (CASE WHEN days_since_last <= 30 THEN 25 WHEN days_since_last <= 90 THEN 15 WHEN days_since_last <= 180 THEN 5 ELSE 0 END) +
    (CASE WHEN order_stats.total_spent > 100000 THEN 25 WHEN order_stats.total_spent > 50000 THEN 15 WHEN order_stats.total_spent > 10000 THEN 10 ELSE 5 END) +
    (CASE WHEN frequency_per_month >= 2 THEN 20 WHEN frequency_per_month >= 1 THEN 15 WHEN frequency_per_month >= 0.5 THEN 10 ELSE 5 END) +
    (CASE WHEN order_stats.avg_order_value > 20000 THEN 10 WHEN order_stats.avg_order_value > 10000 THEN 5 ELSE 0 END)
  ));
  
  -- Determine loyalty tier
  loyalty := CASE 
    WHEN order_stats.total_spent > 500000 AND order_stats.total_orders >= 10 THEN 'platinum'
    WHEN order_stats.total_spent > 200000 AND order_stats.total_orders >= 5 THEN 'gold'
    WHEN order_stats.total_spent > 50000 AND order_stats.total_orders >= 3 THEN 'silver'
    WHEN order_stats.total_orders >= 1 THEN 'bronze'
    ELSE 'new'
  END;
  
  -- Determine churn risk
  churn_risk_level := CASE 
    WHEN days_since_last > 180 AND order_stats.total_orders > 1 THEN 'high'
    WHEN days_since_last > 90 AND order_stats.total_orders > 1 THEN 'medium'
    ELSE 'low'
  END;
  
  -- Insert or update analytics record
  INSERT INTO public.customer_analytics (
    customer_id,
    branch_id,
    total_orders,
    total_spent,
    avg_order_value,
    last_order_date,
    first_order_date,
    days_since_last_order,
    order_frequency,
    lifetime_value,
    predicted_clv,
    engagement_score,
    loyalty_tier,
    churn_risk,
    last_calculated_at
  ) VALUES (
    p_customer_id,
    p_branch_id,
    order_stats.total_orders,
    order_stats.total_spent,
    order_stats.avg_order_value,
    order_stats.last_order_date,
    order_stats.first_order_date,
    days_since_last,
    frequency_per_month,
    order_stats.total_spent, -- Current LTV
    order_stats.total_spent * 1.5, -- Predicted CLV (simple multiplier)
    engagement,
    loyalty,
    churn_risk_level,
    NOW()
  )
  ON CONFLICT (customer_id, branch_id) 
  DO UPDATE SET
    total_orders = EXCLUDED.total_orders,
    total_spent = EXCLUDED.total_spent,
    avg_order_value = EXCLUDED.avg_order_value,
    last_order_date = EXCLUDED.last_order_date,
    first_order_date = EXCLUDED.first_order_date,
    days_since_last_order = EXCLUDED.days_since_last_order,
    order_frequency = EXCLUDED.order_frequency,
    lifetime_value = EXCLUDED.lifetime_value,
    predicted_clv = EXCLUDED.predicted_clv,
    engagement_score = EXCLUDED.engagement_score,
    loyalty_tier = EXCLUDED.loyalty_tier,
    churn_risk = EXCLUDED.churn_risk,
    last_calculated_at = EXCLUDED.last_calculated_at,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Insert default customer segments
INSERT INTO public.customer_segments (name, description, criteria, color, branch_id, created_by)
SELECT 
  segment_name,
  segment_description,
  segment_criteria::jsonb,
  segment_color,
  branches.id,
  NULL
FROM (
  VALUES 
    ('High Value Customers', 'Customers with high lifetime value and frequent purchases', '{"min_total_spent": 100000, "min_orders": 5}', '#10B981'),
    ('At Risk Customers', 'Previously active customers who haven''t ordered recently', '{"churn_risk": "high", "min_orders": 2}', '#EF4444'),
    ('New Customers', 'Customers who joined in the last 90 days', '{"days_since_first_order": {"max": 90}}', '#3B82F6'),
    ('Loyal Customers', 'Regular customers with consistent order patterns', '{"loyalty_tier": ["gold", "platinum"]}', '#F59E0B'),
    ('Price Sensitive', 'Customers who respond to discounts and lower-priced items', '{"avg_order_value": {"max": 10000}}', '#8B5CF6')
) AS segments(segment_name, segment_description, segment_criteria, segment_color)
CROSS JOIN public.branches
WHERE NOT EXISTS (
  SELECT 1 FROM public.customer_segments 
  WHERE customer_segments.branch_id = branches.id
);