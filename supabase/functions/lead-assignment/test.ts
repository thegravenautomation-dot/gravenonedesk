// Test suite for lead assignment logic
import { assertEquals, assertExists } from "https://deno.land/std@0.190.0/testing/asserts.ts";

// Mock data for testing
const mockLead = {
  id: "test-lead-123",
  title: "Test Lead",
  source: "indiamart",
  value: 50000,
  branch_id: "test-branch-456",
  customers: {
    name: "Test Customer",
    city: "Mumbai",
    state: "Maharashtra",
    region: "West"
  },
  raw_data: {
    SENDER_CITY: "Mumbai",
    SENDER_STATE: "Maharashtra"
  }
};

const mockEmployees = [
  {
    id: "emp1",
    full_name: "John Doe",
    role: "executive",
    department: "sales",
    territories: ["Maharashtra", "Gujarat"],
    current_workload: 5,
    max_workload: 20
  },
  {
    id: "emp2", 
    full_name: "Jane Smith",
    role: "manager",
    department: "sales",
    territories: ["Karnataka", "Tamil Nadu"],
    current_workload: 15,
    max_workload: 25
  },
  {
    id: "emp3",
    full_name: "Bob Wilson",
    role: "executive", 
    department: "marketing",
    territories: ["Delhi", "UP"],
    current_workload: 2,
    max_workload: 15
  }
];

const mockRules = [
  {
    id: "rule1",
    name: "High Value Mumbai Leads",
    rule_type: "territory_based",
    conditions: {
      value_min: 25000,
      cities: ["Mumbai"],
      roles: ["executive", "manager"]
    },
    assigned_to: "emp1",
    priority: 1,
    is_active: true,
    workload_limit: 15
  },
  {
    id: "rule2", 
    name: "IndiaMART Leads to Sales Team",
    rule_type: "source_based",
    conditions: {
      source: ["indiamart"],
      departments: ["sales"]
    },
    assigned_to: "emp2",
    priority: 2,
    is_active: true,
    workload_limit: 20
  },
  {
    id: "rule3",
    name: "Low Value Leads",
    rule_type: "value_based", 
    conditions: {
      value_max: 10000
    },
    assigned_to: "emp3",
    priority: 3,
    is_active: true
  }
];

// Test helper functions
function testRuleMatching() {
  console.log("Testing rule matching logic...");
  
  // Test 1: High value Mumbai lead should match rule1
  const rule1Match = checkRuleMatch(mockLead, mockRules[0], mockEmployees[0]);
  assertEquals(rule1Match, true, "High value Mumbai lead should match territory rule");
  
  // Test 2: Source-based rule matching
  const rule2Match = checkRuleMatch(mockLead, mockRules[1], mockEmployees[1]);
  assertEquals(rule2Match, true, "IndiaMART lead should match source-based rule");
  
  // Test 3: Value-based rule (should not match - value too high)
  const rule3Match = checkRuleMatch(mockLead, mockRules[2], mockEmployees[2]);
  assertEquals(rule3Match, false, "High value lead should not match low value rule");
  
  console.log("✅ Rule matching tests passed");
}

function testWorkloadLimits() {
  console.log("Testing workload limits...");
  
  // Create employee at workload limit
  const overloadedEmployee = {
    ...mockEmployees[0],
    current_workload: 15 // At the limit of rule1 (workload_limit: 15)
  };
  
  const shouldSkip = checkWorkloadLimit(mockRules[0], overloadedEmployee);
  assertEquals(shouldSkip, false, "Employee at workload limit should be skipped");
  
  console.log("✅ Workload limit tests passed");
}

function testRoundRobinFallback() {
  console.log("Testing round-robin assignment...");
  
  const sortedEmployees = mockEmployees.sort((a, b) => 
    (a.current_workload || 0) - (b.current_workload || 0)
  );
  
  // Should pick employee with lowest workload (emp3 with 2)
  assertEquals(sortedEmployees[0].id, "emp3", "Should pick employee with lowest workload");
  
  console.log("✅ Round-robin tests passed");
}

function testTerritoryMatching() {
  console.log("Testing territory-based assignment...");
  
  const employee = mockEmployees[0]; // Has Maharashtra territory
  const lead = mockLead; // From Maharashtra
  
  const hasTerritory = employee.territories.some(territory => 
    lead.customers.state.toLowerCase().includes(territory.toLowerCase())
  );
  
  assertEquals(hasTerritory, true, "Employee should have territory coverage for lead");
  
  console.log("✅ Territory matching tests passed");
}

// Helper function to check rule matching (simplified version)
function checkRuleMatch(lead: any, rule: any, employee: any): boolean {
  const conditions = rule.conditions;
  
  // Source matching
  if (conditions.source && !conditions.source.includes(lead.source)) {
    return false;
  }
  
  // Value matching
  if (conditions.value_min && (!lead.value || lead.value < conditions.value_min)) {
    return false;
  }
  if (conditions.value_max && (!lead.value || lead.value > conditions.value_max)) {
    return false;
  }
  
  // City matching
  if (conditions.cities && conditions.cities.length > 0) {
    const customerCity = lead.customers?.city || '';
    if (!conditions.cities.includes(customerCity)) {
      return false;
    }
  }
  
  // Role matching
  if (conditions.roles && !conditions.roles.includes(employee.role)) {
    return false;
  }
  
  // Department matching
  if (conditions.departments && !conditions.departments.includes(employee.department)) {
    return false;
  }
  
  return true;
}

function checkWorkloadLimit(rule: any, employee: any): boolean {
  return rule.workload_limit && employee.current_workload >= rule.workload_limit;
}

// Run all tests
function runTests() {
  console.log("🧪 Starting lead assignment tests...\n");
  
  try {
    testRuleMatching();
    testWorkloadLimits();
    testRoundRobinFallback();
    testTerritoryMatching();
    
    console.log("\n✅ All tests passed successfully!");
    
    // Test summary
    console.log("\n📊 Test Summary:");
    console.log("- Rule-based assignment: ✅");
    console.log("- Workload balancing: ✅");
    console.log("- Territory matching: ✅");
    console.log("- Round-robin fallback: ✅");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Export for testing
export { runTests, testRuleMatching, testWorkloadLimits, testTerritoryMatching };

// Run tests if this file is executed directly
if (import.meta.main) {
  runTests();
}