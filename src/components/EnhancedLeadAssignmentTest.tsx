import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Zap, Target, CheckCircle, XCircle } from "lucide-react";

export function EnhancedLeadAssignmentTest() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isTestingAssignment, setIsTestingAssignment] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<any>(null);

  const testEnhancedAssignment = async () => {
    if (!profile?.branch_id) return;
    
    setIsTestingAssignment(true);
    
    try {
      // Get a recent unassigned lead for testing
      const { data: testLead, error: leadError } = await supabase
        .from('leads')
        .select('id, title, source, value, region, state, city, created_at')
        .eq('branch_id', profile.branch_id)
        .is('assigned_to', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (leadError || !testLead || testLead.length === 0) {
        toast({
          title: "No Test Data",
          description: "No unassigned leads found for testing",
          variant: "destructive",
        });
        return;
      }

      const leadToTest = testLead[0];
      
      // Call the enhanced lead assignment function
      const { data: result, error } = await supabase.functions.invoke(
        'enhanced-lead-assignment',
        {
          body: {
            lead_id: leadToTest.id,
            branch_id: profile.branch_id
          }
        }
      );

      if (error) {
        console.error('Assignment test error:', error);
        toast({
          title: "Assignment Test Failed",
          description: error.message || "Failed to test lead assignment",
          variant: "destructive",
        });
        return;
      }

      setLastTestResult({
        lead: leadToTest,
        result: result,
        timestamp: new Date()
      });

      if (result.success) {
        toast({
          title: "Assignment Test Successful ✅",
          description: `Lead "${leadToTest.title}" assigned via ${result.assignment_method || 'direct'} method`,
        });
      } else {
        toast({
          title: "Assignment Test Completed ⚠️",
          description: result.message || "No matching rules found",
          variant: "destructive",
        });
      }

    } catch (error: any) {
      console.error('Assignment test error:', error);
      toast({
        title: "Test Error",
        description: error.message || "Failed to run assignment test",
        variant: "destructive",
      });
    } finally {
      setIsTestingAssignment(false);
    }
  };

  const formatAssignmentMethod = (method: string) => {
    switch (method) {
      case 'round_robin': return 'Round Robin';
      case 'workload_balanced': return 'Workload Balanced';
      case 'skill_based': return 'Skill-Based';
      case 'escalation': return 'Escalation';
      default: return 'Direct Assignment';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Enhanced Lead Assignment Test Suite
        </CardTitle>
        <CardDescription>
          Test the advanced lead assignment logic with all enhanced filtering and assignment methods
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testEnhancedAssignment}
          disabled={isTestingAssignment}
          className="w-full"
        >
          <Zap className="h-4 w-4 mr-2" />
          {isTestingAssignment ? 'Running Assignment Test...' : 'Test Enhanced Lead Assignment'}
        </Button>

        {lastTestResult && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              {lastTestResult.result.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="font-medium">
                Assignment Test Result
              </span>
              <Badge variant="outline">
                {lastTestResult.timestamp.toLocaleTimeString()}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Test Lead Details</h4>
                <div className="text-sm space-y-1">
                  <div><strong>Title:</strong> {lastTestResult.lead.title}</div>
                  <div><strong>Source:</strong> {lastTestResult.lead.source || 'N/A'}</div>
                  <div><strong>Value:</strong> {lastTestResult.lead.value ? `₹${lastTestResult.lead.value}` : 'N/A'}</div>
                  <div><strong>Location:</strong> {[
                    lastTestResult.lead.city,
                    lastTestResult.lead.state,
                    lastTestResult.lead.region
                  ].filter(Boolean).join(', ') || 'N/A'}</div>
                  <div><strong>Created:</strong> {new Date(lastTestResult.lead.created_at).toLocaleString()}</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Assignment Result</h4>
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <strong>Status:</strong>
                    <Badge variant={lastTestResult.result.success ? 'default' : 'destructive'}>
                      {lastTestResult.result.success ? 'Assigned' : 'Not Assigned'}
                    </Badge>
                  </div>
                  {lastTestResult.result.assigned_to && (
                    <div><strong>Assigned To:</strong> {lastTestResult.result.assigned_to}</div>
                  )}
                  {lastTestResult.result.rule_name && (
                    <div><strong>Rule Used:</strong> {lastTestResult.result.rule_name}</div>
                  )}
                  {lastTestResult.result.assignment_method && (
                    <div><strong>Method:</strong> {formatAssignmentMethod(lastTestResult.result.assignment_method)}</div>
                  )}
                  {lastTestResult.result.reason && (
                    <div><strong>Reason:</strong> {lastTestResult.result.reason}</div>
                  )}
                  {lastTestResult.result.message && !lastTestResult.result.success && (
                    <div><strong>Message:</strong> {lastTestResult.result.message}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          <strong>Test Features:</strong>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>Advanced rule matching with multiple criteria</li>
            <li>Value bracket filtering (Small, Medium, Large, Enterprise)</li>
            <li>Lead freshness and time-based assignment</li>
            <li>Geographic and industry-based routing</li>
            <li>Multiple assignment methods (Round Robin, Workload Balanced, Skill-Based)</li>
            <li>Customer relationship history priority</li>
            <li>Comprehensive assignment logging</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}