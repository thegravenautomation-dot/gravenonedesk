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

interface InvoiceItem {
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

interface InvoiceEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string | null;
  onSuccess: () => void;
}

export function InvoiceEditDialog({
  open,
  onOpenChange,
  invoiceId,
  onSuccess
}: InvoiceEditDialogProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [originalData, setOriginalData] = useState<any>(null);

  const [invoiceData, setInvoiceData] = useState({
    invoice_no: "",
    customer_id: "",
    invoice_date: "",
    due_date: "",
    invoice_type: "regular" as "regular" | "proforma",
    payment_status: "pending",
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
  });

  const [items, setItems] = useState<InvoiceItem[]>([
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
      if (invoiceId) {
        fetchInvoiceData();
      } else {
        resetForm();
      }
    }
  }, [open, invoiceId]);

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

  const fetchInvoiceData = async () => {
    if (!invoiceId) return;

    try {
      setLoading(true);

      // Fetch invoice with items
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          invoice_items (*)
        `)
        .eq('id', invoiceId)
        .single();

      if (invoiceError) throw invoiceError;

      setOriginalData(invoice);
      setInvoiceData({
        invoice_no: invoice.invoice_no,
        customer_id: invoice.customer_id,
        invoice_date: invoice.invoice_date,
        due_date: invoice.due_date || "",
        invoice_type: invoice.invoice_type,
        payment_status: invoice.payment_status,
        subtotal: invoice.subtotal || 0,
        tax_amount: invoice.tax_amount || 0,
        total_amount: invoice.total_amount || 0,
      });

      if (invoice.invoice_items && invoice.invoice_items.length > 0) {
        const invoiceItems = invoice.invoice_items.map((item: any) => ({
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
        setItems(invoiceItems);
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      toast({
        title: "Error",
        description: "Failed to load invoice data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setInvoiceData({
      invoice_no: "",
      customer_id: "",
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: "",
      invoice_type: "regular",
      payment_status: "pending",
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
    const newItem: InvoiceItem = {
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

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
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
    
    setInvoiceData(prev => ({
      ...prev,
      subtotal,
      tax_amount: totalGst,
      total_amount: total
    }));
  };

  const handleSave = async () => {
    try {
      if (!invoiceData.invoice_no || !invoiceData.customer_id || items.some(item => !item.item_name)) {
        toast({
          title: "Error",
          description: "Please fill all required fields",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);

      if (invoiceId) {
        // Update existing invoice
        const { error: invoiceError } = await supabase
          .from('invoices')
          .update({
            customer_id: invoiceData.customer_id,
            invoice_date: invoiceData.invoice_date,
            due_date: invoiceData.due_date || null,
            invoice_type: invoiceData.invoice_type,
            payment_status: invoiceData.payment_status,
            subtotal: invoiceData.subtotal,
            tax_amount: invoiceData.tax_amount,
            total_amount: invoiceData.total_amount,
          })
          .eq('id', invoiceId);

        if (invoiceError) throw invoiceError;

        // Delete existing items and insert new ones
        await supabase
          .from('invoice_items')
          .delete()
          .eq('invoice_id', invoiceId);

        const invoiceItems = items.map(item => ({
          invoice_id: invoiceId,
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
          .from('invoice_items')
          .insert(invoiceItems);

        if (itemsError) throw itemsError;

        // Log the edit operation
        if (originalData && profile?.id && profile?.branch_id) {
          await logEdit(
            profile.id,
            profile.branch_id,
            'invoice',
            invoiceId,
            originalData,
            { ...invoiceData, items }
          );
        }

        toast({
          title: "Success",
          description: "Invoice updated successfully",
        });
      } else {
        // Create new invoice - generate invoice number
        const { data: lastInvoice } = await supabase
          .from('invoices')
          .select('invoice_no')
          .eq('branch_id', profile?.branch_id)
          .order('created_at', { ascending: false })
          .limit(1);

        let nextNumber = 1;
        if (lastInvoice && lastInvoice.length > 0) {
          const lastNumber = lastInvoice[0].invoice_no.match(/\d+$/);
          if (lastNumber) {
            nextNumber = parseInt(lastNumber[0]) + 1;
          }
        }

        const invoiceNo = `INV-${new Date().getFullYear()}-${String(nextNumber).padStart(4, '0')}`;

        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            invoice_no: invoiceNo,
            customer_id: invoiceData.customer_id,
            branch_id: profile?.branch_id,
            invoice_date: invoiceData.invoice_date,
            due_date: invoiceData.due_date || null,
            invoice_type: invoiceData.invoice_type,
            payment_status: invoiceData.payment_status,
            subtotal: invoiceData.subtotal,
            tax_amount: invoiceData.tax_amount,
            total_amount: invoiceData.total_amount,
          })
          .select()
          .single();

        if (invoiceError) throw invoiceError;

        const invoiceItems = items.map(item => ({
          invoice_id: invoice.id,
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
          .from('invoice_items')
          .insert(invoiceItems);

        if (itemsError) throw itemsError;

        toast({
          title: "Success",
          description: "Invoice created successfully",
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast({
        title: "Error",
        description: "Failed to save invoice",
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
            {invoiceId ? 'Edit Invoice' : 'Create Invoice'}
          </DialogTitle>
          <DialogDescription>
            {invoiceId ? 'Update invoice details and items' : 'Create a new invoice with items'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice Header */}
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoice_no">Invoice Number</Label>
              <Input
                id="invoice_no"
                value={invoiceData.invoice_no}
                onChange={(e) => setInvoiceData({...invoiceData, invoice_no: e.target.value})}
                disabled={!!invoiceId}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer">Customer</Label>
              <Select 
                value={invoiceData.customer_id} 
                onValueChange={(value) => setInvoiceData({...invoiceData, customer_id: value})}
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
              <Label htmlFor="invoice_date">Invoice Date</Label>
              <Input
                id="invoice_date"
                type="date"
                value={invoiceData.invoice_date}
                onChange={(e) => setInvoiceData({...invoiceData, invoice_date: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={invoiceData.due_date}
                onChange={(e) => setInvoiceData({...invoiceData, due_date: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoice_type">Invoice Type</Label>
              <Select 
                value={invoiceData.invoice_type} 
                onValueChange={(value: "regular" | "proforma") => setInvoiceData({...invoiceData, invoice_type: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular Invoice</SelectItem>
                  <SelectItem value="proforma">Proforma Invoice</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_status">Payment Status</Label>
              <Select 
                value={invoiceData.payment_status} 
                onValueChange={(value) => setInvoiceData({...invoiceData, payment_status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Invoice Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Invoice Items</h3>
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
                <span>₹{invoiceData.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST:</span>
                <span>₹{invoiceData.tax_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>₹{invoiceData.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : invoiceId ? 'Update Invoice' : 'Create Invoice'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}