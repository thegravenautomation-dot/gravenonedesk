import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Eye, AlertTriangle, Clock, User, Database } from "lucide-react";

interface AuditLog {
  id: string;
  accessed_by: string;
  employee_id: string;
  accessed_fields: string[];
  access_reason: string;
  created_at: string;
  accessor_name?: string;
  employee_name?: string;
}

interface SecurityRecommendation {
  recommendation: string;
  action_required: string;
}

export function SecurityAuditDashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [recommendations, setRecommendations] = useState<SecurityRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role === 'hr' || profile?.role === 'admin') {
      fetchAuditLogs();
      fetchSecurityRecommendations();
    }
  }, [profile]);

  const fetchAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('employee_data_audit')
        .select(`
          *,
          accessor:accessed_by(email),
          employee:employees!employee_id(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const transformedLogs = (data || []).map((log: any) => ({
        id: log.id,
        accessed_by: log.accessed_by,
        employee_id: log.employee_id,
        accessed_fields: log.accessed_fields,
        access_reason: log.access_reason,
        created_at: log.created_at,
        accessor_name: log.accessor?.email || 'Unknown',
        employee_name: log.employee?.full_name || 'Unknown'
      }));

      setAuditLogs(transformedLogs);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch audit logs",
        variant: "destructive",
      });
    }
  };

  const fetchSecurityRecommendations = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_security_recommendations');

      if (error) throw error;
      setRecommendations(data || []);
    } catch (error) {
      console.error('Error fetching security recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFieldsBadgeColor = (fields: string[]) => {
    if (fields.some(field => ['pan', 'aadhaar', 'bank_account'].includes(field))) {
      return 'destructive';
    }
    if (fields.includes('salary_info')) {
      return 'secondary';
    }
    return 'default';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (profile?.role !== 'hr' && profile?.role !== 'admin') {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
            <p className="text-muted-foreground">
              This security dashboard is only available to HR and Admin users.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Security Audit Dashboard
          </h2>
          <p className="text-muted-foreground">
            Monitor employee data access and security recommendations
          </p>
        </div>
      </div>

      {/* Security Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Security Recommendations
          </CardTitle>
          <CardDescription>
            Important security settings that need attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recommendations.map((rec, index) => (
              <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">{rec.recommendation}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{rec.action_required}</p>
                </div>
                <Badge variant="outline" className="ml-4">Action Required</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Access Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Recent Data Access Activity
          </CardTitle>
          <CardDescription>
            Latest access to sensitive employee data with automatic audit logging
          </CardDescription>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No audit logs found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Accessed By</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Data Fields</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {log.accessor_name}
                      </div>
                    </TableCell>
                    <TableCell>{log.employee_name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {log.accessed_fields.map((field) => (
                          <Badge 
                            key={field} 
                            variant={getFieldsBadgeColor([field])}
                            className="text-xs"
                          >
                            {field}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {log.access_reason}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDate(log.created_at)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}