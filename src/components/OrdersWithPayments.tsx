import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, FileText, Upload, Download, Eye, DollarSign, Receipt, FileBarChart, FileSpreadsheet } from "lucide-react";
import { OrderManager } from "./OrderManager";
import { PaymentManager } from "./PaymentManager";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { OrderPaymentSummaryReport } from "./reports/OrderPaymentSummaryReport";
import { exportToPDF, exportOrderPaymentToExcel } from "@/lib/reportExports";
import { useRef } from "react";

interface OrderWithPayments {
  id: string;
  order_no: string;
  customer_id: string;
  total_amount: number;
  status: string;
  created_at: string;
  po_pdf_path?: string;
  customers?: {
    name: string;
    company?: string;
  };
  total_paid: number;
  balance_due: number;
  payment_status: 'pending' | 'partial' | 'paid';
}

export function OrdersWithPayments() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const roleAccess = useRoleAccess();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderWithPayments[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportOrderData, setReportOrderData] = useState<any>(null);
  const [reportPayments, setReportPayments] = useState<any[]>([]);
  const [branchData, setBranchData] = useState<any>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile?.branch_id) {
      fetchOrdersWithPayments();
      fetchBranchData();
    }
  }, [profile?.branch_id]);

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

  // Real-time subscription for order updates
  useEffect(() => {
    if (!profile?.branch_id) return;

    const channel = supabase
      .channel('orders-payments-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `branch_id=eq.${profile.branch_id}`
        },
        () => {
          fetchOrdersWithPayments();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `branch_id=eq.${profile.branch_id}`
        },
        () => {
          fetchOrdersWithPayments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.branch_id]);

  const fetchOrdersWithPayments = async () => {
    try {
      setLoading(true);
      
      // Fetch orders with payment summaries
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          customers (name, company)
        `)
        .eq('branch_id', profile?.branch_id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // For each order, calculate payment status
      const ordersWithPayments = await Promise.all(
        (ordersData || []).map(async (order) => {
          const { data: payments, error: paymentsError } = await supabase
            .from('payments')
            .select('amount')
            .eq('order_id', order.id);

          if (paymentsError) {
            console.error('Error fetching payments for order:', order.id, paymentsError);
          }

          const totalPaid = (payments || []).reduce((sum, payment) => sum + payment.amount, 0);
          const balanceDue = order.total_amount - totalPaid;
          
          let paymentStatus: 'pending' | 'partial' | 'paid' = 'pending';
          if (totalPaid >= order.total_amount) {
            paymentStatus = 'paid';
          } else if (totalPaid > 0) {
            paymentStatus = 'partial';
          }

          return {
            ...order,
            total_paid: totalPaid,
            balance_due: Math.max(0, balanceDue),
            payment_status: paymentStatus
          };
        })
      );

      setOrders(ordersWithPayments);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilePreview = async (filePath: string) => {
    try {
      const { data } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);
      
      window.open(data.publicUrl, '_blank');
      
      toast({
        title: "Success",
        description: "File opened in new tab",
      });
    } catch (error) {
      console.error('Error opening file:', error);
      toast({
        title: "Error",
        description: "Failed to open file",
        variant: "destructive",
      });
    }
  };

  const handleFileDownload = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "File downloaded successfully",
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const handleGenerateReport = async (orderId: string) => {
    try {
      // Fetch order details
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          customers (name, company, email, phone)
        `)
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      // Fetch payments for this order
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('order_id', orderId)
        .order('payment_date', { ascending: false });

      if (paymentsError) throw paymentsError;

      setReportOrderData({
        ...orderData,
        customer_name: orderData.customers?.name,
        customer_company: orderData.customers?.company,
        order_date: orderData.created_at
      });
      setReportPayments(paymentsData || []);
      setIsReportDialogOpen(true);
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    
    const filename = `Order-Payment-Summary-${reportOrderData?.order_no}`;
    const success = await exportToPDF(reportRef.current, { filename });
    
    if (success) {
      toast({
        title: "Success",
        description: "Report exported to PDF successfully!",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to export PDF",
        variant: "destructive",
      });
    }
  };

  const handleExportExcel = () => {
    if (!reportOrderData || !reportPayments) return;

    const filename = `Order-Payment-Summary-${reportOrderData.order_no}`;
    const success = exportOrderPaymentToExcel(reportOrderData, reportPayments, { filename });
    
    if (success) {
      toast({
        title: "Success",
        description: "Report exported to Excel successfully!",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to export Excel",
        variant: "destructive",
      });
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-100 text-green-800">Paid</Badge>;
      case 'partial':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Partial</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (order.customers?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (order.customers?.company || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading orders...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Orders Management</h2>
          <p className="text-muted-foreground">Manage orders with attachments and payments</p>
        </div>
        {roleAccess.canAccessSales() && (
          <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Order
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Order</DialogTitle>
              <DialogDescription>
                Create a new order with attachments and payment recording
              </DialogDescription>
            </DialogHeader>
            <OrderManager onSuccess={() => {
              setIsOrderDialogOpen(false);
              fetchOrdersWithPayments();
            }} />
          </DialogContent>
        </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Orders</CardTitle>
              <CardDescription>View and manage all orders with payment status</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order No</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Order Amount</TableHead>
                  <TableHead>Paid Amount</TableHead>
                  <TableHead>Balance Due</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>Order Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Attachments</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.order_no}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.customers?.name}</div>
                        {order.customers?.company && (
                          <div className="text-sm text-muted-foreground">{order.customers.company}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>₹{order.total_amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <span className="text-green-600 font-medium">
                        ₹{order.total_paid.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${order.balance_due > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        ₹{order.balance_due.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      {getPaymentStatusBadge(order.payment_status)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(order.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {order.po_pdf_path && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFilePreview(order.po_pdf_path!)}
                              title="Preview Purchase Order"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFileDownload(order.po_pdf_path!, `PO-${order.order_no}.pdf`)}
                              title="Download Purchase Order"
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        {!order.po_pdf_path && (
                          <span className="text-xs text-muted-foreground">No attachments</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                         {roleAccess.canRecordPayments() && (
                           <Dialog>
                             <DialogTrigger asChild>
                               <Button variant="outline" size="sm">
                                 <DollarSign className="h-3 w-3 mr-1" />
                                 Payments
                               </Button>
                             </DialogTrigger>
                           <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                             <DialogHeader>
                               <DialogTitle>Payment Management - {order.order_no}</DialogTitle>
                               <DialogDescription>
                                 Record and manage payments for this order
                               </DialogDescription>
                             </DialogHeader>
                             <PaymentManager 
                               orderId={order.id} 
                               customerId={order.customer_id}
                               onSuccess={() => fetchOrdersWithPayments()}
                             />
                           </DialogContent>
                         </Dialog>
                         )}
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => handleGenerateReport(order.id)}
                         >
                           <FileBarChart className="h-3 w-3 mr-1" />
                           Report
                         </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center">
                      No orders found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Report Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Payment Summary Report</DialogTitle>
            <DialogDescription>
              View and export payment summary for order {reportOrderData?.order_no}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex gap-2 mb-4">
            <Button onClick={handleExportPDF} variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button onClick={handleExportExcel} variant="outline">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>

          {reportOrderData && (
            <OrderPaymentSummaryReport
              ref={reportRef}
              orderData={reportOrderData}
              payments={reportPayments}
              branchData={branchData}
              totalPaid={reportPayments.reduce((sum, p) => sum + p.amount, 0)}
              balanceDue={reportOrderData.total_amount - reportPayments.reduce((sum, p) => sum + p.amount, 0)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}