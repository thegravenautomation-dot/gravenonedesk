import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ordersApi, PaymentData } from "@/lib/ordersApi";
import { FileText, Upload, DollarSign, ListChecks, BookOpen } from "lucide-react";

export function ApiTestComponent() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentData>({
    amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    payment_mode: 'Cash',
    reference: '',
    remarks: ''
  });

  const handleUploadPurchaseOrder = async () => {
    if (!orderId || !selectedFile) {
      toast({
        title: "Error",
        description: "Please select an order ID and file",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const result = await ordersApi.uploadPurchaseOrder(orderId, selectedFile);
      toast({
        title: "Success",
        description: result.message
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Upload failed',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadPaymentReceipt = async () => {
    if (!orderId || !selectedFile) {
      toast({
        title: "Error",
        description: "Please select an order ID and file",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const result = await ordersApi.uploadPaymentReceipt(orderId, selectedFile);
      toast({
        title: "Success",
        description: result.message
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Upload failed',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!orderId || paymentData.amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter valid order ID and payment amount",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const result = await ordersApi.recordPayment(orderId, paymentData);
      toast({
        title: "Success",
        description: `${result.message}. Remaining balance: ₹${result.remaining_balance}`
      });
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Payment recording failed',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGetOrderPayments = async () => {
    if (!orderId) {
      toast({
        title: "Error",
        description: "Please enter an order ID",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const result = await ordersApi.getOrderPayments(orderId);
      console.log('Order payments:', result);
      toast({
        title: "Success",
        description: `Found ${result.payments.length} payments. Status: ${result.payment_status}`
      });
    } catch (error) {
      console.error('Get payments error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to fetch payments',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGetCustomerLedger = async () => {
    if (!customerId) {
      toast({
        title: "Error",
        description: "Please enter a customer ID",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const result = await ordersApi.getCustomerLedger(customerId, {
        limit: 50
      });
      console.log('Customer ledger:', result);
      toast({
        title: "Success",
        description: `Found ${result.ledger_entries.length} ledger entries. Balance: ₹${result.account_summary.current_balance}`
      });
    } catch (error) {
      console.error('Get ledger error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to fetch ledger',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            REST API Test Suite
          </CardTitle>
          <CardDescription>
            Test the new REST API endpoints for orders and customer management
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Upload className="h-4 w-4" />
              File Upload APIs
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="orderId">Order ID</Label>
                <Input
                  id="orderId"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="Enter order ID"
                />
              </div>
              <div>
                <Label htmlFor="file">Select File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleUploadPurchaseOrder} 
                disabled={loading}
                variant="outline"
              >
                Upload Purchase Order
              </Button>
              <Button 
                onClick={handleUploadPaymentReceipt} 
                disabled={loading}
                variant="outline"
              >
                Upload Payment Receipt
              </Button>
            </div>
          </div>

          {/* Payment Recording Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Payment Recording API
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  value={paymentData.amount || ''}
                  onChange={(e) => setPaymentData({
                    ...paymentData,
                    amount: parseFloat(e.target.value) || 0
                  })}
                  placeholder="Enter amount"
                />
              </div>
              <div>
                <Label htmlFor="paymentMode">Payment Mode</Label>
                <Select 
                  value={paymentData.payment_mode} 
                  onValueChange={(value: any) => setPaymentData({
                    ...paymentData,
                    payment_mode: value
                  })}
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
                <Label htmlFor="paymentDate">Payment Date</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={paymentData.payment_date}
                  onChange={(e) => setPaymentData({
                    ...paymentData,
                    payment_date: e.target.value
                  })}
                />
              </div>
              <div>
                <Label htmlFor="reference">Reference</Label>
                <Input
                  id="reference"
                  value={paymentData.reference || ''}
                  onChange={(e) => setPaymentData({
                    ...paymentData,
                    reference: e.target.value
                  })}
                  placeholder="Transaction reference"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={paymentData.remarks || ''}
                onChange={(e) => setPaymentData({
                  ...paymentData,
                  remarks: e.target.value
                })}
                placeholder="Payment remarks or notes"
              />
            </div>
            <Button onClick={handleRecordPayment} disabled={loading}>
              Record Payment
            </Button>
          </div>

          {/* Data Retrieval Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              Data Retrieval APIs
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerIdLedger">Customer ID (for ledger)</Label>
                <Input
                  id="customerIdLedger"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  placeholder="Enter customer ID"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleGetOrderPayments} 
                disabled={loading}
                variant="outline"
              >
                Get Order Payments
              </Button>
              <Button 
                onClick={handleGetCustomerLedger} 
                disabled={loading}
                variant="outline"
              >
                Get Customer Ledger
              </Button>
            </div>
          </div>

          {/* API Documentation */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              API Endpoints
            </h3>
            <div className="bg-muted p-4 rounded-lg text-sm">
              <p><strong>POST</strong> /orders-api/orders/:id/upload-purchase-order</p>
              <p><strong>POST</strong> /orders-api/orders/:id/upload-payment-receipt</p>
              <p><strong>POST</strong> /orders-api/orders/:id/record-payment</p>
              <p><strong>GET</strong> /orders-api/orders/:id/payments</p>
              <p><strong>GET</strong> /customers-api/customers/:id/ledger</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}