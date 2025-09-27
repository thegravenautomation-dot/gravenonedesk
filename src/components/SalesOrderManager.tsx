import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Upload, 
  CreditCard, 
  FileText, 
  DollarSign, 
  Calendar,
  CheckCircle,
  AlertCircle 
} from "lucide-react";

interface SalesOrderManagerProps {
  orderId?: string;
  customerId?: string;
  onOrderCreated?: (orderId: string) => void;
}

interface PaymentData {
  amount: number;
  payment_mode: string;
  payment_date: string;
  reference?: string;
  remarks?: string;
}

export function SalesOrderManager({ orderId, customerId, onOrderCreated }: SalesOrderManagerProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{po: boolean, receipt: boolean}>({
    po: false,
    receipt: false
  });

  // File refs
  const poFileRef = useRef<HTMLInputElement>(null);
  const receiptFileRef = useRef<HTMLInputElement>(null);

  // Payment form state
  const [paymentData, setPaymentData] = useState<PaymentData>({
    amount: 0,
    payment_mode: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    reference: '',
    remarks: ''
  });

  const handleFileUpload = async (type: 'po' | 'receipt', file: File) => {
    if (!orderId) {
      toast({
        title: "Error",
        description: "Order ID is required for file upload",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploadProgress(prev => ({ ...prev, [type]: true }));

      // Upload file to Supabase storage
      const fileName = `${orderId}_${type}_${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('order-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Call the orders API to update the attachment
      const apiEndpoint = type === 'po' ? 'upload-purchase-order' : 'upload-payment-receipt';
      const { data, error } = await supabase.functions.invoke('orders-api', {
        body: {
          orderId,
          action: apiEndpoint,
          fileName: uploadData.path,
          originalName: file.name
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `${type === 'po' ? 'Purchase Order' : 'Payment Receipt'} uploaded successfully`,
      });

    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      toast({
        title: "Upload Failed",
        description: `Failed to upload ${type === 'po' ? 'purchase order' : 'payment receipt'}`,
        variant: "destructive",
      });
    } finally {
      setUploadProgress(prev => ({ ...prev, [type]: false }));
    }
  };

  const handlePaymentSubmit = async () => {
    if (!orderId) {
      toast({
        title: "Error", 
        description: "Order ID is required for payment recording",
        variant: "destructive",
      });
      return;
    }

    if (paymentData.amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid payment amount",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('orders-api', {
        body: {
          orderId,
          action: 'record-payment',
          ...paymentData
        }
      });

      if (error) throw error;

      toast({
        title: "Payment Recorded",
        description: `Payment of ₹${paymentData.amount.toLocaleString()} recorded successfully`,
      });

      // Reset form
      setPaymentData({
        amount: 0,
        payment_mode: 'cash',
        payment_date: new Date().toISOString().split('T')[0],
        reference: '',
        remarks: ''
      });

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Sales Order Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="attachments" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="attachments">Order Attachments</TabsTrigger>
              <TabsTrigger value="payment">Record Payment</TabsTrigger>
            </TabsList>

            <TabsContent value="attachments" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Purchase Order Upload */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Upload className="h-4 w-4" />
                      Purchase Order
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      ref={poFileRef}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload('po', file);
                      }}
                    />
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={uploadProgress.po || !orderId}
                      onClick={() => poFileRef.current?.click()}
                    >
                      {uploadProgress.po ? (
                        <>
                          <AlertCircle className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload PO Document
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Payment Receipt Upload */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <CreditCard className="h-4 w-4" />
                      Payment Receipt
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      ref={receiptFileRef}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload('receipt', file);
                      }}
                    />
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={uploadProgress.receipt || !orderId}
                      onClick={() => receiptFileRef.current?.click()}
                    >
                      {uploadProgress.receipt ? (
                        <>
                          <AlertCircle className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Receipt
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {!orderId && (
                <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <AlertCircle className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                  <p className="text-sm text-yellow-700">
                    Create an order first to upload attachments
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="payment" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="amount">Payment Amount *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="amount"
                        type="number"
                        placeholder="0.00"
                        value={paymentData.amount || ''}
                        onChange={(e) => setPaymentData(prev => ({
                          ...prev,
                          amount: parseFloat(e.target.value) || 0
                        }))}
                        className="pl-8"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="payment-mode">Payment Mode *</Label>
                    <Select
                      value={paymentData.payment_mode}
                      onValueChange={(value) => setPaymentData(prev => ({
                        ...prev,
                        payment_mode: value
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="netbanking">Net Banking</SelectItem>
                        <SelectItem value="card">Credit/Debit Card</SelectItem>
                        <SelectItem value="rtgs">RTGS/NEFT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="payment-date">Payment Date *</Label>
                    <div className="relative">
                      <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="payment-date"
                        type="date"
                        value={paymentData.payment_date}
                        onChange={(e) => setPaymentData(prev => ({
                          ...prev,
                          payment_date: e.target.value
                        }))}
                        className="pl-8"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="reference">Reference Number</Label>
                    <Input
                      id="reference"
                      placeholder="Transaction ID, Cheque No, etc."
                      value={paymentData.reference}
                      onChange={(e) => setPaymentData(prev => ({
                        ...prev,
                        reference: e.target.value
                      }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="remarks">Remarks</Label>
                    <Input
                      id="remarks"
                      placeholder="Additional notes"
                      value={paymentData.remarks}
                      onChange={(e) => setPaymentData(prev => ({
                        ...prev,
                        remarks: e.target.value
                      }))}
                    />
                  </div>

                  <Button
                    onClick={handlePaymentSubmit}
                    disabled={loading || !orderId || paymentData.amount <= 0}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <AlertCircle className="h-4 w-4 mr-2 animate-spin" />
                        Recording Payment...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Record Payment
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {!orderId && (
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <AlertCircle className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-blue-700">
                    Select an order to record payments
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}