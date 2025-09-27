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
import { Search, Plus, FileText } from "lucide-react";

interface Quotation {
  id: string;
  quotation_no: string;
  status: string;
  total_amount: number;
  valid_till?: string;
  created_at: string;
  customers?: {
    name: string;
    company?: string;
  };
  profiles?: {
    full_name: string;
  };
}

interface QuotationsListProps {
  onEdit?: (quotation: Quotation) => void;
  onView?: (quotation: Quotation) => void;
  onRefresh?: () => void;
}

export function QuotationsList({ onEdit, onView, onRefresh }: QuotationsListProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { canDelete, initiateDelete, DeleteDialog } = useAdminDelete({
    onSuccess: () => {
      fetchQuotations();
      if (onRefresh) onRefresh();
    }
  });

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (profile?.branch_id) {
      fetchQuotations();
    }
  }, [profile?.branch_id]);

  const fetchQuotations = async () => {
    try {
      const { data, error } = await supabase
        .from('quotations')
        .select(`
          *,
          customers (name, company),
          profiles (full_name)
        `)
        .eq('branch_id', profile?.branch_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotations(data || []);
    } catch (error) {
      console.error('Error fetching quotations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch quotations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (quotation: Quotation) => {
    initiateDelete({
      table: 'quotations',
      id: quotation.id,
      itemName: quotation.quotation_no,
      title: "Delete Quotation",
      description: `Are you sure you want to delete quotation "${quotation.quotation_no}"? This will also delete all associated quotation items.`,
      dependentRecords: ['Quotation items', 'Related orders (if any)']
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "outline",
      sent: "secondary",
      accepted: "default",
      rejected: "destructive"
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const filteredQuotations = quotations.filter(quotation => {
    const matchesSearch = quotation.quotation_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quotation.customers?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quotation.customers?.company?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || quotation.status === statusFilter;
    return matchesSearch && matchesStatus;
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
              <FileText className="h-5 w-5" />
              Quotations
            </CardTitle>
            <Button onClick={fetchQuotations} variant="outline" size="sm">
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
                  placeholder="Search quotations..."
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
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quotation No.</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Valid Till</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuotations.map((quotation) => (
                <TableRow key={quotation.id}>
                  <TableCell className="font-medium">{quotation.quotation_no}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{quotation.customers?.name}</div>
                      {quotation.customers?.company && (
                        <div className="text-sm text-muted-foreground">{quotation.customers.company}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(quotation.status)}</TableCell>
                  <TableCell>₹{quotation.total_amount?.toFixed(2)}</TableCell>
                  <TableCell>
                    {quotation.valid_till ? new Date(quotation.valid_till).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>{quotation.profiles?.full_name}</TableCell>
                  <TableCell>{new Date(quotation.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <ActionButtons
                      onView={() => onView?.(quotation)}
                      onEdit={() => onEdit?.(quotation)}
                      onDelete={canDelete ? () => handleDelete(quotation) : undefined}
                      showDelete={canDelete}
                      size="sm"
                      variant="outline"
                    />
                  </TableCell>
                </TableRow>
              ))}
              {filteredQuotations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                    No quotations found
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