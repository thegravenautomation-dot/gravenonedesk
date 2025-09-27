import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LeadAssignmentRequest {
  leadId: string;
  branchId: string;
  forceReassign?: boolean;
}

interface AssignmentRule {
  id: string;
  name: string;
  rule_type: 'role_based' | 'territory_based' | 'value_based' | 'source_based' | 'round_robin';
  conditions: {
    source?: string[];
    value_min?: number;
    value_max?: number;
    regions?: string[];
    cities?: string[];
    states?: string[];
    roles?: string[];
    departments?: string[];
  };
  assigned_to: string;
  priority: number;
  is_active: boolean;
  workload_limit?: number;
}

interface Lead {
  id: string;
  title: string;
  source: string;
  value?: number;
  customer_id?: string;
  raw_data?: any;
  branch_id: string;
}

interface Employee {
  id: string;
  full_name: string;
  role: string;
  department?: string;
  territories?: string[];
  current_workload?: number;
  max_workload?: number;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const { leadId, branchId, forceReassign = false }: LeadAssignmentRequest = await req.json();
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log(`Processing lead assignment for lead ${leadId} in branch ${branchId}`);

    // Fetch lead details
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select(`
        *,
        customers (
          name, 
          company, 
          email, 
          phone, 
          city, 
          state, 
          region,
          address
        )
      `)
      .eq('id', leadId)
      .eq('branch_id', branchId)
      .single();

