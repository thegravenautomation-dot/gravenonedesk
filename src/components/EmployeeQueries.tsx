import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Plus, CheckCircle } from "lucide-react";

interface EmployeeQuery {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  employee_id: string;
  profiles?: {
    full_name: string;
  };
}

export function EmployeeQueries() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [queries, setQueries] = useState<EmployeeQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewQueryOpen, setIsNewQueryOpen] = useState(false);

  const [newQuery, setNewQuery] = useState({
    title: "",
    description: "",
    category: "general",
    priority: "medium"
  });

  useEffect(() => {
    fetchQueries();
  }, [profile?.id]);

  const fetchQueries = async () => {
    try {
      let query = supabase
        .from('employee_queries')
        .select(`
          *,
          profiles (full_name)
        `)
        .order('created_at', { ascending: false });

      // If HR/Admin, show all queries in branch, else show own queries
      if (profile?.role === 'hr' || profile?.role === 'admin') {
        query = query.eq('branch_id', profile.branch_id);
      } else {
        query = query.eq('employee_id', profile?.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setQueries(data || []);
    } catch (error) {
      console.error('Error fetching queries:', error);
      toast({
        title: "Error",
        description: "Failed to fetch queries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQuery = async () => {
    try {
      if (!newQuery.title || !newQuery.description) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);

      const { error } = await supabase
        .from('employee_queries')
        .insert({
          title: newQuery.title,
          description: newQuery.description,
          category: newQuery.category,
          priority: newQuery.priority,
          employee_id: profile?.id,
          branch_id: profile?.branch_id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Query submitted successfully",
      });

      setIsNewQueryOpen(false);
      setNewQuery({
        title: "",
        description: "",
        category: "general",
        priority: "medium"
      });

      fetchQueries();
    } catch (error: any) {
      console.error('Error submitting query:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit query",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResolveQuery = async (queryId: string) => {
    try {
      const { error } = await supabase
        .from('employee_queries')
        .update({ 
          status: 'resolved',
          resolved_at: new Date().toISOString()
        })
        .eq('id', queryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Query marked as resolved",
      });

      fetchQueries();
    } catch (error: any) {
      console.error('Error resolving query:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to resolve query",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && queries.length === 0) {
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
            <MessageSquare className="h-6 w-6" />
            Employee Queries
          </h2>
          <p className="text-muted-foreground">
            Submit and track employee queries and requests
          </p>
        </div>

        <Dialog open={isNewQueryOpen} onOpenChange={setIsNewQueryOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Submit Query
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Submit New Query</DialogTitle>
              <DialogDescription>
                Submit a query or request to HR/Admin
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={newQuery.title}
                  onChange={(e) => setNewQuery({ ...newQuery, title: e.target.value })}
                  placeholder="Enter query title"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={newQuery.category} onValueChange={(value) => setNewQuery({ ...newQuery, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="hr">HR</SelectItem>
                      <SelectItem value="it">IT Support</SelectItem>
                      <SelectItem value="payroll">Payroll</SelectItem>
                      <SelectItem value="leave">Leave</SelectItem>
                      <SelectItem value="benefits">Benefits</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={newQuery.priority} onValueChange={(value) => setNewQuery({ ...newQuery, priority: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea
                  value={newQuery.description}
                  onChange={(e) => setNewQuery({ ...newQuery, description: e.target.value })}
                  placeholder="Describe your query in detail"
                  rows={4}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsNewQueryOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitQuery} disabled={loading}>
                {loading ? "Submitting..." : "Submit Query"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Queries ({queries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queries.map((query) => (
                <TableRow key={query.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{query.title}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {query.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{query.profiles?.full_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {query.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPriorityColor(query.priority)}>
                      {query.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(query.status)}>
                      {query.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(query.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {(profile?.role === 'hr' || profile?.role === 'admin') && query.status !== 'resolved' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResolveQuery(query.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Resolve
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}