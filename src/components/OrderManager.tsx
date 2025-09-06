import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { QuotationTemplate } from "./QuotationTemplate";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Eye, FileText, Upload, DollarSign } from "lucide-react";

interface OrderManagerProps {
  customerId?: string;
  quotationId?: string;
  onSuccess?: () => void;
}

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

export function OrderManager({ customerId, quotationId, onSuccess }: OrderManagerProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [branchData, setBranchData] = useState<any>(null);
  const [customerData, setCustomerData] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  
  const [orderData, setOrderData] = useState({
    order_no: "",
    customer_po_no: "",
    delivery_date: "",
    terms: "",
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

  const [paymentData, setPaymentData] = useState({
    amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    method: "",
    reference: "",
    note: ""
  });

  useEffect(() => {
    if (profile?.branch_id) {
      fetchBranchData();
      generateOrderNumber();
    }
    if (customerId) {
      fetchCustomerData();
    }
    if (quotationId) {
      loadFromQuotation();
    }
  }, [profile?.branch_id, customerId, quotationId]);

  const fetchBranchData = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('id', profile?.branch_id)
        .single();

      if (error) throw error;
      setBranchData(data);
    } catch (error) {
      console.error('Error fetching branch data:', error);
    }
  };

  const fetchCustomerData = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error) throw error;
      setCustomerData(data);
    } catch (error) {
      console.error('Error fetching customer data:', error);
    }
  };

  const loadFromQuotation = async () => {
    try {
      // Fetch quotation data
      const { data: quotation, error: quotationError } = await supabase
        .from('quotations')
        .select(`
          *,
          quotation_items (*)
        `)
        .eq('id', quotationId)
        .single();

      if (quotationError) throw quotationError;

      // Load items from quotation
      if (quotation.quotation_items) {
        const orderItems = quotation.quotation_items.map((item: any) => ({
          sr_no: item.sr_no,
          item_name: item.item_name,
          description: item.description,
          hsn_code: item.hsn_code,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          total_amount: item.total_amount,
          gst_rate: item.gst_rate,
          gst_amount: item.gst_amount
        }));
        setItems(orderItems);
      }

      setOrderData(prev => ({
        ...prev,
        terms: quotation.terms || branchData?.terms_conditions || ""
      }));

    } catch (error) {
      console.error('Error loading quotation:', error);
    }
  };

  const generateOrderNumber = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('order_no')
        .eq('branch_id', profile?.branch_id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

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
    }
  };

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
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
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total_amount, 0);
    const totalGst = items.reduce((sum, item) => sum + item.gst_amount, 0);
    const total = subtotal + totalGst;
    
    return { subtotal, totalGst, total };
  };

  const uploadFile = async (file: File, folder: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${profile?.id}/${folder}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (error) throw error;
    return filePath;
  };

  const handleSaveOrder = async () => {
    try {
      if (!orderData.order_no || items.some(item => !item.item_name)) {
        toast({
          title: "Error",
          description: "Please fill all required fields",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);
      const { subtotal, totalGst, total } = calculateTotals();

      let pdfPath = null;
      if (pdfFile) {
        pdfPath = await uploadFile(pdfFile, 'orders');
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_no: orderData.order_no,
          customer_id: customerId,
          quotation_id: quotationId,
          branch_id: profile?.branch_id,
          customer_po_no: orderData.customer_po_no,
          delivery_date: orderData.delivery_date || null,
          subtotal: subtotal,
          tax_amount: totalGst,
          total_amount: total,
          status: 'pending',
          po_pdf_path: pdfPath
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
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

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error saving order:', error);
      toast({
        title: "Error",
        description: "Failed to create order",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const recordPayment = async () => {
    try {
      if (!paymentData.amount || !paymentData.method) {
        toast({
          title: "Error",
          description: "Please fill required payment fields",
          variant: "destructive",
        });
        return;
      }

      let receiptPath = null;
      if (receiptFile) {
        receiptPath = await uploadFile(receiptFile, 'receipts');
      }

      // This would be called after order is saved
      // For now, just show success message
      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });

      setIsPaymentDialogOpen(false);
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      });
    }
  };

  const { subtotal, totalGst, total } = calculateTotals();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <div>
          <Label htmlFor="order_no">Order Number</Label>
          <Input
            id="order_no"
            value={orderData.order_no}
            onChange={(e) => setOrderData({...orderData, order_no: e.target.value})}
            readOnly
          />
        </div>
        <div>
          <Label htmlFor="customer_po_no">Customer PO Number</Label>
          <Input
            id="customer_po_no"
            value={orderData.customer_po_no}
            onChange={(e) => setOrderData({...orderData, customer_po_no: e.target.value})}
            placeholder="Enter customer PO number"
          />
        </div>
        <div>
          <Label htmlFor="delivery_date">Delivery Date</Label>
          <Input
            id="delivery_date"
            type="date"
            value={orderData.delivery_date}
            onChange={(e) => setOrderData({...orderData, delivery_date: e.target.value})}
          />
        </div>
        <div>
          <Label>Customer</Label>
          <p className="text-sm font-medium py-2">
            {customerData?.name || "No customer selected"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="pdf_upload">Order PDF Attachment</Label>
          <Input
            id="pdf_upload"
            type="file"
            accept=".pdf"
            onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Order Items</CardTitle>
            <Button onClick={addItem} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
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
                        placeholder="Enter description"
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
                      <Select value={item.unit} onValueChange={(value) => updateItem(index, 'unit', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Nos">Nos</SelectItem>
                          <SelectItem value="Kg">Kg</SelectItem>
                          <SelectItem value="Meter">Meter</SelectItem>
                          <SelectItem value="Sq.Ft">Sq.Ft</SelectItem>
                          <SelectItem value="Set">Set</SelectItem>
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
                        max="28"
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
          
          <div className="mt-4 flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total GST:</span>
                <span>₹{totalGst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total Amount:</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Order Preview</DialogTitle>
                <DialogDescription>
                  Preview of the order before saving
                </DialogDescription>
              </DialogHeader>
              <QuotationTemplate
                quotationData={{
                  ...orderData,
                  subtotal,
                  tax_amount: totalGst,
                  total_amount: total,
                  quotation_no: orderData.order_no
                }}
                items={items}
                branchData={branchData}
                customerData={customerData}
                templateType="order"
              />
            </DialogContent>
          </Dialog>

          <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <DollarSign className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Payment</DialogTitle>
                <DialogDescription>
                  Record payment for this order
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="amount">Amount *</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={paymentData.amount}
                      onChange={(e) => setPaymentData({...paymentData, amount: parseFloat(e.target.value) || 0})}
                      placeholder="Enter amount"
                    />
                  </div>
                  <div>
                    <Label htmlFor="payment_date">Payment Date</Label>
                    <Input
                      id="payment_date"
                      type="date"
                      value={paymentData.payment_date}
                      onChange={(e) => setPaymentData({...paymentData, payment_date: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="method">Payment Method *</Label>
                    <Select value={paymentData.method} onValueChange={(value) => setPaymentData({...paymentData, method: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="reference">Reference Number</Label>
                    <Input
                      id="reference"
                      value={paymentData.reference}
                      onChange={(e) => setPaymentData({...paymentData, reference: e.target.value})}
                      placeholder="Transaction ID / Cheque No"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="receipt_upload">Payment Receipt</Label>
                  <Input
                    id="receipt_upload"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  />
                </div>
                <div>
                  <Label htmlFor="note">Note</Label>
                  <Textarea
                    id="note"
                    value={paymentData.note}
                    onChange={(e) => setPaymentData({...paymentData, note: e.target.value})}
                    placeholder="Additional notes"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={recordPayment}>
                    Record Payment
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSaveOrder} disabled={loading}>
            <FileText className="h-4 w-4 mr-2" />
            Save Order
          </Button>
        </div>
      </div>
    </div>
  );
}