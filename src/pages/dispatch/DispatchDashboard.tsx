import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ShipmentManager } from "@/components/ShipmentManager";
import { ShippingLabelGenerator } from "@/components/ShippingLabelGenerator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Package, Search, MoreHorizontal, Plane, Clock, CheckCircle, Eye, Bell, DollarSign } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function DispatchDashboard() {
  const { profile } = useAuth();
  const [shipments, setShipments] = useState<any[]>([]);
  const [paidOrders, setPaidOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (profile?.branch_id) {
      fetchShipments();
      fetchPaidOrders();
    }
  }, [profile?.branch_id]);

  const fetchPaidOrders = async () => {
    try {
      // First get orders that are confirmed/processing 
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id, order_no, total_amount, created_at,
          customers (name, company, phone, city, address)
        `)
        .eq('branch_id', profile?.branch_id)
        .in('status', ['confirmed', 'processing'])
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Check which orders are fully paid
      const fullyPaidOrders = [];
      for (const order of orders || []) {
        const { data: isFullyPaid, error: checkError } = await supabase
          .rpc('is_order_fully_paid', { p_order_id: order.id });
        
        if (!checkError && isFullyPaid) {
          fullyPaidOrders.push(order);
        }
      }

      setPaidOrders(fullyPaidOrders.slice(0, 5));
    } catch (error: any) {
      console.error('Error fetching paid orders:', error);
    }
  };

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          id, order_id, awb_number, courier_provider, shipment_status,
          booking_date, expected_delivery_date, actual_delivery_date,
          tracking_url, weight_kg, cod_amount, created_at,
          orders (order_no, customers (name, city))
        `)
        .eq('branch_id', profile?.branch_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShipments(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch shipments: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateShipmentStatus = async (shipmentId: string, newStatus: 'pending' | 'booked' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'returned' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('shipments')
        .update({ 
          shipment_status: newStatus,
          actual_delivery_date: newStatus === 'delivered' ? new Date().toISOString().split('T')[0] : null
        })
        .eq('id', shipmentId);

      if (error) throw error;
      
      fetchShipments();
      toast.success("Shipment status updated successfully");
    } catch (error: any) {
      toast.error('Failed to update status: ' + error.message);
    }
  };

  const filteredShipments = shipments.filter(shipment => {
    const matchesSearch = 
      shipment.orders?.order_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.orders?.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.awb_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || shipment.shipment_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    totalShipments: shipments.length,
    pendingShipments: shipments.filter(s => s.shipment_status === 'pending').length,
    inTransitShipments: shipments.filter(s => ['booked', 'in_transit'].includes(s.shipment_status)).length,
    deliveredToday: shipments.filter(s => s.shipment_status === 'delivered' && s.actual_delivery_date === new Date().toISOString().split('T')[0]).length
  };

  return (
    <DashboardLayout title="Dispatch Dashboard" subtitle="Manage shipments with AWB tracking">
      <div className="space-y-6">
        {/* Paid Orders Ready for Dispatch */}
        {paidOrders.length > 0 && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <Bell className="h-5 w-5" />
                Orders Ready for Dispatch
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {paidOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="font-medium text-sm">
                          {order.order_no} - {order.customers?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ₹{order.total_amount?.toLocaleString()} | {order.customers?.city}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                      Fully Paid
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Shipments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                <span className="text-2xl font-bold">{stats.totalShipments}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <span className="text-2xl font-bold">{stats.pendingShipments}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Plane className="h-5 w-5 text-blue-600" />
                <span className="text-2xl font-bold">{stats.inTransitShipments}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Delivered Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-2xl font-bold">{stats.deliveredToday}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders, customers, or AWB..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_transit">In Transit</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ShipmentManager onShipmentCreated={() => fetchShipments()} />

        <Card>
          <CardHeader>
            <CardTitle>Active Shipments</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading shipments...</div>
            ) : filteredShipments.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p>No shipments found. Create your first shipment to get started.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order No</TableHead>
                    <TableHead>AWB Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredShipments.map((shipment) => (
                    <TableRow key={shipment.id}>
                      <TableCell>{shipment.orders?.order_no}</TableCell>
                      <TableCell>{shipment.awb_number || 'Not Assigned'}</TableCell>
                      <TableCell>{shipment.orders?.customers?.name}</TableCell>
                      <TableCell>
                        <Badge>{shipment.shipment_status}</Badge>
                      </TableCell>
                      <TableCell className="flex gap-2">
                        <ShippingLabelGenerator shipmentId={shipment.id} />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => updateShipmentStatus(shipment.id, 'booked')}>
                              Mark Booked
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateShipmentStatus(shipment.id, 'delivered')}>
                              Mark Delivered
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}