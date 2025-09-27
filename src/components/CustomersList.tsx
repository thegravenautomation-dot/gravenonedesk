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
import { Search, Users, Building, MapPin } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  gstin?: string;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

interface CustomersListProps {
  onEdit?: (customer: Customer) => void;
  onView?: (customer: Customer) => void;
  onRefresh?: () => void;
}

export function CustomersList({ onEdit, onView, onRefresh }: CustomersListProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { canDelete, initiateDelete, DeleteDialog } = useAdminDelete({
    onSuccess: () => {
      fetchCustomers();
      if (onRefresh) onRefresh();
    }
  });

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [stateFilter, setStateFilter] = useState("all");

  useEffect(() => {
    if (profile?.branch_id) {
      fetchCustomers();
    }
  }, [profile?.branch_id]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          profiles (full_name)
        `)
        .eq('branch_id', profile?.branch_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch customers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (customer: Customer) => {
    initiateDelete({
      table: 'customers',
      id: customer.id,
      itemName: customer.name,
      title: "Delete Customer",
      description: `Are you sure you want to delete customer "${customer.name}"${customer.company ? ` from ${customer.company}` : ''}? This will also delete all associated leads, quotations, orders, and payments.`,
      dependentRecords: ['Leads', 'Quotations', 'Orders', 'Invoices', 'Payments', 'Customer ledger entries', 'Follow-ups']
    });
  };

  const states = [...new Set(customers.map(customer => customer.state).filter(Boolean))];

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesState = stateFilter === 'all' || customer.state === stateFilter;
    return matchesSearch && matchesState;
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
              <Users className="h-5 w-5" />
              Customers
            </CardTitle>
            <Button onClick={fetchCustomers} variant="outline" size="sm">
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
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {states.map((state) => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>GSTIN</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>
                    {customer.company ? (
                      <div className="flex items-center gap-1">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        {customer.company}
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <div>
                      {customer.email && (
                        <div className="text-sm">{customer.email}</div>
                      )}
                      {customer.phone && (
                        <div className="text-sm text-muted-foreground">{customer.phone}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {customer.city || customer.state ? (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div className="text-sm">
                          {[customer.city, customer.state].filter(Boolean).join(', ')}
                        </div>
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {customer.gstin ? (
                      <Badge variant="secondary" className="text-xs">
                        {customer.gstin}
                      </Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell>{customer.profiles?.full_name}</TableCell>
                  <TableCell>{new Date(customer.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <ActionButtons
                      onView={() => onView?.(customer)}
                      onEdit={() => onEdit?.(customer)}
                      onDelete={canDelete ? () => handleDelete(customer) : undefined}
                      showDelete={canDelete}
                      size="sm"
                      variant="outline"
                    />
                  </TableCell>
                </TableRow>
              ))}
              {filteredCustomers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                    No customers found
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