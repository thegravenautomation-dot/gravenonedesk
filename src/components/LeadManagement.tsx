import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Target, Plus, Settings, RefreshCw, ExternalLink, User, Calendar, DollarSign } from "lucide-react";

interface Lead {
  id: string;
  lead_no: string;
  title: string;
  description?: string;
  source?: string;
  status: string;
  value?: number;
  probability?: number;
  assigned_to?: string;
  expected_close_date?: string;
  created_at: string;
  customer_id?: string;
  lead_source_id?: string;
  external_id?: string;
  customers?: {
    name: string;
    company?: string;
    email?: string;
    phone?: string;
  };
  profiles?: {
    full_name: string;
  };
  lead_sources?: {
    name: string;
    source_type: string;
  };
}

interface LeadAssignmentRule {
  id: string;
  name: string;
  conditions: any;
  assigned_to: string;
  priority: number;
  is_active: boolean;
  profiles?: {
    full_name: string;
  };
}

interface LeadSource {
  id: string;
  name: string;
  source_type: string;
  is_active: boolean;
}

export function LeadManagement() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [assignmentRules, setAssignmentRules] = useState<LeadAssignmentRule[]>([]);
  const [leadSources, setLeadSources] = useState<LeadSource[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [isManualLeadOpen, setIsManualLeadOpen] = useState(false);
  const [isAssignmentRulesOpen, setIsAssignmentRulesOpen] = useState(false);
  const [isSyncingLeads, setIsSyncingLeads] = useState(false);

  const [newLead, setNewLead] = useState({
    title: "",
    description: "",
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    customer_company: "",
    value: 0,
    probability: 50,
    expected_close_date: "",
    source: "manual"
  });

  const [newRule, setNewRule] = useState({
    name: "",
    assigned_to: "",
    priority: 1,
    conditions: {
      source: "",
      value_min: 0,
      value_max: 0
    }
  });

  useEffect(() => {
    fetchLeads();
    fetchAssignmentRules();
    fetchLeadSources();
    fetchEmployees();
  }, [profile?.branch_id]);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          customers (name, company, email, phone),
          profiles (full_name),
          lead_sources (name, source_type)
        `)
        .eq('branch_id', profile?.branch_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast({
        title: "Error",
        description: "Failed to fetch leads",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignmentRules = async () => {
    try {
      const { data, error } = await supabase
        .from('lead_assignment_rules')
        .select('*')
        .eq('branch_id', profile?.branch_id)
        .order('priority', { ascending: true });

      if (error) throw error;
      
      // Get employee names separately
      const rulesWithNames = await Promise.all(
        (data || []).map(async (rule) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', rule.assigned_to)
            .single();
          
          return {
            ...rule,
            profiles: profile
          };
        })
      );
      
      setAssignmentRules(rulesWithNames);
    } catch (error) {
      console.error('Error fetching assignment rules:', error);
    }
  };

  const fetchLeadSources = async () => {
    try {
      const { data, error } = await supabase
        .from('lead_sources')
        .select('*')
        .eq('branch_id', profile?.branch_id)
        .order('name', { ascending: true });

      if (error) throw error;
      setLeadSources(data || []);
    } catch (error) {
      console.error('Error fetching lead sources:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('branch_id', profile?.branch_id)
        .eq('is_active', true)
        .in('role', ['admin', 'manager', 'executive']);

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleManualLeadSubmit = async () => {
    try {
      if (!newLead.title || !newLead.customer_name) {
        toast({
          title: "Error",
          description: "Please fill in required fields",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);

      // Create customer first if needed
      let customerId = null;
      if (newLead.customer_email) {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('email', newLead.customer_email)
          .eq('branch_id', profile?.branch_id)
          .maybeSingle();

        if (!existingCustomer) {
          const { data: newCustomer, error: customerError } = await supabase
            .from('customers')
            .insert({
              name: newLead.customer_name,
              company: newLead.customer_company,
              email: newLead.customer_email,
              phone: newLead.customer_phone,
              branch_id: profile?.branch_id
            })
            .select('id')
            .single();

          if (customerError) throw customerError;
          customerId = newCustomer.id;
        } else {
          customerId = existingCustomer.id;
        }
      }

      // Generate lead number
      const { count } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('branch_id', profile?.branch_id);

      const leadNumber = `LD${String((count || 0) + 1).padStart(3, '0')}`;

      // Find manual lead source
      const manualSource = leadSources.find(s => s.source_type === 'manual');

      // Create lead
      const { error: leadError } = await supabase
        .from('leads')
        .insert({
          lead_no: leadNumber,
          title: newLead.title,
          description: newLead.description,
          source: 'Manual',
          status: 'new',
          value: newLead.value || null,
          probability: newLead.probability,
          expected_close_date: newLead.expected_close_date || null,
          customer_id: customerId,
          branch_id: profile?.branch_id,
          lead_source_id: manualSource?.id || null
        });

      if (leadError) throw leadError;

      toast({
        title: "Success",
        description: "Lead created successfully",
      });

      setIsManualLeadOpen(false);
      setNewLead({
        title: "",
        description: "",
        customer_name: "",
        customer_email: "",
        customer_phone: "",
        customer_company: "",
        value: 0,
        probability: 50,
        expected_close_date: "",
        source: "manual"
      });

      fetchLeads();
    } catch (error: any) {
      console.error('Error creating lead:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create lead",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncIndiaMART = async () => {
    try {
      setIsSyncingLeads(true);

      const { data, error } = await supabase.functions.invoke('indiamart-sync', {
        body: {}
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `IndiaMART sync completed. ${data?.new || 0} new leads captured.`,
      });

      fetchLeads();
    } catch (error: any) {
      console.error('Error syncing IndiaMART:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to sync IndiaMART leads",
        variant: "destructive",
      });
    } finally {
      setIsSyncingLeads(false);
    }
  };

  const handleSyncTradeIndia = async () => {
    try {
      setIsSyncingLeads(true);
      const { data, error } = await supabase.functions.invoke('tradeindia-sync', { body: {} });
      if (error) throw error;
      toast({ title: 'Success', description: `TradeIndia sync completed. ${data?.new || 0} new leads.` });
      fetchLeads();
    } catch (error: any) {
      console.error('Error syncing TradeIndia:', error);
      toast({ title: 'Error', description: error.message || 'Failed to sync TradeIndia leads', variant: 'destructive' });
    } finally {
      setIsSyncingLeads(false);
    }
  };

  const handleAddAssignmentRule = async () => {
    try {
      if (!newRule.name || !newRule.assigned_to) {
        toast({
          title: "Error",
          description: "Please fill in required fields",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('lead_assignment_rules')
        .insert({
          name: newRule.name,
          branch_id: profile?.branch_id,
          conditions: newRule.conditions,
          assigned_to: newRule.assigned_to,
          priority: newRule.priority,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Assignment rule created successfully",
      });

      setNewRule({
        name: "",
        assigned_to: "",
        priority: 1,
        conditions: {
          source: "",
          value_min: 0,
          value_max: 0
        }
      });

      fetchAssignmentRules();
    } catch (error: any) {
      console.error('Error creating assignment rule:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create assignment rule",
        variant: "destructive",
      });
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.lead_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (lead.customers?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesSource = sourceFilter === 'all' || lead.lead_sources?.source_type === sourceFilter;
    return matchesSearch && matchesStatus && matchesSource;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'qualified': return 'bg-green-100 text-green-800';
      case 'proposal': return 'bg-yellow-100 text-yellow-800';
      case 'won': return 'bg-emerald-100 text-emerald-800';
      case 'lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && leads.length === 0) {
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
            <Target className="h-6 w-6" />
            Lead Management
          </h2>
          <p className="text-muted-foreground">
            Manage leads from multiple sources with automated assignment
          </p>
        </div>

        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleSyncIndiaMART}
            disabled={isSyncingLeads}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncingLeads ? 'animate-spin' : ''}`} />
            Sync IndiaMART
          </Button>

          <Button
            variant="outline"
            onClick={handleSyncTradeIndia}
            disabled={isSyncingLeads}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncingLeads ? 'animate-spin' : ''}`} />
            Sync TradeIndia
          </Button>

          <Dialog open={isAssignmentRulesOpen} onOpenChange={setIsAssignmentRulesOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Assignment Rules
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Lead Assignment Rules</DialogTitle>
                <DialogDescription>
                  Configure automatic lead assignment based on conditions
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Add New Rule</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Rule Name</Label>
                        <Input
                          value={newRule.name}
                          onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                          placeholder="Enter rule name"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Assign To</Label>
                        <Select value={newRule.assigned_to} onValueChange={(value) => setNewRule({ ...newRule, assigned_to: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map((emp) => (
                              <SelectItem key={emp.id} value={emp.id}>
                                {emp.full_name} ({emp.role})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Priority</Label>
                        <Input
                          type="number"
                          value={newRule.priority}
                          onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) })}
                          placeholder="Priority (1 = highest)"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Source Filter</Label>
                        <Select 
                          value={newRule.conditions.source} 
                          onValueChange={(value) => setNewRule({ 
                            ...newRule, 
                            conditions: { ...newRule.conditions, source: value }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Filter by source" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Any Source</SelectItem>
                            <SelectItem value="indiamart">IndiaMART</SelectItem>
                            <SelectItem value="tradeindia">TradeIndia</SelectItem>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            <SelectItem value="website">Website</SelectItem>
                            <SelectItem value="manual">Manual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Min Value</Label>
                        <Input
                          type="number"
                          value={newRule.conditions.value_min}
                          onChange={(e) => setNewRule({ 
                            ...newRule, 
                            conditions: { ...newRule.conditions, value_min: parseFloat(e.target.value) || 0 }
                          })}
                          placeholder="Minimum lead value"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Max Value</Label>
                        <Input
                          type="number"
                          value={newRule.conditions.value_max}
                          onChange={(e) => setNewRule({ 
                            ...newRule, 
                            conditions: { ...newRule.conditions, value_max: parseFloat(e.target.value) || 0 }
                          })}
                          placeholder="Maximum lead value (0 = no limit)"
                        />
                      </div>
                    </div>

                    <Button onClick={handleAddAssignmentRule} className="mt-4">
                      Add Rule
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Current Rules</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Priority</TableHead>
                          <TableHead>Rule Name</TableHead>
                          <TableHead>Assigned To</TableHead>
                          <TableHead>Conditions</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assignmentRules.map((rule) => (
                          <TableRow key={rule.id}>
                            <TableCell>{rule.priority}</TableCell>
                            <TableCell>{rule.name}</TableCell>
                            <TableCell>{rule.profiles?.full_name}</TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {rule.conditions.source && <div>Source: {rule.conditions.source}</div>}
                                {rule.conditions.value_min > 0 && <div>Min: ₹{rule.conditions.value_min}</div>}
                                {rule.conditions.value_max > 0 && <div>Max: ₹{rule.conditions.value_max}</div>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                                {rule.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isManualLeadOpen} onOpenChange={setIsManualLeadOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Manual Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Manual Lead</DialogTitle>
                <DialogDescription>
                  Create a new lead manually
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Lead Title *</Label>
                  <Input
                    value={newLead.title}
                    onChange={(e) => setNewLead({ ...newLead, title: e.target.value })}
                    placeholder="Enter lead title"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Customer Name *</Label>
                  <Input
                    value={newLead.customer_name}
                    onChange={(e) => setNewLead({ ...newLead, customer_name: e.target.value })}
                    placeholder="Enter customer name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Customer Email</Label>
                  <Input
                    type="email"
                    value={newLead.customer_email}
                    onChange={(e) => setNewLead({ ...newLead, customer_email: e.target.value })}
                    placeholder="Enter customer email"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Customer Phone</Label>
                  <Input
                    value={newLead.customer_phone}
                    onChange={(e) => setNewLead({ ...newLead, customer_phone: e.target.value })}
                    placeholder="Enter customer phone"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input
                    value={newLead.customer_company}
                    onChange={(e) => setNewLead({ ...newLead, customer_company: e.target.value })}
                    placeholder="Enter company name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Expected Value</Label>
                  <Input
                    type="number"
                    value={newLead.value}
                    onChange={(e) => setNewLead({ ...newLead, value: parseFloat(e.target.value) || 0 })}
                    placeholder="Enter expected value"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Probability (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={newLead.probability}
                    onChange={(e) => setNewLead({ ...newLead, probability: parseInt(e.target.value) || 0 })}
                    placeholder="Enter probability"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Expected Close Date</Label>
                  <Input
                    type="date"
                    value={newLead.expected_close_date}
                    onChange={(e) => setNewLead({ ...newLead, expected_close_date: e.target.value })}
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newLead.description}
                    onChange={(e) => setNewLead({ ...newLead, description: e.target.value })}
                    placeholder="Enter lead description"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsManualLeadOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleManualLeadSubmit} disabled={loading}>
                  {loading ? "Creating..." : "Create Lead"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Leads</p>
                <p className="text-2xl font-bold">{leads.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <User className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Qualified</p>
                <p className="text-2xl font-bold">{leads.filter(l => l.status === 'qualified').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pipeline Value</p>
                <p className="text-2xl font-bold">
                  ₹{leads.reduce((sum, lead) => sum + (lead.value || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold">
                  {leads.filter(l => new Date(l.created_at).getMonth() === new Date().getMonth()).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="proposal">Proposal</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="indiamart">IndiaMART</SelectItem>
                <SelectItem value="tradeindia">TradeIndia</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Leads ({filteredLeads.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead #</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.lead_no}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{lead.title}</div>
                      {lead.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {lead.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{lead.customers?.name || 'Unknown'}</div>
                      {lead.customers?.company && (
                        <div className="text-sm text-gray-500">{lead.customers.company}</div>
                      )}
                      {lead.customers?.email && (
                        <div className="text-sm text-gray-500">{lead.customers.email}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">
                        {lead.lead_sources?.name || lead.source}
                      </Badge>
                      {lead.external_id && (
                        <ExternalLink className="h-3 w-3 text-gray-400" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(lead.status)}>
                      {lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {lead.value ? `₹${lead.value.toLocaleString()}` : '-'}
                    {lead.probability && (
                      <div className="text-sm text-gray-500">{lead.probability}%</div>
                    )}
                  </TableCell>
                  <TableCell>
                    {lead.profiles?.full_name || 'Unassigned'}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </div>
                    {lead.expected_close_date && (
                      <div className="text-xs text-gray-500">
                        Close: {new Date(lead.expected_close_date).toLocaleDateString()}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
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