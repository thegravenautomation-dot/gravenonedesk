import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2 } from "lucide-react";
import { logEdit } from "@/lib/auditLogger";

interface OrderItem {
  id?: string;
  sr_no: number;
  item_name: string;
  description: string;
  hsn_code: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_amount: number;
  gst_rate: number;
  gst_amount: number;
}

interface OrderEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string | null;
  onSuccess: () => void;
}

export function OrderEditDialog({
  open,
  onOpenChange,
  orderId,
  onSuccess
}: OrderEditDialogProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [originalData, setOriginalData] = useState<any>(null);

  const [orderData, setOrderData] = useState({
    order_no: "",
    customer_id: "",
    customer_po_no: "",
    delivery_date: "",
    status: "pending" as "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled",
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
  });

  const [items, setItems] = useState<OrderItem[]>([
    {
      sr_no: 1,
      item_name: "",
      description: "",
      hsn_code: "",
      quantity: 1,
      unit: "Nos",
      unit_price: 0,
      total_amount: 0,
      gst_rate: 18,
      gst_amount: 0,
    }
  ]);

  useEffect(() => {
    if (open) {
      fetchCustomers();
      if (orderId) {
        fetchOrderData();
      } else {
        resetForm();
        generateOrderNumber();
      }
    }
  }, [open, orderId]);

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

  const generateOrderNumber = async () => {
    try {
      const { data } = await supabase
        .from('orders')
        .select('order_no')
        .eq('branch_id', profile?.branch_id)
        .order('created_at', { ascending: false })
        .limit(1);

      let nextNumber = 1;
      if (data && data.length > 0) {
        const lastNumber = data[0].order_no.match(/\d+$/);
        if (lastNumber) {
          nextNumber = parseInt(lastNumber[0]) + 1;
        }
      }

      const orderNo = `ORD-${new Date().getFullYear()}-${String(nextNumber).padStart(4, '0')}`;
      setOrderData(prev => ({ ...prev, order_no: orderNo }));
    } catch (error) {
      console.error('Error generating order number:', error);
    }
  };

  const fetchOrderData = async () => {
    if (!orderId) return;

    try {
      setLoading(true);

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      setOriginalData(order);
      setOrderData({
        order_no: order.order_no,
        customer_id: order.customer_id || "",
        customer_po_no: order.customer_po_no || "",
        delivery_date: order.delivery_date || "",
        status: order.status as "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled",
        subtotal: order.subtotal || 0,
        tax_amount: order.tax_amount || 0,
        total_amount: order.total_amount || 0,
      });

      if (order.order_items && order.order_items.length > 0) {
        const orderItems = order.order_items.map((item: any) => ({
          id: item.id,
          sr_no: item.sr_no,
          item_name: item.item_name,
          description: item.description || "",
          hsn_code: item.hsn_code || "",
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          total_amount: item.total_amount,
          gst_rate: item.gst_rate,
          gst_amount: item.gst_amount,
        }));
        setItems(orderItems);
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      toast({
        title: "Error",
        description: "Failed to load order data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setOrderData({
      order_no: "",
      customer_id: "",
      customer_po_no: "",
      delivery_date: "",
      status: "pending",
      subtotal: 0,
      tax_amount: 0,
      total_amount: 0,
    });
    setItems([{
      sr_no: 1,
      item_name: "",
      description: "",
      hsn_code: "",
      quantity: 1,
      unit: "Nos",
      unit_price: 0,
      total_amount: 0,
      gst_rate: 18,
      gst_amount: 0,
    }]);
    setOriginalData(null);
  };

  const addItem = () => {
    const newItem: OrderItem = {
      sr_no: items.length + 1,
      item_name: "",
      description: "",
      hsn_code: "",
      quantity: 1,
      unit: "Nos",
      unit_price: 0,
      total_amount: 0,
      gst_rate: 18,
      gst_amount: 0,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      const renumberedItems = newItems.map((item, i) => ({
        ...item,
        sr_no: i + 1
      }));
      setItems(renumberedItems);
      calculateTotals(renumberedItems);
    }
  };

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'unit_price' || field === 'gst_rate') {
      const item = newItems[index];
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unit_price) || 0;
      const gstRate = Number(item.gst_rate) || 0;
      
      const subtotal = quantity * unitPrice;
      const gstAmount = (subtotal * gstRate) / 100;
      
      newItems[index].total_amount = Math.round(subtotal * 100) / 100;
      newItems[index].gst_amount = Math.round(gstAmount * 100) / 100;
    }
    
    setItems(newItems);
    calculateTotals(newItems);
  };

  const calculateTotals = (itemsList = items) => {
    const subtotal = itemsList.reduce((sum, item) => sum + (Number(item.total_amount) || 0), 0);
    const totalGst = itemsList.reduce((sum, item) => sum + (Number(item.gst_amount) || 0), 0);
    const total = subtotal + totalGst;
    
    setOrderData(prev => ({
      ...prev,
      subtotal: Math.round(subtotal * 100) / 100,
      tax_amount: Math.round(totalGst * 100) / 100,
      total_amount: Math.round(total * 100) / 100
    }));
  };

  const handleSave = async () => {
    try {
      if (!orderData.order_no || !orderData.customer_id || items.some(item => !item.item_name)) {
        toast({
          title: "Error",
          description: "Please fill all required fields",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);

      if (orderId) {
        // Update existing order
        const { error: orderError } = await supabase
          .from('orders')
          .update({
            customer_id: orderData.customer_id,
            customer_po_no: orderData.customer_po_no || null,
            delivery_date: orderData.delivery_date || null,
            status: orderData.status,
            subtotal: orderData.subtotal,
            tax_amount: orderData.tax_amount,
            total_amount: orderData.total_amount,
          })
          .eq('id', orderId);

        if (orderError) throw orderError;

        // Delete existing items and insert new ones
        await supabase
          .from('order_items')
          .delete()
          .eq('order_id', orderId);

        const orderItems = items.map(item => ({
          order_id: orderId,
          sr_no: item.sr_no,
          item_name: item.item_name,
          description: item.description,
          hsn_code: item.hsn_code,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          total_amount: item.total_amount,
          gst_rate: item.gst_rate,
          gst_amount: item.gst_amount,
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) throw itemsError;

        // Log the edit operation
        if (originalData && profile?.id && profile?.branch_id) {
          await logEdit(
            profile.id,
            profile.branch_id,
            'purchase_order',
            orderId,
            originalData,
            { ...orderData, items }
          );
        }

        toast({
          title: "Success",
          description: "Order updated successfully",
        });
      } else {
        // Create new order
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            order_no: orderData.order_no,
            customer_id: orderData.customer_id,
            customer_po_no: orderData.customer_po_no || null,
            branch_id: profile?.branch_id,
            delivery_date: orderData.delivery_date || null,
            status: orderData.status,
            subtotal: orderData.subtotal,
            tax_amount: orderData.tax_amount,
            total_amount: orderData.total_amount,
          })
          .select()
          .single();

        if (orderError) throw orderError;

        const orderItems = items.map(item => ({
          order_id: order.id,
          sr_no: item.sr_no,
          item_name: item.item_name,
          description: item.description,
          hsn_code: item.hsn_code,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          total_amount: item.total_amount,
          gst_rate: item.gst_rate,
          gst_amount: item.gst_amount,
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) throw itemsError;

        toast({
          title: "Success",
          description: "Order created successfully",
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving order:', error);
      toast({
        title: "Error",
        description: "Failed to save order",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {orderId ? 'Edit Order' : 'Create Order'}
          </DialogTitle>
          <DialogDescription>
            {orderId ? 'Update order details and items' : 'Create a new order with items'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Header */}
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="order_no">Order Number</Label>
              <Input
                id="order_no"
                value={orderData.order_no}
                onChange={(e) => setOrderData({...orderData, order_no: e.target.value})}
                disabled={!!orderId}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer">Customer</Label>
              <Select 
                value={orderData.customer_id} 
                onValueChange={(value) => setOrderData({...orderData, customer_id: value})}
              >
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
            <div className="space-y-2">
              <Label htmlFor="customer_po_no">Customer PO No</Label>
              <Input
                id="customer_po_no"
                value={orderData.customer_po_no}
                onChange={(e) => setOrderData({...orderData, customer_po_no: e.target.value})}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery_date">Delivery Date</Label>
              <Input
                id="delivery_date"
                type="date"
                value={orderData.delivery_date}
                onChange={(e) => setOrderData({...orderData, delivery_date: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={orderData.status} 
                onValueChange={(value: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled") => setOrderData({...orderData, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Order Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Order Items</h3>
              <Button onClick={addItem} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Sr. No.</TableHead>
                    <TableHead className="min-w-40">Item Name *</TableHead>
                    <TableHead className="min-w-40">Description</TableHead>
                    <TableHead className="w-24">HSN Code</TableHead>
                    <TableHead className="w-20">Qty</TableHead>
                    <TableHead className="w-20">Unit</TableHead>
                    <TableHead className="w-24">Unit Price</TableHead>
                    <TableHead className="w-20">GST %</TableHead>
                    <TableHead className="w-24">GST Amount</TableHead>
                    <TableHead className="w-24">Total</TableHead>
                    <TableHead className="w-16">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.sr_no}</TableCell>
                      <TableCell>
                        <Input
                          value={item.item_name}
                          onChange={(e) => updateItem(index, 'item_name', e.target.value)}
                          placeholder="Item name"
                          className="min-w-32"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          placeholder="Description"
                          className="min-w-32"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.hsn_code}
                          onChange={(e) => updateItem(index, 'hsn_code', e.target.value)}
                          placeholder="HSN"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                          min="1"
                          step="1"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.unit}
                          onValueChange={(value) => updateItem(index, 'unit', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Nos">Nos</SelectItem>
                            <SelectItem value="Kg">Kg</SelectItem>
                            <SelectItem value="Meter">Meter</SelectItem>
                            <SelectItem value="Liter">Liter</SelectItem>
                            <SelectItem value="Box">Box</SelectItem>
                            <SelectItem value="Set">Set</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))}
                          min="0"
                          step="0.01"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.gst_rate}
                          onChange={(e) => updateItem(index, 'gst_rate', Number(e.target.value))}
                          min="0"
                          max="100"
                          step="0.01"
                        />
                      </TableCell>
                      <TableCell>₹{item.gst_amount.toFixed(2)}</TableCell>
                      <TableCell>₹{(item.total_amount + item.gst_amount).toFixed(2)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-muted p-4 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Subtotal: </span>
                <span>₹{orderData.subtotal.toFixed(2)}</span>
              </div>
              <div>
                <span className="font-medium">Total GST: </span>
                <span>₹{orderData.tax_amount.toFixed(2)}</span>
              </div>
              <div className="text-lg">
                <span className="font-bold">Total Amount: </span>
                <span className="font-bold">₹{orderData.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : orderId ? 'Update Order' : 'Create Order'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}