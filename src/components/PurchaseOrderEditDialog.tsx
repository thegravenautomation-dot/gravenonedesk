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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2 } from "lucide-react";
import { logEdit } from "@/lib/auditLogger";

interface PurchaseOrderItem {
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

interface PurchaseOrderEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrderId: string | null;
  onSuccess: () => void;
}

export function PurchaseOrderEditDialog({
  open,
  onOpenChange,
  purchaseOrderId,
  onSuccess
}: PurchaseOrderEditDialogProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  const [originalData, setOriginalData] = useState<any>(null);

  const [poData, setPoData] = useState({
    po_no: "",
    vendor_id: "",
    po_date: new Date().toISOString().split('T')[0],
    delivery_date: "",
    status: "pending",
    currency: "INR",
    supplier_email: "",
    supplier_contact: "",
    terms_conditions: "",
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
  });

  const [items, setItems] = useState<PurchaseOrderItem[]>([
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
      fetchVendors();
      if (purchaseOrderId) {
        fetchPurchaseOrderData();
      } else {
        resetForm();
        generatePONumber();
      }
    }
  }, [open, purchaseOrderId]);

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, name, contact_person, email, phone')
        .eq('branch_id', profile?.branch_id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setVendors(data || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const generatePONumber = async () => {
    try {
      const { data } = await supabase
        .from('purchase_orders')
        .select('po_no')
        .eq('branch_id', profile?.branch_id)
        .order('created_at', { ascending: false })
        .limit(1);

      let nextNumber = 1;
      if (data && data.length > 0) {
        const lastNumber = data[0].po_no.match(/\d+$/);
        if (lastNumber) {
          nextNumber = parseInt(lastNumber[0]) + 1;
        }
      }

      const poNo = `PO-${new Date().getFullYear()}-${String(nextNumber).padStart(4, '0')}`;
      setPoData(prev => ({ ...prev, po_no: poNo }));
    } catch (error) {
      console.error('Error generating PO number:', error);
    }
  };

  const fetchPurchaseOrderData = async () => {
    if (!purchaseOrderId) return;

    try {
      setLoading(true);

      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          purchase_order_items (*)
        `)
        .eq('id', purchaseOrderId)
        .single();

      if (poError) throw poError;

      setOriginalData(po);
      setPoData({
        po_no: po.po_no,
        vendor_id: po.vendor_id || "",
        po_date: po.po_date,
        delivery_date: po.delivery_date || "",
        status: po.status || "pending",
        currency: po.currency || "INR",
        supplier_email: po.supplier_email || "",
        supplier_contact: po.supplier_contact || "",
        terms_conditions: po.terms_conditions || "",
        subtotal: po.subtotal || 0,
        tax_amount: po.tax_amount || 0,
        total_amount: po.total_amount || 0,
      });

      if (po.purchase_order_items && po.purchase_order_items.length > 0) {
        const poItems = po.purchase_order_items.map((item: any) => ({
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
        setItems(poItems);
      }
    } catch (error) {
      console.error('Error fetching purchase order:', error);
      toast({
        title: "Error",
        description: "Failed to load purchase order data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPoData({
      po_no: "",
      vendor_id: "",
      po_date: new Date().toISOString().split('T')[0],
      delivery_date: "",
      status: "pending",
      currency: "INR",
      supplier_email: "",
      supplier_contact: "",
      terms_conditions: "",
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
    const newItem: PurchaseOrderItem = {
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

  const updateItem = (index: number, field: keyof PurchaseOrderItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'unit_price' || field === 'gst_rate') {
      const item = newItems[index];
      const subtotal = item.quantity * item.unit_price;
      const gstAmount = (subtotal * item.gst_rate) / 100;
      newItems[index].total_amount = subtotal;
      newItems[index].gst_amount = gstAmount;
    }
    
    setItems(newItems);
    calculateTotals(newItems);
  };

  const calculateTotals = (itemsList = items) => {
    const subtotal = itemsList.reduce((sum, item) => sum + item.total_amount, 0);
    const totalGst = itemsList.reduce((sum, item) => sum + item.gst_amount, 0);
    const total = subtotal + totalGst;
    
    setPoData(prev => ({
      ...prev,
      subtotal,
      tax_amount: totalGst,
      total_amount: total
    }));
  };

  const handleSave = async () => {
    try {
      if (!poData.po_no || !poData.vendor_id || items.some(item => !item.item_name)) {
        toast({
          title: "Error",
          description: "Please fill all required fields",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);

      if (purchaseOrderId) {
        // Update existing purchase order
        const { error: poError } = await supabase
          .from('purchase_orders')
          .update({
            vendor_id: poData.vendor_id,
            po_date: poData.po_date,
            delivery_date: poData.delivery_date || null,
            status: poData.status,
            currency: poData.currency,
            supplier_email: poData.supplier_email,
            supplier_contact: poData.supplier_contact,
            terms_conditions: poData.terms_conditions,
            subtotal: poData.subtotal,
            tax_amount: poData.tax_amount,
            total_amount: poData.total_amount,
          })
          .eq('id', purchaseOrderId);

        if (poError) throw poError;

        // Delete existing items and insert new ones
        await supabase
          .from('purchase_order_items')
          .delete()
          .eq('purchase_order_id', purchaseOrderId);

        const poItems = items.map(item => ({
          purchase_order_id: purchaseOrderId,
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
          .from('purchase_order_items')
          .insert(poItems);

        if (itemsError) throw itemsError;

        // Log the edit operation
        if (originalData && profile?.id && profile?.branch_id) {
          await logEdit(
            profile.id,
            profile.branch_id,
            'purchase_order',
            purchaseOrderId,
            originalData,
            { ...poData, items }
          );
        }

        toast({
          title: "Success",
          description: "Purchase order updated successfully",
        });
      } else {
        // Create new purchase order
        const { data: po, error: poError } = await supabase
          .from('purchase_orders')
          .insert({
            po_no: poData.po_no,
            vendor_id: poData.vendor_id,
            branch_id: profile?.branch_id,
            po_date: poData.po_date,
            delivery_date: poData.delivery_date || null,
            status: poData.status,
            currency: poData.currency,
            supplier_email: poData.supplier_email,
            supplier_contact: poData.supplier_contact,
            terms_conditions: poData.terms_conditions,
            subtotal: poData.subtotal,
            tax_amount: poData.tax_amount,
            total_amount: poData.total_amount,
            created_by: profile?.id
          })
          .select()
          .single();

        if (poError) throw poError;

        const poItems = items.map(item => ({
          purchase_order_id: po.id,
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
          .from('purchase_order_items')
          .insert(poItems);

        if (itemsError) throw itemsError;

        toast({
          title: "Success",
          description: "Purchase order created successfully",
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving purchase order:', error);
      toast({
        title: "Error",
        description: "Failed to save purchase order",
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
            {purchaseOrderId ? 'Edit Purchase Order' : 'Create Purchase Order'}
          </DialogTitle>
          <DialogDescription>
            {purchaseOrderId ? 'Update purchase order details and items' : 'Create a new purchase order with items'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* PO Header */}
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="po_no">PO Number</Label>
              <Input
                id="po_no"
                value={poData.po_no}
                onChange={(e) => setPoData({...poData, po_no: e.target.value})}
                disabled={!!purchaseOrderId}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor</Label>
              <Select 
                value={poData.vendor_id} 
                onValueChange={(value) => setPoData({...poData, vendor_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name} {vendor.contact_person && `(${vendor.contact_person})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="po_date">PO Date</Label>
              <Input
                id="po_date"
                type="date"
                value={poData.po_date}
                onChange={(e) => setPoData({...poData, po_date: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery_date">Delivery Date</Label>
              <Input
                id="delivery_date"
                type="date"
                value={poData.delivery_date}
                onChange={(e) => setPoData({...poData, delivery_date: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={poData.status} 
                onValueChange={(value) => setPoData({...poData, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select 
                value={poData.currency} 
                onValueChange={(value) => setPoData({...poData, currency: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">INR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Purchase Order Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Purchase Order Items</h3>
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
                    <TableHead className="w-16">Action</TableHead>
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
                          placeholder="Enter item name"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          placeholder="Description"
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
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
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
                            <SelectItem value="Ltr">Ltr</SelectItem>
                            <SelectItem value="Mtr">Mtr</SelectItem>
                            <SelectItem value="Pcs">Pcs</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.gst_rate}
                          onChange={(e) => updateItem(index, 'gst_rate', parseFloat(e.target.value) || 0)}
                          min="0"
                          max="100"
                          step="0.01"
                        />
                      </TableCell>
                      <TableCell>₹{item.gst_amount.toFixed(2)}</TableCell>
                      <TableCell>₹{(item.total_amount + item.gst_amount).toFixed(2)}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
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

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-80 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{poData.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST:</span>
                <span>₹{poData.tax_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>₹{poData.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : purchaseOrderId ? 'Update Purchase Order' : 'Create Purchase Order'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}