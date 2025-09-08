import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Phone, Mail, Calendar, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface FollowUpManagerProps {
  customerId?: string;
  leadId?: string;
  showTodaysOnly?: boolean;
}

interface FollowUpData {
  id?: string;
  customer_id: string;
  lead_id?: string;
  follow_up_date: string;
  follow_up_time?: string;
  type: string;
  priority: string;
  status: string;
  title: string;
  description: string;
  notes?: string;
  assigned_to: string;
  next_follow_up_date?: string;
}

export function FollowUpManager({ customerId, leadId, showTodaysOnly }: FollowUpManagerProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUpData | null>(null);
  const [activeTab, setActiveTab] = useState("scheduled");

  const [followUpData, setFollowUpData] = useState<FollowUpData>({
    customer_id: customerId || "",
    lead_id: leadId || "",
    follow_up_date: new Date().toISOString().split('T')[0],
    follow_up_time: "",
    type: "call",
    priority: "medium",
    status: "scheduled",
    title: "",
    description: "",
    notes: "",
    assigned_to: profile?.id || "",
    next_follow_up_date: ""
  });

  useEffect(() => {
    if (profile?.branch_id) {
      fetchFollowUps();
      fetchCustomers();
      fetchLeads();
      fetchUsers();
      
      // Set up real-time subscription for follow-ups
      const channel = supabase
        .channel('follow-ups-manager-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'follow_ups'
          },
          () => {
            fetchFollowUps();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile?.branch_id]);

  const fetchFollowUps = async () => {
    try {
      let query = supabase
        .from('follow_ups')
        .select(`
          *,
          customers (name, company),
          leads (title, lead_no),
          profiles!follow_ups_assigned_to_fkey (full_name)
        `)
        .order('follow_up_date', { ascending: false });

      // Role-based access control
      if (profile?.role === 'admin') {
        // Admin sees all follow-ups across branches
      } else if (['sales_manager', 'manager'].includes(profile?.role) && profile?.department === 'Sales') {
        // Sales managers see all follow-ups in their branch
        query = query.eq('branch_id', profile?.branch_id);
      } else {
        // BDO, FBDO and other roles see only their assigned follow-ups
        query = query.eq('assigned_to', profile?.id);
      }

      // Apply filters based on props
      if (customerId) {
        query = query.eq('customer_id', customerId);
      }
      if (leadId) {
        query = query.eq('lead_id', leadId);
      }
      if (showTodaysOnly) {
        const today = new Date().toISOString().split('T')[0];
        query = query.eq('follow_up_date', today);
      }

      const { data, error } = await query;
      if (error) throw error;
      setFollowUps(data || []);
    } catch (error) {
      console.error('Error fetching follow-ups:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, company')
        .eq('branch_id', profile?.branch_id)
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id, title, lead_no')
        .eq('branch_id', profile?.branch_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('branch_id', profile?.branch_id)
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSaveFollowUp = async () => {
    try {
      if (!followUpData.customer_id || !followUpData.title || !followUpData.assigned_to) {
        toast({
          title: "Error",
          description: "Please fill all required fields",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);

      const followUpPayload = {
        ...followUpData,
        branch_id: profile?.branch_id,
        created_by: profile?.id
      };

      if (editingFollowUp?.id) {
        // Update existing follow-up
        const { error } = await supabase
          .from('follow_ups')
          .update(followUpPayload)
          .eq('id', editingFollowUp.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Follow-up updated successfully",
        });
      } else {
        // Create new follow-up
        const { error } = await supabase
          .from('follow_ups')
          .insert(followUpPayload);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Follow-up scheduled successfully",
        });
      }

      setIsDialogOpen(false);
      setEditingFollowUp(null);
      resetForm();
      fetchFollowUps();
    } catch (error) {
      console.error('Error saving follow-up:', error);
      toast({
        title: "Error",
        description: "Failed to save follow-up",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsCompleted = async (followUpId: string, notes?: string) => {
    try {
      const { error } = await supabase
        .from('follow_ups')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          notes: notes || ""
        })
        .eq('id', followUpId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Follow-up marked as completed",
      });

      fetchFollowUps();
    } catch (error) {
      console.error('Error completing follow-up:', error);
      toast({
        title: "Error",
        description: "Failed to complete follow-up",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFollowUpData({
      customer_id: customerId || "",
      lead_id: leadId || "",
      follow_up_date: new Date().toISOString().split('T')[0],
      follow_up_time: "",
      type: "call",
      priority: "medium",
      status: "scheduled",
      title: "",
      description: "",
      notes: "",
      assigned_to: profile?.id || "",
      next_follow_up_date: ""
    });
  };

  const handleEdit = (followUp: any) => {
    setEditingFollowUp(followUp);
    setFollowUpData({
      ...followUp,
      follow_up_date: followUp.follow_up_date ? new Date(followUp.follow_up_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      next_follow_up_date: followUp.next_follow_up_date ? new Date(followUp.next_follow_up_date).toISOString().split('T')[0] : ""
    });
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setEditingFollowUp(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'meeting': return <Calendar className="h-4 w-4" />;
      case 'visit': return <Calendar className="h-4 w-4" />;
      default: return <Phone className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelled': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'postponed': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <AlertCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'secondary';
      case 'low': return 'outline';
      default: return 'default';
    }
  };

  const filterFollowUps = (status: string) => {
    if (status === 'scheduled') {
      return followUps.filter(f => f.status === 'scheduled');
    } else if (status === 'completed') {
      return followUps.filter(f => f.status === 'completed');
    } else if (status === 'today') {
      const today = new Date().toISOString().split('T')[0];
      return followUps.filter(f => f.follow_up_date === today && f.status === 'scheduled');
    }
    return followUps;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Follow-up Management</h2>
          <p className="text-muted-foreground">Schedule and track customer interactions</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Follow-up
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingFollowUp ? 'Edit Follow-up' : 'Schedule New Follow-up'}
              </DialogTitle>
              <DialogDescription>
                {editingFollowUp ? 'Update follow-up details' : 'Schedule a new customer interaction'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer_id">Customer *</Label>
                <Select value={followUpData.customer_id} onValueChange={(value) => setFollowUpData({...followUpData, customer_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} {customer.company && `(${customer.company})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="lead_id">Related Lead</Label>
                <Select value={followUpData.lead_id || "none"} onValueChange={(value) => setFollowUpData({...followUpData, lead_id: value === "none" ? undefined : value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select lead (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Lead</SelectItem>
                    {leads.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.lead_no} - {lead.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={followUpData.title}
                  onChange={(e) => setFollowUpData({...followUpData, title: e.target.value})}
                  placeholder="Enter follow-up title"
                />
              </div>

              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={followUpData.type} onValueChange={(value) => setFollowUpData({...followUpData, type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="visit">Visit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="follow_up_date">Date *</Label>
                <Input
                  id="follow_up_date"
                  type="date"
                  value={followUpData.follow_up_date}
                  onChange={(e) => setFollowUpData({...followUpData, follow_up_date: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="follow_up_time">Time</Label>
                <Input
                  id="follow_up_time"
                  type="time"
                  value={followUpData.follow_up_time}
                  onChange={(e) => setFollowUpData({...followUpData, follow_up_time: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={followUpData.priority} onValueChange={(value) => setFollowUpData({...followUpData, priority: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="assigned_to">Assigned To *</Label>
                <Select value={followUpData.assigned_to} onValueChange={(value) => setFollowUpData({...followUpData, assigned_to: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name} ({user.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={followUpData.description}
                  onChange={(e) => setFollowUpData({...followUpData, description: e.target.value})}
                  placeholder="Enter follow-up description"
                  rows={3}
                />
              </div>

              {editingFollowUp && (
                <>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={followUpData.status} onValueChange={(value) => setFollowUpData({...followUpData, status: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="postponed">Postponed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="next_follow_up_date">Next Follow-up Date</Label>
                    <Input
                      id="next_follow_up_date"
                      type="date"
                      value={followUpData.next_follow_up_date}
                      onChange={(e) => setFollowUpData({...followUpData, next_follow_up_date: e.target.value})}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="notes">Notes (What customer said)</Label>
                    <Textarea
                      id="notes"
                      value={followUpData.notes}
                      onChange={(e) => setFollowUpData({...followUpData, notes: e.target.value})}
                      placeholder="Record what customer said during this interaction"
                      rows={4}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveFollowUp} disabled={loading}>
                {loading ? 'Saving...' : (editingFollowUp ? 'Update Follow-up' : 'Schedule Follow-up')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="today">Today's Follow-ups</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        {['today', 'scheduled', 'completed', 'all'].map((tab) => (
          <TabsContent key={tab} value={tab}>
            <Card>
              <CardHeader>
                <CardTitle>
                  {tab === 'today' && 'Today\'s Follow-ups'}
                  {tab === 'scheduled' && 'Scheduled Follow-ups'}
                  {tab === 'completed' && 'Completed Follow-ups'}
                  {tab === 'all' && 'All Follow-ups'}
                </CardTitle>
                <CardDescription>
                  {tab === 'today' && 'Follow-ups scheduled for today'}
                  {tab === 'scheduled' && 'Pending follow-up activities'}
                  {tab === 'completed' && 'Completed customer interactions'}
                  {tab === 'all' && 'Complete follow-up history'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date/Time</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filterFollowUps(tab).map((followUp) => (
                        <TableRow key={followUp.id}>
                          <TableCell>
                            <div>
                              <div>{new Date(followUp.follow_up_date).toLocaleDateString()}</div>
                              {followUp.follow_up_time && (
                                <div className="text-sm text-muted-foreground">
                                  {followUp.follow_up_time}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{followUp.customers?.name}</div>
                              {followUp.customers?.company && (
                                <div className="text-sm text-muted-foreground">
                                  {followUp.customers.company}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{followUp.title}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {getTypeIcon(followUp.type)}
                              <span className="capitalize">{followUp.type}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getPriorityColor(followUp.priority)}>
                              {followUp.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>{followUp.profiles?.full_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(followUp.status)}
                              <span className="capitalize">{followUp.status}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(followUp)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {followUp.status === 'scheduled' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => markAsCompleted(followUp.id)}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filterFollowUps(tab).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center">
                            No follow-ups found for {tab === 'today' ? 'today' : `${tab} status`}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}