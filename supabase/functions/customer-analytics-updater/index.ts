import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting customer analytics update...');
    
    const { customer_id, branch_id, trigger_type } = await req.json();
    
    if (!customer_id || !branch_id) {
      throw new Error('Missing required parameters: customer_id and branch_id');
    }
    
    console.log(`Updating analytics for customer ${customer_id} in branch ${branch_id}`);
    
    // Calculate customer analytics
    const { error: analyticsError } = await supabase.rpc('calculate_customer_analytics', {
      p_customer_id: customer_id,
      p_branch_id: branch_id
    });

    if (analyticsError) {
      console.error('Error calculating customer analytics:', analyticsError);
      throw analyticsError;
    }

    // Log customer interaction
    if (trigger_type) {
      const interactionType = trigger_type === 'order_created' ? 'order_placed' : 
                             trigger_type === 'payment_received' ? 'payment_received' : 
                             trigger_type === 'quotation_sent' ? 'quote_sent' : 'order_placed';

      const { error: interactionError } = await supabase
        .from('customer_interactions')
        .insert({
          customer_id: customer_id,
          branch_id: branch_id,
          interaction_type: interactionType,
          description: `Automated tracking: ${trigger_type}`,
          metadata: { automated: true, trigger: trigger_type }
        });

      if (interactionError) {
        console.error('Error logging customer interaction:', interactionError);
        // Don't throw here, as the main analytics update succeeded
      }
    }

    // Auto-assign customer to appropriate segments
    await autoAssignCustomerSegments(customer_id, branch_id);

    console.log(`Successfully updated analytics for customer ${customer_id}`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Customer analytics updated successfully' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in customer-analytics-updater:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Helper function to auto-assign customer to segments
async function autoAssignCustomerSegments(customerId: string, branchId: string) {
  try {
    // Get customer analytics
    const { data: analytics, error: analyticsError } = await supabase
      .from('customer_analytics')
      .select('*')
      .eq('customer_id', customerId)
      .eq('branch_id', branchId)
      .single();

    if (analyticsError || !analytics) {
      console.error('Error fetching customer analytics for segmentation:', analyticsError);
      return;
    }

    // Get all automated segments for the branch
    const { data: segments, error: segmentsError } = await supabase
      .from('customer_segments')
      .select('*')
      .eq('branch_id', branchId)
      .eq('is_automated', true);

    if (segmentsError) {
      console.error('Error fetching segments:', segmentsError);
      return;
    }

    // Find matching segments
    const matchingSegmentIds: string[] = [];
    
    for (const segment of segments || []) {
      const criteria = segment.criteria || {};
      let matches = true;

      // Check minimum total spent
      if (criteria.min_total_spent && analytics.total_spent < criteria.min_total_spent) {
        matches = false;
      }

      // Check minimum orders
      if (criteria.min_orders && analytics.total_orders < criteria.min_orders) {
        matches = false;
      }

      // Check loyalty tier
      if (criteria.loyalty_tier) {
        const allowedTiers = Array.isArray(criteria.loyalty_tier) 
          ? criteria.loyalty_tier 
          : [criteria.loyalty_tier];
        if (!allowedTiers.includes(analytics.loyalty_tier)) {
          matches = false;
        }
      }

      // Check churn risk
      if (criteria.churn_risk && analytics.churn_risk !== criteria.churn_risk) {
        matches = false;
      }

      // Check minimum engagement score
      if (criteria.engagement_score_min && analytics.engagement_score < criteria.engagement_score_min) {
        matches = false;
      }

      // Check maximum days since last order
      if (criteria.days_since_last_order_max && analytics.days_since_last_order > criteria.days_since_last_order_max) {
        matches = false;
      }

      if (matches) {
        matchingSegmentIds.push(segment.id);
      }
    }

    // Update customer analytics with segment assignments
    const primarySegment = matchingSegmentIds[0] || null;
    
    const { error: updateError } = await supabase
      .from('customer_analytics')
      .update({
        primary_segment_id: primarySegment,
        segment_ids: matchingSegmentIds
      })
      .eq('customer_id', customerId)
      .eq('branch_id', branchId);

    if (updateError) {
      console.error('Error updating customer segments:', updateError);
    } else {
      console.log(`Assigned customer to ${matchingSegmentIds.length} segments`);
    }

  } catch (error) {
    console.error('Error in auto-segment assignment:', error);
  }
}