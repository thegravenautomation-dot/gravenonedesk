-- Fix the function with proper search path
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