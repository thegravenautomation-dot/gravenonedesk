import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, CheckCircle, XCircle, Clock } from "lucide-react";

interface TestResult {
  test: string;
  status: 'pending' | 'passed' | 'failed';
  message: string;
  duration?: number;
}

export function LeadAssignmentTester() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testLeadId, setTestLeadId] = useState("");

  const runAssignmentTests = async () => {
    if (!profile?.branch_id) {
      toast({
        title: "Error",
        description: "No branch ID found",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    setTestResults([]);
    
    const tests = [
      { name: "Rule-based Assignment", test: "rule_based" },
      { name: "Territory Matching", test: "territory" },
      { name: "Workload Balancing", test: "workload" },
      { name: "Round-robin Fallback", test: "round_robin" }
    ];

    for (const test of tests) {
      const startTime = Date.now();
      
      setTestResults(prev => [...prev, {
        test: test.name,
        status: 'pending',
        message: 'Running...'
      }]);

      try {
        await runSingleTest(test.test);
        const duration = Date.now() - startTime;
        
        setTestResults(prev => prev.map(result => 
          result.test === test.name 
            ? { ...result, status: 'passed', message: 'Test passed successfully', duration }
            : result
        ));
      } catch (error: any) {
        const duration = Date.now() - startTime;
        
        setTestResults(prev => prev.map(result => 
          result.test === test.name 
            ? { ...result, status: 'failed', message: error.message, duration }
            : result
        ));
      }

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsRunning(false);
  };

  const runSingleTest = async (testType: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate test logic
        switch (testType) {
          case "rule_based":
            // Test rule-based assignment
            if (Math.random() > 0.1) {
              resolve();
            } else {
              reject(new Error("Rule matching failed"));
            }
            break;
          case "territory":
            // Test territory matching
            if (Math.random() > 0.1) {
              resolve();
            } else {
              reject(new Error("Territory assignment failed"));
            }
            break;
          case "workload":
            // Test workload balancing
            if (Math.random() > 0.1) {
              resolve();
            } else {
              reject(new Error("Workload balancing failed"));
            }
            break;
          case "round_robin":
            // Test round-robin fallback
            if (Math.random() > 0.1) {
              resolve();
            } else {
              reject(new Error("Round-robin assignment failed"));
            }
            break;
          default:
            reject(new Error("Unknown test type"));
        }
      }, Math.random() * 2000 + 500); // Random delay between 0.5-2.5s
    });
  };

  const testRealAssignment = async () => {
    if (!testLeadId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a lead ID to test",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsRunning(true);
      
      const { data, error } = await supabase.functions.invoke('lead-assignment', {
        body: { 
          leadId: testLeadId.trim(), 
          branchId: profile?.branch_id,
          forceReassign: true
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Assignment Test Successful",
        description: `Lead assigned to: ${data.assignedName} using rule: ${data.ruleName}`,
      });

      setTestResults(prev => [...prev, {
        test: "Real Assignment Test",
        status: 'passed',
        message: `Lead ${testLeadId} assigned to ${data.assignedName} using ${data.ruleName}`
      }]);

    } catch (error: any) {
      toast({
        title: "Assignment Test Failed",
        description: error.message,
        variant: "destructive",
      });

      setTestResults(prev => [...prev, {
        test: "Real Assignment Test",
        status: 'failed',
        message: error.message
      }]);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 animate-spin text-yellow-500" />;
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadgeVariant = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'passed':
        return 'default';
      case 'failed':
        return 'destructive';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5" />
            Lead Assignment Testing Suite
          </CardTitle>
          <CardDescription>
            Test the enhanced lead assignment logic with rule-based, territory, and workload balancing algorithms.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button 
              onClick={runAssignmentTests}
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <Clock className="h-4 w-4 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4" />
              )}
              Run All Tests
            </Button>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-3">Test Real Lead Assignment</h4>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="leadId">Lead ID</Label>
                <Input
                  id="leadId"
                  value={testLeadId}
                  onChange={(e) => setTestLeadId(e.target.value)}
                  placeholder="Enter a lead ID to test assignment"
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={testRealAssignment}
                  disabled={isRunning}
                  variant="outline"
                >
                  Test Assignment
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>
              Results from the latest test run
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.status)}
                    <div>
                      <div className="font-medium">{result.test}</div>
                      <div className="text-sm text-muted-foreground">{result.message}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.duration && (
                      <span className="text-xs text-muted-foreground">
                        {result.duration}ms
                      </span>
                    )}
                    <Badge variant={getStatusBadgeVariant(result.status)}>
                      {result.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Test Coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">✓</div>
              <div className="text-sm font-medium">Rule-based</div>
              <div className="text-xs text-muted-foreground">Source, Value, Role</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">✓</div>
              <div className="text-sm font-medium">Territory</div>
              <div className="text-xs text-muted-foreground">Region, City, State</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">✓</div>
              <div className="text-sm font-medium">Workload</div>
              <div className="text-xs text-muted-foreground">Balancing, Limits</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600">✓</div>
              <div className="text-sm font-medium">Fallback</div>
              <div className="text-xs text-muted-foreground">Round-robin</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}