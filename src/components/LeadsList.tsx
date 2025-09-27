import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminDelete } from "@/hooks/useAdminDelete";
import { supabase } from "@/integrations/supabase/client";
import { ActionButtons } from "@/components/common/ActionButtons";
import { Search, Target, DollarSign, User } from "lucide-react";

interface Lead {
  id: string;
  lead_no: string;
  title: string;
  status: string;
  value?: number;
  probability?: number;
  source?: string;
  city?: string;
  state?: string;
  created_at: string;
  customers?: {
    name: string;
    company?: string;
  };
  profiles?: {
    full_name: string;
  };
}

interface LeadsListProps {
  onEdit?: (lead: Lead) => void;
  onView?: (lead: Lead) => void;
  onRefresh?: () => void;
}

export function LeadsList({ onEdit, onView, onRefresh }: LeadsListProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { canDelete, initiateDelete, DeleteDialog } = useAdminDelete({
    onSuccess: () => {
      fetchLeads();
      if (onRefresh) onRefresh();
    }
  });

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  useEffect(() => {
    if (profile?.branch_id) {
      fetchLeads();
    }
  }, [profile?.branch_id]);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          id,
          lead_no,
          title,
          status,
          value,
          probability,
          source,
          city,
          state,
          created_at,
          customers (name, company)
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

  const handleDelete = (lead: Lead) => {
    initiateDelete({
      table: 'leads',
      id: lead.id,
      itemName: `${lead.lead_no} - ${lead.title}`,
      title: "Delete Lead",
      description: `Are you sure you want to delete lead "${lead.lead_no}"? This will also delete all associated follow-ups and quotations.`,
      dependentRecords: ['Follow-ups', 'Quotations', 'Customer assignments']
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      new: "outline",
      contacted: "secondary",
      qualified: "secondary",
      converted: "default",
      rejected: "destructive",
      lost: "destructive"
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const sources = [...new Set(leads.map(lead => lead.source).filter(Boolean))];

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.lead_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.customers?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.customers?.company?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter;
    return matchesSearch && matchesStatus && matchesSource;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Leads
            </CardTitle>
            <Button onClick={fetchLeads} variant="outline" size="sm">
              <Search className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {sources.map((source) => (
                  <SelectItem key={source} value={source}>{source}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead No.</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.lead_no}</TableCell>
                  <TableCell className="font-medium">{lead.title}</TableCell>
                  <TableCell>
                    {lead.customers ? (
                      <div>
                        <div className="font-medium">{lead.customers.name}</div>
                        {lead.customers.company && (
                          <div className="text-sm text-muted-foreground">{lead.customers.company}</div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span className="text-sm">No customer</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(lead.status)}</TableCell>
                  <TableCell>
                    {lead.value ? (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        ₹{lead.value.toFixed(2)}
                        {lead.probability && (
                          <Badge variant="outline" className="ml-1 text-xs">
                            {lead.probability}%
                          </Badge>
                        )}
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {lead.source ? (
                      <Badge variant="secondary" className="text-xs">
                        {lead.source}
                      </Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {lead.city || lead.state ? (
                      <div className="text-sm">
                        {[lead.city, lead.state].filter(Boolean).join(', ')}
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell>{new Date(lead.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <ActionButtons
                      onView={() => onView?.(lead)}
                      onEdit={() => onEdit?.(lead)}
                      onDelete={canDelete ? () => handleDelete(lead) : undefined}
                      showDelete={canDelete}
                      size="sm"
                      variant="outline"
                    />
                  </TableCell>
                </TableRow>
              ))}
              {filteredLeads.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                    No leads found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <DeleteDialog />
    </>
  );
}