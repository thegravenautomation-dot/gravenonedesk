import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, DollarSign, FileText, Download, Plus, Calendar, Receipt } from "lucide-react";
import { ordersApi, type PaymentData, type OrderPaymentResponse } from "@/lib/ordersApi";

interface OrderDetailsPageProps {
  orderId: string;
}

interface PaymentRecord {
  id: string;
  amount: number;
  payment_date: string;
  method: string;
  reference?: string;
  remarks?: string;
  created_at: string;
}

export function OrderDetailsPage({ orderId }: OrderDetailsPageProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<OrderPaymentResponse | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  
  // File uploads
  const [purchaseOrderFile, setPurchaseOrderFile] = useState<File | null>(null);
  const [paymentReceiptFile, setPaymentReceiptFile] = useState<File | null>(null);
  
  // Payment form
  const [newPayment, setNewPayment] = useState<PaymentData>({
    amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    payment_mode: 'Cash',
    reference: '',
    remarks: ''
  });

  useEffect(() => {
    fetchOrderPayments();
  }, [orderId]);

  const fetchOrderPayments = async () => {
    try {
      setLoading(true);
      const data = await ordersApi.getOrderPayments(orderId);
      setPaymentData(data);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch payment data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadPurchaseOrder = async () => {
    if (!purchaseOrderFile) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const result = await ordersApi.uploadPurchaseOrder(orderId, purchaseOrderFile);
      
      toast({
        title: "Success",
        description: result.message,
      });
      
      setPurchaseOrderFile(null);
      // Reset file input
      const fileInput = document.getElementById('purchase-order-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      console.error('Error uploading purchase order:', error);
      toast({
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadPaymentReceipt = async () => {
    if (!paymentReceiptFile) {
      toast({
        title: "Error",
        description: "Please select a file to upload", 
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const result = await ordersApi.uploadPaymentReceipt(orderId, paymentReceiptFile);
      
      toast({
        title: "Success",
        description: result.message,
      });
      
      setPaymentReceiptFile(null);
      // Reset file input
      const fileInput = document.getElementById('payment-receipt-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      console.error('Error uploading payment receipt:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!newPayment.amount || !newPayment.payment_mode) {
      toast({
        title: "Error",
        description: "Please fill in required fields (Amount and Payment Mode)",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const result = await ordersApi.recordPayment(orderId, newPayment);
      
      toast({
        title: "Success", 
        description: `Payment recorded. Remaining balance: ₹${result.remaining_balance}`,
      });
      
      // Reset form
      setNewPayment({
        amount: 0,
        payment_date: new Date().toISOString().split('T')[0],
        payment_mode: 'Cash',
        reference: '',
        remarks: ''
      });
      
      setIsPaymentModalOpen(false);
      
      // Refresh payment data
      await fetchOrderPayments();
      
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to record payment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Fully Paid</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800">Partially Paid</Badge>;
      case 'pending':
        return <Badge className="bg-red-100 text-red-800">Payment Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading && !paymentData) {
    return <div className="flex items-center justify-center p-8">Loading order details...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Order Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">Order Details</CardTitle>
              <CardDescription>
                Customer: {paymentData?.customer_name} | Total: ₹{paymentData?.total_amount.toLocaleString()}
              </CardDescription>
            </div>
            <div className="text-right">
              {paymentData && getPaymentStatusBadge(paymentData.payment_status)}
              <div className="text-lg font-semibold mt-2">
                Balance Due: ₹{paymentData?.balance_due.toLocaleString()}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* File Uploads */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            File Attachments
          </CardTitle>
          <CardDescription>Upload purchase order and payment receipt files</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Purchase Order Upload */}
            <div className="space-y-3">
              <Label htmlFor="purchase-order-file">Purchase Order</Label>
              <div className="flex gap-2">
                <Input
                  id="purchase-order-file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => setPurchaseOrderFile(e.target.files?.[0] || null)}
                  className="flex-1"
                />
                <Button 
                  onClick={handleUploadPurchaseOrder}
                  disabled={!purchaseOrderFile || loading}
                  size="sm"
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Upload
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Supported formats: PDF, JPG, PNG, DOC, DOCX (Max 10MB)
              </p>
            </div>

            {/* Payment Receipt Upload */}
            <div className="space-y-3">
              <Label htmlFor="payment-receipt-file">Payment Receipt</Label>
              <div className="flex gap-2">
                <Input
                  id="payment-receipt-file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => setPaymentReceiptFile(e.target.files?.[0] || null)}
                  className="flex-1"
                />
                <Button 
                  onClick={handleUploadPaymentReceipt}
                  disabled={!paymentReceiptFile || loading}
                  size="sm"
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Upload
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Supported formats: PDF, JPG, PNG, DOC, DOCX (Max 10MB)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Management */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payment History
              </CardTitle>
              <CardDescription>
                Total Paid: ₹{paymentData?.total_paid.toLocaleString()} of ₹{paymentData?.total_amount.toLocaleString()}
              </CardDescription>
            </div>
            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record New Payment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="amount">Amount *</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={newPayment.amount}
                      onChange={(e) => setNewPayment({...newPayment, amount: parseFloat(e.target.value) || 0})}
                      placeholder="Enter amount"
                      min="0"
                      step="0.01"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Maximum amount: ₹{paymentData?.balance_due.toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="payment_date">Payment Date *</Label>
                    <Input
                      id="payment_date"
                      type="date"
                      value={newPayment.payment_date}
                      onChange={(e) => setNewPayment({...newPayment, payment_date: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="payment_mode">Payment Mode *</Label>
                    <Select 
                      value={newPayment.payment_mode} 
                      onValueChange={(value: 'Cash' | 'UPI' | 'Net Banking' | 'Cheque') => 
                        setNewPayment({...newPayment, payment_mode: value})
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="Net Banking">Net Banking</SelectItem>
                        <SelectItem value="Cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="reference">Reference Number</Label>
                    <Input
                      id="reference"
                      value={newPayment.reference}
                      onChange={(e) => setNewPayment({...newPayment, reference: e.target.value})}
                      placeholder="Transaction ID, Cheque No., etc."
                    />
                  </div>

                  <div>
                    <Label htmlFor="remarks">Remarks</Label>
                    <Textarea
                      id="remarks"
                      value={newPayment.remarks}
                      onChange={(e) => setNewPayment({...newPayment, remarks: e.target.value})}
                      placeholder="Additional notes..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleRecordPayment} disabled={loading}>
                      {loading ? 'Recording...' : 'Record Payment'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {paymentData?.payments && paymentData.payments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Remaining Balance</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentData.payments.map((payment: any, index: number) => {
                  // Calculate running balance (we'll show remaining after this payment)
                  const paymentsUpToThis = paymentData.payments.slice(0, index + 1);
                  const paidUpToThis = paymentsUpToThis.reduce((sum: number, p: any) => sum + p.amount, 0);
                  const remainingBalance = Math.max(0, paymentData.total_amount - paidUpToThis);
                  
                  return (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {new Date(payment.payment_date).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-green-600">
                          ₹{payment.amount.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{payment.method || payment.payment_mode_extended}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {payment.reference || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${remainingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ₹{remainingBalance.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {payment.note || payment.remarks || '-'}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No payments recorded yet</p>
              <p className="text-sm text-muted-foreground">Click "Record Payment" to add the first payment</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}