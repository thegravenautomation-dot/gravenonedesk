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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Eye, FileText, Upload, DollarSign, Paperclip, CreditCard, History } from "lucide-react";

interface EnhancedOrderManagerProps {
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

interface PaymentHistory {
  id: string;
  amount: number;
  payment_date: string;
  method: string;
  reference: string;
  receipt_path?: string;
  note?: string;
  created_at: string;
}

export function EnhancedOrderManager({ customerId, quotationId, onSuccess }: EnhancedOrderManagerProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [branchData, setBranchData] = useState<any>(null);
  const [customerData, setCustomerData] = useState<any>(null);
  const [savedOrderId, setSavedOrderId] = useState<string | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  
  // File attachments
  const [purchaseOrderFile, setPurchaseOrderFile] = useState<File | null>(null);
  const [paymentReceiptFile, setPaymentReceiptFile] = useState<File | null>(null);
  
  // Order data
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
    note: "",
    cheque_number: "",
    bank_name: "",
    transaction_id: ""
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

  useEffect(() => {
    if (savedOrderId) {
      fetchPaymentHistory();
    }
  }, [savedOrderId]);

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

  const fetchPaymentHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('order_id', savedOrderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaymentHistory(data || []);
    } catch (error) {
      console.error('Error fetching payment history:', error);
    }
  };

