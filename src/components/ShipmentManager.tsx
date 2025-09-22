import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Truck, Package, FileText, Download, Eye, Upload, MapPin } from "lucide-react";

interface ShipmentManagerProps {
  orderId?: string;
  onShipmentCreated?: (shipmentId: string) => void;
}

interface Shipment {
  id: string;
  order_id: string;
  awb_number?: string;
  awb_file_path?: string;
  courier_provider?: string;
  shipment_status: string;
  booking_date?: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  tracking_url?: string;
  tracking_data?: any;
  weight_kg?: number;
  dimensions?: any;
  shipping_address: any;
  special_instructions?: string;
  delivery_type: string;
  cod_amount?: number;
  created_at: string;
  customer_id: string;
  branch_id: string;
}

interface Order {
  id: string;
  order_no: string;
  customer_id: string;
  total_amount: number;
  status: string;
  customers?: {
    name: string;
    address: string;
    phone: string;
    city: string;
    state: string;
    pincode: string;
  };
}

const courierProviders = [
  { value: 'dtdc', label: 'DTDC' },
  { value: 'shree_maruti', label: 'Shree Maruti' },
  { value: 'bluedart', label: 'Blue Dart' },
  { value: 'delhivery', label: 'Delhivery' },
  { value: 'fedex', label: 'FedEx' },
  { value: 'dhl', label: 'DHL' },
  { value: 'aramex', label: 'Aramex' },
  { value: 'other', label: 'Other' }
];

const statusColors: { [key: string]: string } = {
  pending: "bg-yellow-500",
  booked: "bg-blue-500",
  picked_up: "bg-purple-500",
  in_transit: "bg-orange-500",
  out_for_delivery: "bg-green-500",
  delivered: "bg-emerald-600",
  returned: "bg-red-500",
  cancelled: "bg-gray-500"
};

