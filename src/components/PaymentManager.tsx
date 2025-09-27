import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminDelete } from "@/hooks/useAdminDelete";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Eye, Upload, DollarSign, CreditCard } from "lucide-react";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { ActionButtons } from "@/components/common/ActionButtons";

interface PaymentManagerProps {
  orderId?: string;
  customerId?: string;
  onSuccess?: () => void;
}

interface PaymentData {
  id?: string;
  order_id: string;
  customer_id?: string;
  amount: number;
  payment_date: string;
  method: string;
  payment_mode: string;
  reference: string;
  note: string;
  cheque_number?: string;
  bank_name?: string;
  transaction_id?: string;
  receipt_path?: string;
}

export function PaymentManager({ orderId, customerId, onSuccess }: PaymentManagerProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const roleAccess = useRoleAccess();
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentData | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const { canDelete, initiateDelete, DeleteDialog } = useAdminDelete({
    onSuccess: () => {
      fetchPayments();
      if (onSuccess) onSuccess();
    }
  });

  const [paymentData, setPaymentData] = useState<PaymentData>({
    order_id: orderId || "",
    customer_id: customerId || "",
    amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    method: "",
    payment_mode: "cash",
    reference: "",
    note: "",
    cheque_number: "",
    bank_name: "",
    transaction_id: ""
  });

  useEffect(() => {
    if (profile?.branch_id) {
      fetchPayments();
      fetchOrders();
    }
  }, [profile?.branch_id]);

  const fetchPayments = async () => {
    try {
      let query = supabase
        .from('payments')
        .select(`
          *,
          orders!inner (
            order_no,
            customer_id,
            customers (name)
          )
        `)
        .eq('branch_id', profile?.branch_id)
        .order('created_at', { ascending: false });

      if (orderId) {
        query = query.eq('order_id', orderId);
      }
      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customers (name)
        `)
        .eq('branch_id', profile?.branch_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const uploadReceipt = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${profile?.id}/receipts/${fileName}`;

    const { data, error } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (error) throw error;
    return filePath;
  };

  const handleSavePayment = async () => {
    try {
      if (!paymentData.order_id || !paymentData.amount || !paymentData.payment_mode) {
        toast({
          title: "Error",
          description: "Please fill all required fields",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);

      let receiptPath = paymentData.receipt_path;
      if (receiptFile) {
        receiptPath = await uploadReceipt(receiptFile);
      }

      const paymentPayload = {
        ...paymentData,
        branch_id: profile?.branch_id,
        receipt_path: receiptPath,
        created_by: profile?.id
      };

      if (editingPayment?.id) {
        // Update existing payment
        const { error } = await supabase
          .from('payments')
          .update(paymentPayload)
          .eq('id', editingPayment.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Payment updated successfully",
        });
      } else {
        // Create new payment
        const { error } = await supabase
          .from('payments')
          .insert(paymentPayload);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Payment recorded successfully",
        });
      }

      setIsDialogOpen(false);
      setEditingPayment(null);
      resetForm();
      fetchPayments();
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error saving payment:', error);
      toast({
        title: "Error",
        description: "Failed to save payment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPaymentData({
      order_id: orderId || "",
      customer_id: customerId || "",
      amount: 0,
      payment_date: new Date().toISOString().split('T')[0],
      method: "",
      payment_mode: "cash",
      reference: "",
      note: "",
      cheque_number: "",
      bank_name: "",
      transaction_id: ""
    });
    setReceiptFile(null);
  };

  const handleDelete = (payment: any) => {
    initiateDelete({
      table: 'payments',
      id: payment.id,
      itemName: `Payment of ₹${payment.amount}`,
      title: "Delete Payment",
      description: `Are you sure you want to delete this payment of ₹${payment.amount.toLocaleString()}? This will also update the customer ledger.`,
      dependentRecords: ['Customer ledger entries']
    });
  };

  const handleEdit = (payment: any) => {
    setEditingPayment(payment);
    setPaymentData({
      ...payment,
      payment_date: payment.payment_date ? new Date(payment.payment_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setEditingPayment(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const getPaymentModeLabel = (mode: string) => {
    const modes = {
      cash: 'Cash',
      cheque: 'Cheque',
      bank_transfer: 'Bank Transfer',
      upi: 'UPI',
      card: 'Card'
    };
    return modes[mode as keyof typeof modes] || mode;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Payment Management</h2>
          <p className="text-muted-foreground">Record and track payments received</p>
        </div>
        {roleAccess.canRecordPayments() && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleNew}>
                <Plus className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingPayment ? 'Edit Payment' : 'Record New Payment'}
              </DialogTitle>
              <DialogDescription>
                {editingPayment ? 'Update payment details' : 'Enter payment information received from customer'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="order_id">Order *</Label>
                <Select value={paymentData.order_id} onValueChange={(value) => setPaymentData({...paymentData, order_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select order" />
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

              <div>
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({...paymentData, amount: parseFloat(e.target.value) || 0})}
                  placeholder="Enter amount"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <Label htmlFor="payment_date">Payment Date *</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={paymentData.payment_date}
                  onChange={(e) => setPaymentData({...paymentData, payment_date: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="payment_mode">Payment Mode *</Label>
                <Select value={paymentData.payment_mode} onValueChange={(value) => setPaymentData({...paymentData, payment_mode: value})}>
                  <SelectTrigger>
                    <SelectValue />
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

              {paymentData.payment_mode === 'cheque' && (
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

              {(paymentData.payment_mode === 'bank_transfer' || paymentData.payment_mode === 'upi') && (
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
                <Label htmlFor="reference">Reference</Label>
                <Input
                  id="reference"
                  value={paymentData.reference}
                  onChange={(e) => setPaymentData({...paymentData, reference: e.target.value})}
                  placeholder="Enter reference"
                />
              </div>

              <div>
                <Label htmlFor="receipt">Receipt Upload</Label>
                <Input
                  id="receipt"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="note">Note</Label>
                <Textarea
                  id="note"
                  value={paymentData.note}
                  onChange={(e) => setPaymentData({...paymentData, note: e.target.value})}
                  placeholder="Enter any additional notes"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSavePayment} disabled={loading}>
                {loading ? 'Saving...' : (editingPayment ? 'Update Payment' : 'Record Payment')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>
            Track all payments received from customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {new Date(payment.payment_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{payment.orders?.order_no}</TableCell>
                    <TableCell>{payment.orders?.customers?.name}</TableCell>
                    <TableCell>₹{payment.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getPaymentModeLabel(payment.payment_mode)}
                      </Badge>
                    </TableCell>
                    <TableCell>{payment.reference || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={payment.verified_by ? "default" : "outline"}>
                        {payment.verified_by ? 'Verified' : 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ActionButtons
                        onEdit={roleAccess.canRecordPayments() ? () => handleEdit(payment) : undefined}
                        onView={payment.receipt_path ? () => {
                          const { data } = supabase.storage
                            .from('documents')
                            .getPublicUrl(payment.receipt_path);
                          window.open(data.publicUrl, '_blank');
                        } : undefined}
                        onDelete={canDelete ? () => handleDelete(payment) : undefined}
                        showEdit={roleAccess.canRecordPayments()}
                        showView={!!payment.receipt_path}
                        showDelete={canDelete}
                        editDisabledReason={!roleAccess.canRecordPayments() ? "Insufficient permissions to edit payments" : undefined}
                        deleteDisabledReason={!canDelete ? "Only administrators can delete payments" : undefined}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {payments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      No payments recorded yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <DeleteDialog />
    </div>
  );
}