  const loadFromQuotation = async () => {
    try {
      const { data: quotation, error: quotationError } = await supabase
        .from('quotations')
        .select(`
          *,
          quotation_items (*)
        `)
        .eq('id', quotationId)
        .single();

      if (quotationError) throw quotationError;

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

      // Upload attachments
      let purchaseOrderPath = null;
      let initialPaymentReceiptPath = null;
      
      if (purchaseOrderFile) {
        purchaseOrderPath = await uploadFile(purchaseOrderFile, 'purchase-orders');
      }
      
      if (paymentReceiptFile) {
        initialPaymentReceiptPath = await uploadFile(paymentReceiptFile, 'payment-receipts');
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
          po_pdf_path: purchaseOrderPath
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

      setSavedOrderId(order.id);
      
      // Auto-record payment if receipt was uploaded and amount is provided
      if (initialPaymentReceiptPath && paymentData.amount > 0 && paymentData.method) {
        await recordPayment(order.id, initialPaymentReceiptPath);
      }
      
      toast({
        title: "Success",
        description: "Order created successfully with attachments",
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

  const recordPayment = async (orderId?: string, receiptPath?: string) => {
    try {
      const targetOrderId = orderId || savedOrderId;
      
      if (!targetOrderId) {
        toast({
          title: "Error",
          description: "Please save the order first before recording payment",
          variant: "destructive",
        });
        return;
      }

      if (!paymentData.amount || !paymentData.method) {
        toast({
          title: "Error",
          description: "Please fill required payment fields",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);

      let finalReceiptPath = receiptPath;
      if (!finalReceiptPath && paymentReceiptFile) {
        finalReceiptPath = await uploadFile(paymentReceiptFile, 'payment-receipts');
      }

      // Save payment to database
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id: targetOrderId,
          customer_id: customerId,
          branch_id: profile?.branch_id,
          amount: paymentData.amount,
          payment_date: paymentData.payment_date,
          method: paymentData.method,
          payment_mode: paymentData.method,
          reference: paymentData.reference || null,
          transaction_id: paymentData.transaction_id || null,
          cheque_number: paymentData.cheque_number || null,
          bank_name: paymentData.bank_name || null,
          receipt_path: finalReceiptPath,
          note: paymentData.note || null,
          created_by: profile?.id
        });

      if (paymentError) throw paymentError;

      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });

      // Reset payment form
      setPaymentData({
        amount: 0,
        payment_date: new Date().toISOString().split('T')[0],
        method: "",
        reference: "",
        note: "",
        cheque_number: "",
        bank_name: "",
        transaction_id: ""
      });
      
      // Refresh payment history
      if (savedOrderId) {
        fetchPaymentHistory();
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, totalGst, total } = calculateTotals();

  return (
    <div className="space-y-6">
      <Tabs defaultValue="order-details" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="order-details">Order Details</TabsTrigger>
          <TabsTrigger value="attachments">Attachments & Payments</TabsTrigger>
          <TabsTrigger value="history" disabled={!savedOrderId}>Payment History</TabsTrigger>
        </TabsList>

        <TabsContent value="order-details" className="space-y-4">
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
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                            min="1"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.unit}
                            onChange={(e) => updateItem(index, 'unit', e.target.value)}
                          />
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

              <div className="mt-4 flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST:</span>
                    <span>₹{totalGst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>₹{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attachments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                Order Attachments
              </CardTitle>
              <CardDescription>
                Upload relevant documents and record initial payment for this order
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="purchase_order_upload" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Purchase Order (Optional)
                  </Label>
                  <Input
                    id="purchase_order_upload"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setPurchaseOrderFile(e.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload customer's purchase order document
                  </p>
                  {purchaseOrderFile && (
                    <Badge variant="secondary" className="text-xs">
                      {purchaseOrderFile.name}
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="payment_receipt_upload" className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Payment Receipt (Optional)
                  </Label>
                  <Input
                    id="payment_receipt_upload"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setPaymentReceiptFile(e.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload payment receipt or proof
                  </p>
                  {paymentReceiptFile && (
                    <Badge variant="secondary" className="text-xs">
                      {paymentReceiptFile.name}
                    </Badge>
                  )}
                </div>
              </div>
              
              {paymentReceiptFile && (
                <Card className="bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-lg">Initial Payment Details</CardTitle>
                    <CardDescription>
                      Fill in payment details for the uploaded receipt
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="payment_amount">Amount *</Label>
                        <Input
                          id="payment_amount"
                          type="number"
                          value={paymentData.amount}
                          onChange={(e) => setPaymentData({...paymentData, amount: parseFloat(e.target.value) || 0})}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <Label htmlFor="payment_method">Payment Method *</Label>
                        <Select value={paymentData.method} onValueChange={(value) => setPaymentData({...paymentData, method: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="cheque">Cheque</SelectItem>
                            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                            <SelectItem value="upi">UPI</SelectItem>
                            <SelectItem value="card">Card</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {paymentData.method === 'cheque' && (
                        <>
                          <div>
                            <Label htmlFor="cheque_number">Cheque Number</Label>
                            <Input
                              id="cheque_number"
                              value={paymentData.cheque_number}
                              onChange={(e) => setPaymentData({...paymentData, cheque_number: e.target.value})}
                              placeholder="Enter cheque number"
                            />
                          </div>
                          <div>
                            <Label htmlFor="bank_name">Bank Name</Label>
                            <Input
                              id="bank_name"
                              value={paymentData.bank_name}
                              onChange={(e) => setPaymentData({...paymentData, bank_name: e.target.value})}
                              placeholder="Enter bank name"
                            />
                          </div>
                        </>
                      )}
                      
                      {(paymentData.method === 'bank_transfer' || paymentData.method === 'upi') && (
                        <div>
                          <Label htmlFor="transaction_id">Transaction ID</Label>
                          <Input
                            id="transaction_id"
                            value={paymentData.transaction_id}
                            onChange={(e) => setPaymentData({...paymentData, transaction_id: e.target.value})}
                            placeholder="Enter transaction ID"
                          />
                        </div>
                      )}
                      
                      <div>
                        <Label htmlFor="payment_reference">Reference</Label>
                        <Input
                          id="payment_reference"
                          value={paymentData.reference}
                          onChange={(e) => setPaymentData({...paymentData, reference: e.target.value})}
                          placeholder="Reference number"
                        />
                      </div>
                      
                      <div className="col-span-2">
                        <Label htmlFor="payment_note">Note</Label>
                        <Textarea
                          id="payment_note"
                          value={paymentData.note}
                          onChange={(e) => setPaymentData({...paymentData, note: e.target.value})}
                          placeholder="Payment notes"
                          rows={2}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Payment History
              </CardTitle>
              <CardDescription>
                Track all payments received for this order
              </CardDescription>
            </CardHeader>
            <CardContent>
              {paymentHistory.length > 0 ? (
                <div className="space-y-4">
                  {paymentHistory.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{payment.method}</Badge>
                          <span className="font-medium">₹{payment.amount.toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(payment.payment_date).toLocaleDateString()}
                          {payment.reference && ` • Ref: ${payment.reference}`}
                        </p>
                        {payment.note && (
                          <p className="text-sm text-muted-foreground">{payment.note}</p>
                        )}
                      </div>
                      {payment.receipt_path && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const { data } = supabase.storage
                              .from('documents')
                              .getPublicUrl(payment.receipt_path!);
                            window.open(data.publicUrl, '_blank');
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Receipt
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No payments recorded yet
                </p>
              )}
              
              {savedOrderId && (
                <div className="mt-6 pt-6 border-t">
                  <Button onClick={() => recordPayment()} disabled={loading} className="w-full">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Record Additional Payment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleSaveOrder} disabled={loading} size="lg">
          {loading ? "Creating Order..." : "Create Order with Attachments"}
        </Button>
      </div>
    </div>
  );
}