export function ShipmentManager({ orderId, onShipmentCreated }: ShipmentManagerProps) {
  const { profile } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [awbFile, setAwbFile] = useState<File | null>(null);
  
  const [newShipment, setNewShipment] = useState({
    order_id: orderId || "",
    awb_number: "",
    courier_provider: "",
    booking_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: "",
    weight_kg: "",
    dimensions: { length: "", width: "", height: "" },
    special_instructions: "",
    delivery_type: "standard",
    cod_amount: ""
  });

  useEffect(() => {
    if (profile?.branch_id) {
      fetchOrders();
      fetchShipments();
    }
  }, [profile?.branch_id]);

  useEffect(() => {
    if (orderId && orders.length > 0) {
      const order = orders.find(o => o.id === orderId);
      if (order) {
        setSelectedOrder(order);
        setNewShipment(prev => ({ ...prev, order_id: orderId }));
      }
    }
  }, [orderId, orders]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, order_no, customer_id, total_amount, status,
          customers (name, address, phone, city, state, pincode)
        `)
        .eq('branch_id', profile?.branch_id)
        .in('status', ['confirmed', 'processing'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch orders: ' + error.message);
    }
  };

  const fetchShipments = async () => {
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          id, order_id, awb_number, awb_file_path, courier_provider,
          shipment_status, booking_date, expected_delivery_date, actual_delivery_date,
          tracking_url, tracking_data, weight_kg, dimensions, shipping_address,
          special_instructions, delivery_type, cod_amount, created_at, customer_id, branch_id
        `)
        .eq('branch_id', profile?.branch_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShipments(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch shipments: ' + error.message);
    }
  };

  const handleOrderSelect = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    setSelectedOrder(order || null);
    setNewShipment(prev => ({ 
      ...prev, 
      order_id: orderId,
      cod_amount: order?.total_amount?.toString() || ""
    }));
  };

  const uploadAwbFile = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${profile?.branch_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('awb-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;
      return filePath;
    } catch (error: any) {
      toast.error('Failed to upload AWB file: ' + error.message);
      return null;
    }
  };

  const handleCreateShipment = async () => {
    if (!selectedOrder || !newShipment.courier_provider) {
      toast.error('Please select an order and courier provider');
      return;
    }

    setLoading(true);
    try {
      let awbFilePath = null;
      if (awbFile) {
        awbFilePath = await uploadAwbFile(awbFile);
        if (!awbFilePath) return;
      }

      const shippingAddress = {
        name: selectedOrder.customers?.name,
        address: selectedOrder.customers?.address,
        city: selectedOrder.customers?.city,
        state: selectedOrder.customers?.state,
        pincode: selectedOrder.customers?.pincode,
        phone: selectedOrder.customers?.phone
      };

      const { data, error } = await supabase
        .from('shipments')
        .insert({
          order_id: newShipment.order_id,
          branch_id: profile?.branch_id,
          customer_id: selectedOrder.customer_id,
          awb_number: newShipment.awb_number || null,
          awb_file_path: awbFilePath,
          courier_provider: newShipment.courier_provider as 'dtdc' | 'shree_maruti' | 'bluedart' | 'delhivery' | 'fedex' | 'dhl' | 'aramex' | 'other',
          booking_date: newShipment.booking_date || null,
          expected_delivery_date: newShipment.expected_delivery_date || null,
          weight_kg: parseFloat(newShipment.weight_kg) || null,
          dimensions: newShipment.dimensions,
          shipping_address: shippingAddress,
          special_instructions: newShipment.special_instructions || null,
          delivery_type: newShipment.delivery_type,
          cod_amount: parseFloat(newShipment.cod_amount) || 0,
          created_by: profile?.id
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Shipment created successfully');
      setIsCreateDialogOpen(false);
      fetchShipments();
      onShipmentCreated?.(data.id);
      
      // Reset form
      setNewShipment({
        order_id: "",
        awb_number: "",
        courier_provider: "",
        booking_date: new Date().toISOString().split('T')[0],
        expected_delivery_date: "",
        weight_kg: "",
        dimensions: { length: "", width: "", height: "" },
        special_instructions: "",
        delivery_type: "standard",
        cod_amount: ""
      });
      setAwbFile(null);
      setSelectedOrder(null);
    } catch (error: any) {
      toast.error('Failed to create shipment: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateShipmentStatus = async (shipmentId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('shipments')
        .update({ 
          shipment_status: status as 'pending' | 'booked' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'returned' | 'cancelled',
          actual_delivery_date: status === 'delivered' ? new Date().toISOString().split('T')[0] : null
        })
        .eq('id', shipmentId);

      if (error) throw error;
      
      toast.success('Shipment status updated');
      fetchShipments();
    } catch (error: any) {
      toast.error('Failed to update status: ' + error.message);
    }
  };

  const downloadAwbFile = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('awb-documents')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = filePath.split('/').pop() || 'awb-document';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error('Failed to download AWB: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Package className="h-6 w-6" />
          Shipment Management
        </h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Truck className="h-4 w-4 mr-2" />
              Create Shipment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Shipment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="order">Select Order</Label>
                <Select onValueChange={handleOrderSelect} value={newShipment.order_id}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an order" />
                  </SelectTrigger>
                  <SelectContent>
                    {orders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.order_no} - {order.customers?.name} (₹{order.total_amount})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedOrder && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4" />
                      <span className="font-medium">Shipping Address</span>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>{selectedOrder.customers?.name}</div>
                      <div>{selectedOrder.customers?.address}</div>
                      <div>{selectedOrder.customers?.city}, {selectedOrder.customers?.state} - {selectedOrder.customers?.pincode}</div>
                      <div>Phone: {selectedOrder.customers?.phone}</div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="courier">Courier Provider</Label>
                  <Select onValueChange={(value) => setNewShipment(prev => ({ ...prev, courier_provider: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select courier" />
                    </SelectTrigger>
                    <SelectContent>
                      {courierProviders.map((provider) => (
                        <SelectItem key={provider.value} value={provider.value}>
                          {provider.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="awb">AWB Number</Label>
                  <Input
                    id="awb"
                    value={newShipment.awb_number}
                    onChange={(e) => setNewShipment(prev => ({ ...prev, awb_number: e.target.value }))}
                    placeholder="Enter AWB number"
                  />
                </div>

                <div>
                  <Label htmlFor="booking_date">Booking Date</Label>
                  <Input
                    id="booking_date"
                    type="date"
                    value={newShipment.booking_date}
                    onChange={(e) => setNewShipment(prev => ({ ...prev, booking_date: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="expected_delivery">Expected Delivery</Label>
                  <Input
                    id="expected_delivery"
                    type="date"
                    value={newShipment.expected_delivery_date}
                    onChange={(e) => setNewShipment(prev => ({ ...prev, expected_delivery_date: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={newShipment.weight_kg}
                    onChange={(e) => setNewShipment(prev => ({ ...prev, weight_kg: e.target.value }))}
                    placeholder="0.0"
                  />
                </div>

                <div>
                  <Label htmlFor="cod">COD Amount</Label>
                  <Input
                    id="cod"
                    type="number"
                    step="0.01"
                    value={newShipment.cod_amount}
                    onChange={(e) => setNewShipment(prev => ({ ...prev, cod_amount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="awb_file">Upload AWB Copy (PDF/Image)</Label>
                <Input
                  id="awb_file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setAwbFile(e.target.files?.[0] || null)}
                />
              </div>

              <div>
                <Label htmlFor="instructions">Special Instructions</Label>
                <Textarea
                  id="instructions"
                  value={newShipment.special_instructions}
                  onChange={(e) => setNewShipment(prev => ({ ...prev, special_instructions: e.target.value }))}
                  placeholder="Any special delivery instructions..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateShipment} disabled={loading}>
                  {loading ? 'Creating...' : 'Create Shipment'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {shipments.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Shipments Found</h3>
                <p className="text-muted-foreground">Create your first shipment to get started.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          shipments.map((shipment) => (
            <Card key={shipment.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      AWB: {shipment.awb_number || 'Not Assigned'}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {shipment.courier_provider?.toUpperCase()} • Order ID: {shipment.order_id}
                    </p>
                  </div>
                  <Badge className={`${statusColors[shipment.shipment_status]} text-white`}>
                    {shipment.shipment_status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <span className="font-medium">Booking Date:</span>
                    <p className="text-sm text-muted-foreground">
                      {shipment.booking_date ? new Date(shipment.booking_date).toLocaleDateString() : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Expected Delivery:</span>
                    <p className="text-sm text-muted-foreground">
                      {shipment.expected_delivery_date ? new Date(shipment.expected_delivery_date).toLocaleDateString() : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Weight:</span>
                    <p className="text-sm text-muted-foreground">
                      {shipment.weight_kg ? `${shipment.weight_kg} kg` : 'Not specified'}
                    </p>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="flex flex-wrap gap-2">
                  {shipment.awb_file_path && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => downloadAwbFile(shipment.awb_file_path!)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download AWB
                    </Button>
                  )}
                  
                  {shipment.tracking_url && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      asChild
                    >
                      <a href={shipment.tracking_url} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-4 w-4 mr-2" />
                        Track Package
                      </a>
                    </Button>
                  )}

                  <Select onValueChange={(value) => updateShipmentStatus(shipment.id, value)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Update Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="booked">Booked</SelectItem>
                      <SelectItem value="picked_up">Picked Up</SelectItem>
                      <SelectItem value="in_transit">In Transit</SelectItem>
                      <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="returned">Returned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}