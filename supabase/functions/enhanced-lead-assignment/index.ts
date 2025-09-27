import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

interface AssignmentRule {
  id: string;
  rule_name: string;
  assigned_to: string;
  priority: number;
  is_active: boolean;
  conditions: {
    source?: string;
    value_min?: number;
    value_max?: number;
    value_bracket?: string;
    region?: string;
    state?: string;
    country?: string;
    city?: string;
    industry?: string;
    product_category?: string;
    lead_age_hours?: string;
    customer_segment?: string;
    time_of_day?: string;
    day_of_week?: string;
    communication_channel?: string;
    language_preference?: string;
    lead_score_min?: string;
    territory?: string;
    assignment_method?: string;
  };
}

interface Lead {
  id: string;
  value?: number;
  source?: string;
  region?: string;
  state?: string;
  city?: string;
  industry?: string;
  created_at: string;
  branch_id: string;
  customer_id?: string;
  raw_data?: any;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    const { lead_id, branch_id } = await req.json();

    if (!lead_id || !branch_id) {
      return new Response(
        JSON.stringify({ error: 'lead_id and branch_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get lead details
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', lead_id)
      .single();

    if (leadError || !lead) {
      return new Response(
        JSON.stringify({ error: 'Lead not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all active assignment rules for the branch
    const { data: rules, error: rulesError } = await supabase
      .from('lead_assignment_rules')
      .select('*')
      .eq('branch_id', branch_id)
      .eq('is_active', true)
      .order('priority');

    if (rulesError) {
      throw rulesError;
    }

    // Check for previous salesperson (highest priority)
    if (lead.customer_id) {
      const { data: previousAssignment } = await supabase
        .rpc('get_previous_salesperson_for_customer', {
          p_customer_id: lead.customer_id,
          p_branch_id: branch_id
        });

      if (previousAssignment) {
        await assignLead(supabase, lead_id, previousAssignment, null, false);
        return new Response(
          JSON.stringify({ 
            success: true, 
            assigned_to: previousAssignment, 
            reason: 'Previous customer relationship' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Apply enhanced rule matching
    for (const rule of rules || []) {
      if (await matchesAdvancedRule(lead, rule)) {
        const assignedUser = await executeAssignmentMethod(supabase, rule, branch_id);
        if (assignedUser) {
          await assignLead(supabase, lead_id, assignedUser, rule.id, false);
          return new Response(
            JSON.stringify({ 
              success: true, 
              assigned_to: assignedUser, 
              rule_used: rule.id,
              rule_name: rule.rule_name,
              assignment_method: rule.conditions.assignment_method || 'direct'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'No matching rules found',
        assigned_to: null 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Enhanced lead assignment error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function matchesAdvancedRule(lead: Lead, rule: AssignmentRule): Promise<boolean> {
  const conditions = rule.conditions;
  const now = new Date();
  const leadCreatedAt = new Date(lead.created_at);

  // Source matching
  if (conditions.source && conditions.source !== 'any' && lead.source !== conditions.source) {
    return false;
  }

  // Value range matching
  if (conditions.value_min && lead.value && lead.value < conditions.value_min) {
    return false;
  }
  if (conditions.value_max && lead.value && lead.value > conditions.value_max) {
    return false;
  }

  // Value bracket matching
  if (conditions.value_bracket && lead.value) {
    const value = lead.value;
    switch (conditions.value_bracket) {
      case 'small':
        if (value >= 50000) return false;
        break;
      case 'medium':
        if (value < 50000 || value >= 500000) return false;
        break;
      case 'large':
        if (value < 500000 || value >= 2500000) return false;
        break;
      case 'enterprise':
        if (value < 2500000) return false;
        break;
    }
  }

  // Geographic matching
  if (conditions.region && lead.region !== conditions.region) return false;
  if (conditions.state && lead.state !== conditions.state) return false;
  if (conditions.city && lead.city !== conditions.city) return false;
  if (conditions.country && conditions.country !== '' && 
      lead.raw_data?.country !== conditions.country) return false;

  // Industry matching
  if (conditions.industry && lead.industry !== conditions.industry) return false;

  // Lead freshness matching
  if (conditions.lead_age_hours) {
    const maxAgeHours = parseInt(conditions.lead_age_hours);
    const hoursSinceCreated = (now.getTime() - leadCreatedAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreated > maxAgeHours) return false;
  }

  // Time-based matching
  if (conditions.time_of_day) {
    const currentHour = now.getHours();
    switch (conditions.time_of_day) {
      case 'morning':
        if (currentHour < 9 || currentHour >= 12) return false;
        break;
      case 'afternoon':
        if (currentHour < 12 || currentHour >= 17) return false;
        break;
      case 'evening':
        if (currentHour < 17 || currentHour >= 20) return false;
        break;
      case 'business_hours':
        if (currentHour < 9 || currentHour >= 18) return false;
        break;
      case 'after_hours':
        if (currentHour >= 9 && currentHour < 18) return false;
        break;
    }
  }

  // Day of week matching
  if (conditions.day_of_week) {
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    switch (conditions.day_of_week) {
      case 'weekdays':
        if (dayOfWeek === 0 || dayOfWeek === 6) return false;
        break;
      case 'weekends':
        if (dayOfWeek !== 0 && dayOfWeek !== 6) return false;
        break;
      case 'monday':
        if (dayOfWeek !== 1) return false;
        break;
      case 'tuesday':
        if (dayOfWeek !== 2) return false;
        break;
      case 'wednesday':
        if (dayOfWeek !== 3) return false;
        break;
      case 'thursday':
        if (dayOfWeek !== 4) return false;
        break;
      case 'friday':
        if (dayOfWeek !== 5) return false;
        break;
      case 'saturday':
        if (dayOfWeek !== 6) return false;
        break;
      case 'sunday':
        if (dayOfWeek !== 0) return false;
        break;
    }
  }

  // Additional conditions can be added here for:
  // - customer_segment
  // - communication_channel
  // - language_preference
  // - lead_score_min
  // - territory
  // - product_category

  return true;
}

async function executeAssignmentMethod(supabase: any, rule: AssignmentRule, branchId: string): Promise<string | null> {
  const method = rule.conditions.assignment_method || 'direct';

  switch (method) {
    case 'direct':
      return rule.assigned_to;

    case 'round_robin':
      return await roundRobinAssignment(supabase, branchId);

    case 'workload_balanced':
      return await workloadBalancedAssignment(supabase, branchId);

    case 'skill_based':
      return await skillBasedAssignment(supabase, rule, branchId);

    default:
      return rule.assigned_to;
  }
}

async function roundRobinAssignment(supabase: any, branchId: string): Promise<string | null> {
  // Get all active sales reps in the branch
  const { data: salesReps } = await supabase
    .from('profiles')
    .select('id')
    .eq('branch_id', branchId)
    .eq('is_active', true)
    .in('role', ['executive', 'manager', 'sales_manager']);

  if (!salesReps || salesReps.length === 0) return null;

  // Get the last assigned rep and pick the next one
  const { data: lastAssignment } = await supabase
    .from('lead_assignment_log')
    .select('assigned_to')
    .eq('branch_id', branchId)
    .order('timestamp', { ascending: false })
    .limit(1);

  if (!lastAssignment || lastAssignment.length === 0) {
    return salesReps[0].id;
  }

  const lastAssignedIndex = salesReps.findIndex((rep: any) => rep.id === lastAssignment[0].assigned_to);
  const nextIndex = (lastAssignedIndex + 1) % salesReps.length;
  return salesReps[nextIndex].id;
}

async function workloadBalancedAssignment(supabase: any, branchId: string): Promise<string | null> {
  // Get sales reps with their current lead counts
  const { data: workloadData } = await supabase
    .from('profiles')
    .select(`
      id,
      leads!leads_assigned_to_fkey (
        id,
        status
      )
    `)
    .eq('branch_id', branchId)
    .eq('is_active', true)
    .in('role', ['executive', 'manager', 'sales_manager']);

  if (!workloadData || workloadData.length === 0) return null;

  // Calculate active lead counts and find the rep with lowest workload
  let minWorkload = Infinity;
  let selectedRep = null;

  for (const rep of workloadData) {
    const activeLeads = rep.leads?.filter((lead: any) => 
      ['new', 'contacted', 'qualified', 'proposal'].includes(lead.status)
    ).length || 0;

    if (activeLeads < minWorkload) {
      minWorkload = activeLeads;
      selectedRep = rep.id;
    }
  }

  return selectedRep;
}

async function skillBasedAssignment(supabase: any, rule: AssignmentRule, branchId: string): Promise<string | null> {
  // This is a placeholder for skill-based matching
  // In a real implementation, you would match lead requirements to rep skills
  // For now, fall back to direct assignment
  return rule.assigned_to;
}

async function assignLead(supabase: any, leadId: string, assignedTo: string, ruleId: string | null, isManual: boolean) {
  // Update the lead
  await supabase
    .from('leads')
    .update({ assigned_to: assignedTo })
    .eq('id', leadId);

  // Log the assignment
  await supabase
    .from('lead_assignment_log')
    .insert({
      lead_id: leadId,
      assigned_to: assignedTo,
      rule_used: ruleId,
      manual_override: isManual,
      timestamp: new Date().toISOString()
    });
}