    if (leadError || !lead) {
      console.error('Error fetching lead:', leadError);
      return new Response(
        JSON.stringify({ error: 'Lead not found' }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Skip if already assigned and not forcing reassignment
    if (lead.assigned_to && !forceReassign) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Lead already assigned',
          assignedTo: lead.assigned_to 
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Fetch active assignment rules
    const { data: rules, error: rulesError } = await supabase
      .from('lead_assignment_rules')
      .select('*')
      .eq('branch_id', branchId)
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (rulesError) {
      console.error('Error fetching assignment rules:', rulesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch assignment rules' }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Fetch available employees with current workload
    const { data: employees, error: employeesError } = await supabase
      .from('profiles')
      .select(`
        id, 
        full_name, 
        role, 
        department,
        territories,
        max_workload
      `)
      .eq('branch_id', branchId)
      .eq('is_active', true)
      .in('role', ['admin', 'manager', 'executive', 'sales_rep']);

    if (employeesError) {
      console.error('Error fetching employees:', employeesError);
    }

    // Calculate current workload for each employee
    const employeesWithWorkload = await Promise.all(
      (employees || []).map(async (employee) => {
        const { data: workloadData, error: workloadError } = await supabase
          .from('leads')
          .select('id')
          .eq('assigned_to', employee.id)
          .eq('branch_id', branchId)
          .in('status', ['new', 'contacted', 'qualified', 'proposal']);

        const currentWorkload = workloadData?.length || 0;
        
        return {
          ...employee,
          current_workload: currentWorkload
        };
      })
    );

    // Enhanced rule matching logic
    const assignedEmployee = await findBestAssignment(lead, rules || [], employeesWithWorkload);

    if (!assignedEmployee) {
      // Fallback to round-robin assignment
      const availableEmployee = findRoundRobinAssignment(employeesWithWorkload);
      
      if (availableEmployee) {
        await assignLeadToEmployee(supabase, leadId, availableEmployee.id, 'round_robin_fallback');
        return new Response(
          JSON.stringify({ 
            success: true, 
            assignedTo: availableEmployee.id,
            assignedName: availableEmployee.full_name,
            method: 'round_robin_fallback',
            message: 'Lead assigned using round-robin fallback'
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          }
        );
      } else {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'No available employees for assignment'
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          }
        );
      }
    }

    // Assign the lead
    await assignLeadToEmployee(supabase, leadId, assignedEmployee.employeeId, assignedEmployee.ruleName);

    console.log(`Lead ${leadId} assigned to ${assignedEmployee.employeeName} using rule: ${assignedEmployee.ruleName}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        assignedTo: assignedEmployee.employeeId,
        assignedName: assignedEmployee.employeeName,
        ruleName: assignedEmployee.ruleName,
        ruleType: assignedEmployee.ruleType,
        message: 'Lead assigned successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('Error in lead-assignment function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
};

// Enhanced rule matching logic
async function findBestAssignment(
  lead: Lead & { customers?: any }, 
  rules: AssignmentRule[], 
  employees: Employee[]
): Promise<{ employeeId: string; employeeName: string; ruleName: string; ruleType: string } | null> {
  
  for (const rule of rules) {
    if (!rule.is_active) continue;

    const employee = employees.find(emp => emp.id === rule.assigned_to);
    if (!employee) continue;

    // Check workload limit
    if (rule.workload_limit && (employee.current_workload || 0) >= rule.workload_limit) {
      console.log(`Employee ${employee.full_name} has reached workload limit for rule ${rule.name}`);
      continue;
    }

    let ruleMatches = true;
    const conditions = rule.conditions;

    // Source-based matching
    if (conditions.source && conditions.source.length > 0) {
      if (!conditions.source.includes(lead.source)) {
        ruleMatches = false;
      }
    }

    // Value-based matching
    if (conditions.value_min && (!lead.value || lead.value < conditions.value_min)) {
      ruleMatches = false;
    }
    if (conditions.value_max && (!lead.value || lead.value > conditions.value_max)) {
      ruleMatches = false;
    }

    // Territory-based matching
    if (conditions.regions && conditions.regions.length > 0) {
      const customerRegion = lead.customers?.region || lead.raw_data?.SENDER_STATE || '';
      if (!conditions.regions.includes(customerRegion)) {
        ruleMatches = false;
      }
    }

    if (conditions.cities && conditions.cities.length > 0) {
      const customerCity = lead.customers?.city || lead.raw_data?.SENDER_CITY || '';
      if (!conditions.cities.includes(customerCity)) {
        ruleMatches = false;
      }
    }

    if (conditions.states && conditions.states.length > 0) {
      const customerState = lead.customers?.state || lead.raw_data?.SENDER_STATE || '';
      if (!conditions.states.includes(customerState)) {
        ruleMatches = false;
      }
    }

    // Role-based matching
    if (conditions.roles && conditions.roles.length > 0) {
      if (!conditions.roles.includes(employee.role)) {
        ruleMatches = false;
      }
    }

    // Department-based matching
    if (conditions.departments && conditions.departments.length > 0) {
      if (!employee.department || !conditions.departments.includes(employee.department)) {
        ruleMatches = false;
      }
    }

    // Territory assignment for employees
    if (employee.territories && employee.territories.length > 0) {
      const customerLocation = lead.customers?.state || lead.customers?.city || lead.raw_data?.SENDER_STATE || lead.raw_data?.SENDER_CITY || '';
      const hasTerritory = employee.territories.some(territory => 
        customerLocation.toLowerCase().includes(territory.toLowerCase())
      );
      if (!hasTerritory && rule.rule_type === 'territory_based') {
        ruleMatches = false;
      }
    }

    if (ruleMatches) {
      return {
        employeeId: employee.id,
        employeeName: employee.full_name,
        ruleName: rule.name,
        ruleType: rule.rule_type
      };
    }
  }

  return null;
}

// Round-robin assignment fallback
function findRoundRobinAssignment(employees: Employee[]): Employee | null {
  if (employees.length === 0) return null;
  
  // Sort by current workload (ascending) to balance load
  const sortedEmployees = employees.sort((a, b) => 
    (a.current_workload || 0) - (b.current_workload || 0)
  );
  
  // Find employee with lowest workload who hasn't exceeded max_workload
  for (const employee of sortedEmployees) {
    if (!employee.max_workload || (employee.current_workload || 0) < employee.max_workload) {
      return employee;
    }
  }
  
  // If all employees are at max workload, assign to the one with lowest workload
  return sortedEmployees[0];
}

// Assign lead to employee
async function assignLeadToEmployee(
  supabase: any, 
  leadId: string, 
  employeeId: string, 
  ruleName: string
): Promise<void> {
  const { error } = await supabase
    .from('leads')
    .update({ 
      assigned_to: employeeId,
      assignment_rule: ruleName,
      assigned_at: new Date().toISOString()
    })
    .eq('id', leadId);

  if (error) {
    throw new Error(`Failed to assign lead: ${error.message}`);
  }

  // Log assignment activity
  await supabase
    .from('lead_activities')
    .insert({
      lead_id: leadId,
      activity_type: 'assignment',
      description: `Lead assigned to employee via rule: ${ruleName}`,
      performed_by: employeeId,
      created_at: new Date().toISOString()
    });
}

serve(handler);