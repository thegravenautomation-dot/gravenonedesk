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
import { Search, Package, DollarSign } from "lucide-react";

interface Order {
  id: string;
  order_no: string;
  status: string;
  total_amount: number;
  order_date: string;
  delivery_date?: string;
  created_at: string;
  customers?: {
    name: string;
    company?: string;
  };
  profiles?: {
    full_name: string;
  };
}

interface OrdersListProps {
  onEdit?: (order: Order) => void;
  onView?: (order: Order) => void;
  onRefresh?: () => void;
}

export function OrdersList({ onEdit, onView, onRefresh }: OrdersListProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { canDelete, initiateDelete, DeleteDialog } = useAdminDelete({
    onSuccess: () => {
      fetchOrders();
      if (onRefresh) onRefresh();
    }
  });

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (profile?.branch_id) {
      fetchOrders();
    }
  }, [profile?.branch_id]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_no,
          status,
          total_amount,
          order_date,
          delivery_date,
          created_at,
          customers!inner (name, company)
        `)
        .eq('branch_id', profile?.branch_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (order: Order) => {
    initiateDelete({
      table: 'orders',
      id: order.id,
      itemName: order.order_no,
      title: "Delete Order",
      description: `Are you sure you want to delete order "${order.order_no}"? This will also delete all associated order items, payments, and shipments.`,
      dependentRecords: ['Order items', 'Payments', 'Shipments', 'Customer ledger entries']
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      confirmed: "secondary",
      processing: "secondary",
      shipped: "default",
      delivered: "default",
      cancelled: "destructive",
      completed: "default"
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customers?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customers?.company?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
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
              <Package className="h-5 w-5" />
              Orders
            </CardTitle>
            <Button onClick={fetchOrders} variant="outline" size="sm">
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
                  placeholder="Search orders..."
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
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order No.</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.order_no}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{order.customers?.name}</div>
                      {order.customers?.company && (
                        <div className="text-sm text-muted-foreground">{order.customers.company}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    ₹{order.total_amount?.toFixed(2)}
                  </TableCell>
                  <TableCell>{new Date(order.order_date).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(order.delivery_date).toLocaleDateString()}</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>
                    <ActionButtons
                      onView={() => onView?.(order)}
                      onEdit={() => onEdit?.(order)}
                      onDelete={canDelete ? () => handleDelete(order) : undefined}
                      showDelete={canDelete}
                      size="sm"
                      variant="outline"
                    />
                  </TableCell>
                </TableRow>
              ))}
              {filteredOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                    No orders found
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