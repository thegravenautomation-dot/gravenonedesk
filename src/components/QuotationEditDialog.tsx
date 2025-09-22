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

interface QuotationItem {
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

interface QuotationEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotationId: string | null;
  onSuccess: () => void;
}

export function QuotationEditDialog({
  open,
  onOpenChange,
  quotationId,
  onSuccess
}: QuotationEditDialogProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [originalData, setOriginalData] = useState<any>(null);

  const [quotationData, setQuotationData] = useState({
    quotation_no: "",
    customer_id: "",
    lead_id: "",
    valid_till: "",
    terms: "",
    status: "draft" as "draft" | "sent" | "approved" | "rejected" | "converted",
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
  });

  const [items, setItems] = useState<QuotationItem[]>([
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
      if (quotationId) {
        fetchQuotationData();
      } else {
        resetForm();
        generateQuotationNumber();
      }
    }
  }, [open, quotationId]);

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

  const generateQuotationNumber = async () => {
    try {
      const { data } = await supabase
        .from('quotations')
        .select('quotation_no')
        .eq('branch_id', profile?.branch_id)
        .order('created_at', { ascending: false })
        .limit(1);

      let nextNumber = 1;
      if (data && data.length > 0) {
        const lastNumber = data[0].quotation_no.match(/\d+$/);
        if (lastNumber) {
          nextNumber = parseInt(lastNumber[0]) + 1;
        }
      }

      const quotationNo = `QUO-${new Date().getFullYear()}-${String(nextNumber).padStart(4, '0')}`;
      setQuotationData(prev => ({ ...prev, quotation_no: quotationNo }));
    } catch (error) {
      console.error('Error generating quotation number:', error);
    }
  };

  const fetchQuotationData = async () => {
    if (!quotationId) return;

    try {
      setLoading(true);

      const { data: quotation, error: quotationError } = await supabase
        .from('quotations')
        .select(`
          *,
          quotation_items (*)
        `)
        .eq('id', quotationId)
        .single();

      if (quotationError) throw quotationError;

      setOriginalData(quotation);
      setQuotationData({
        quotation_no: quotation.quotation_no,
        customer_id: quotation.customer_id || "",
        lead_id: quotation.lead_id || "",
        valid_till: quotation.valid_till || "",
        terms: quotation.terms || "",
        status: quotation.status as "draft" | "sent" | "approved" | "rejected" | "converted",
        subtotal: quotation.subtotal || 0,
        tax_amount: quotation.tax_amount || 0,
        total_amount: quotation.total_amount || 0,
      });

      if (quotation.quotation_items && quotation.quotation_items.length > 0) {
        const quotationItems = quotation.quotation_items.map((item: any) => ({
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
        setItems(quotationItems);
      }
    } catch (error) {
      console.error('Error fetching quotation:', error);
      toast({
        title: "Error",
        description: "Failed to load quotation data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setQuotationData({
      quotation_no: "",
      customer_id: "",
      lead_id: "",
      valid_till: "",
      terms: "",
      status: "draft",
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
    const newItem: QuotationItem = {
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

  const updateItem = (index: number, field: keyof QuotationItem, value: any) => {
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
    
    setQuotationData(prev => ({
      ...prev,
      subtotal,
      tax_amount: totalGst,
      total_amount: total
    }));
  };

  const handleSave = async () => {
    try {
      if (!quotationData.quotation_no || !quotationData.customer_id || items.some(item => !item.item_name)) {
        toast({
          title: "Error",
          description: "Please fill all required fields",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);

      if (quotationId) {
        // Update existing quotation
        const { error: quotationError } = await supabase
          .from('quotations')
          .update({
            customer_id: quotationData.customer_id,
            lead_id: quotationData.lead_id || null,
            valid_till: quotationData.valid_till || null,
            terms: quotationData.terms,
            status: quotationData.status,
            subtotal: quotationData.subtotal,
            tax_amount: quotationData.tax_amount,
            total_amount: quotationData.total_amount,
          })
          .eq('id', quotationId);

        if (quotationError) throw quotationError;

        // Delete existing items and insert new ones
        await supabase
          .from('quotation_items')
          .delete()
          .eq('quotation_id', quotationId);

        const quotationItems = items.map(item => ({
          quotation_id: quotationId,
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
          .from('quotation_items')
          .insert(quotationItems);

        if (itemsError) throw itemsError;

        // Log the edit operation
        if (originalData && profile?.id && profile?.branch_id) {
          await logEdit(
            profile.id,
            profile.branch_id,
            'quotation',
            quotationId,
            originalData,
            { ...quotationData, items }
          );
        }

        toast({
          title: "Success",
          description: "Quotation updated successfully",
        });
      } else {
        // Create new quotation
        const { data: quotation, error: quotationError } = await supabase
          .from('quotations')
          .insert({
            quotation_no: quotationData.quotation_no,
            customer_id: quotationData.customer_id,
            lead_id: quotationData.lead_id || null,
            branch_id: profile?.branch_id,
            valid_till: quotationData.valid_till || null,
            terms: quotationData.terms,
            status: quotationData.status,
            subtotal: quotationData.subtotal,
            tax_amount: quotationData.tax_amount,
            total_amount: quotationData.total_amount,
            created_by: profile?.id
          })
          .select()
          .single();

        if (quotationError) throw quotationError;

        const quotationItems = items.map(item => ({
          quotation_id: quotation.id,
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
          .from('quotation_items')
          .insert(quotationItems);

        if (itemsError) throw itemsError;

        toast({
          title: "Success",
          description: "Quotation created successfully",
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving quotation:', error);
      toast({
        title: "Error",
        description: "Failed to save quotation",
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
            {quotationId ? 'Edit Quotation' : 'Create Quotation'}
          </DialogTitle>
          <DialogDescription>
            {quotationId ? 'Update quotation details and items' : 'Create a new quotation with items'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quotation Header */}
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quotation_no">Quotation Number</Label>
              <Input
                id="quotation_no"
                value={quotationData.quotation_no}
                onChange={(e) => setQuotationData({...quotationData, quotation_no: e.target.value})}
                disabled={!!quotationId}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer">Customer</Label>
              <Select 
                value={quotationData.customer_id} 
                onValueChange={(value) => setQuotationData({...quotationData, customer_id: value})}
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
              <Label htmlFor="valid_till">Valid Till</Label>
              <Input
                id="valid_till"
                type="date"
                value={quotationData.valid_till}
                onChange={(e) => setQuotationData({...quotationData, valid_till: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={quotationData.status} 
                onValueChange={(value: "draft" | "sent" | "approved" | "rejected" | "converted") => setQuotationData({...quotationData, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quotation Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Quotation Items</h3>
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
                <span>₹{quotationData.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST:</span>
                <span>₹{quotationData.tax_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>₹{quotationData.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : quotationId ? 'Update Quotation' : 'Create Quotation'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}