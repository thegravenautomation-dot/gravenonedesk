import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  DollarSign, 
  FileText, 
  Plus, 
  Download, 
  Calendar, 
  TrendingUp,
  CreditCard,
  Receipt,
  Building2,
  Printer,
  IndianRupee,
  Calculator
} from "lucide-react";

interface Invoice {
  id: string;
  invoice_no: string;
  customer_id: string;
  total_amount: number;
  tax_amount: number;
  subtotal: number;
  payment_status: string;
  invoice_date: string;
  due_date: string;
  created_at: string;
  customers?: {
    name: string;
    company?: string;
    gstin?: string;
  };
}

export default function AccountsDashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);

  const [newInvoice, setNewInvoice] = useState({
    customer_id: "",
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
    due_date: "",
  });

  const [customers, setCustomers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingAmount: 0,
    paidAmount: 0,
    totalInvoices: 0,
    thisMonthRevenue: 0,
    gstCollected: 0,
  });

  useEffect(() => {
    fetchInvoices();
    fetchCustomers();
  }, [profile?.branch_id]);

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customers (name, company, gstin)
        `)
        .eq('branch_id', profile?.branch_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const invoicesData = data || [];
      setInvoices(invoicesData);

      // Calculate stats
      const totalRevenue = invoicesData.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      const pendingAmount = invoicesData
        .filter(inv => inv.payment_status === 'pending')
        .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      const paidAmount = invoicesData
        .filter(inv => inv.payment_status === 'paid')
        .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      const gstCollected = invoicesData.reduce((sum, inv) => sum + (inv.tax_amount || 0), 0);

      // This month revenue
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const thisMonthRevenue = invoicesData
        .filter(inv => new Date(inv.invoice_date) >= thisMonth)
        .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

      setStats({
        totalRevenue,
        pendingAmount,
        paidAmount,
        totalInvoices: invoicesData.length,
        thisMonthRevenue,
        gstCollected,
      });
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast({
        title: "Error",
        description: "Failed to fetch invoices",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, company, gstin')
        .eq('branch_id', profile?.branch_id)
        .order('name', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleCreateInvoice = async () => {
    try {
      if (!newInvoice.customer_id || newInvoice.total_amount <= 0) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      // Generate invoice number
      const { count } = await supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('branch_id', profile?.branch_id);

      const invoiceNumber = `INV${String((count || 0) + 1).padStart(4, '0')}`;

      const { error } = await supabase
        .from('invoices')
        .insert({
          invoice_no: invoiceNumber,
          customer_id: newInvoice.customer_id,
          subtotal: newInvoice.subtotal,
          tax_amount: newInvoice.tax_amount,
          total_amount: newInvoice.total_amount,
          due_date: newInvoice.due_date,
          payment_status: 'pending',
          branch_id: profile?.branch_id,
          invoice_date: new Date().toISOString().split('T')[0],
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Invoice created successfully",
      });

      setIsNewInvoiceOpen(false);
      setNewInvoice({
        customer_id: "",
        subtotal: 0,
        tax_amount: 0,
        total_amount: 0,
        due_date: "",
      });
      fetchInvoices();
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      });
    }
  };

  const calculateGST = (amount: number) => {
    // Using 18% GST as standard
    const gst = amount * 0.18;
    setNewInvoice(prev => ({
      ...prev,
      subtotal: amount,
      tax_amount: gst,
      total_amount: amount + gst,
    }));
  };

  const generateGSTReport = () => {
    const gstr1Data = invoices
      .filter(inv => inv.payment_status === 'paid')
      .map(inv => ({
        invoice_no: inv.invoice_no,
        date: inv.invoice_date,
        customer_gstin: inv.customers?.gstin || 'N/A',
        taxable_value: inv.subtotal,
        gst_amount: inv.tax_amount,
        total_value: inv.total_amount,
      }));

    // Convert to CSV and download
    const csvContent = [
      ['Invoice No', 'Date', 'Customer GSTIN', 'Taxable Value', 'GST Amount', 'Total Value'],
      ...gstr1Data.map(row => [
        row.invoice_no,
        row.date,
        row.customer_gstin,
        row.taxable_value,
        row.gst_amount,
        row.total_value,
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GSTR1_Report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "GSTR-1 report downloaded successfully",
    });
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoice_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (invoice.customers?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.payment_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DashboardLayout 
      title="Accounts & Finance"
      subtitle={`GST-Compliant Invoicing (GST: 07AAKCG1025G1ZX)`}
    >
      <div className="space-y-6">
        {/* Financial Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{(stats.totalRevenue / 100000).toFixed(1)}L</div>
              <p className="text-xs text-muted-foreground">All time revenue</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{(stats.pendingAmount / 100000).toFixed(1)}L</div>
              <p className="text-xs text-muted-foreground">Outstanding invoices</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">GST Collected</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{(stats.gstCollected / 100000).toFixed(1)}L</div>
              <p className="text-xs text-muted-foreground">GST: 07AAKCG1025G1ZX</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{(stats.thisMonthRevenue / 100000).toFixed(1)}L</div>
              <p className="text-xs text-muted-foreground">Current month revenue</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalInvoices}</div>
              <p className="text-xs text-muted-foreground">All invoices</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{(stats.paidAmount / 100000).toFixed(1)}L</div>
              <p className="text-xs text-muted-foreground">Collected payments</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Dialog open={isNewInvoiceOpen} onOpenChange={setIsNewInvoiceOpen}>
            <DialogTrigger asChild>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Plus className="h-5 w-5 text-primary" />
                    Create Invoice
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Generate GST-compliant invoice</p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create New Invoice</DialogTitle>
                <DialogDescription>
                  Generate a GST-compliant invoice for your customer
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <Select value={newInvoice.customer_id} onValueChange={(value) => setNewInvoice({ ...newInvoice, customer_id: value })}>
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Subtotal (₹)</Label>
                    <Input
                      type="number"
                      value={newInvoice.subtotal}
                      onChange={(e) => calculateGST(parseFloat(e.target.value) || 0)}
                      placeholder="Enter amount"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>GST @ 18% (₹)</Label>
                    <Input
                      type="number"
                      value={newInvoice.tax_amount}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Total Amount (₹)</Label>
                  <Input
                    type="number"
                    value={newInvoice.total_amount}
                    readOnly
                    className="bg-muted font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={newInvoice.due_date}
                    onChange={(e) => setNewInvoice({ ...newInvoice, due_date: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button onClick={handleCreateInvoice} className="flex-1">
                    Create Invoice
                  </Button>
                  <Button variant="outline" onClick={() => setIsNewInvoiceOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={generateGSTReport}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Download className="h-5 w-5 text-green-600" />
                GSTR-1 Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Download GST return data</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.open('https://einvoice.gst.gov.in/', '_blank')}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                E-Invoice Portal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">GST Portal Integration</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => alert('Bulk Print - Coming Soon!')}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Printer className="h-5 w-5 text-purple-600" />
                Print Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Bulk print and export</p>
            </CardContent>
          </Card>
        </div>

        {/* Invoices Management */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
            <CardDescription>Manage your invoices and payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="max-w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>GST</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_no}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{invoice.customers?.name}</div>
                          {invoice.customers?.company && (
                            <div className="text-sm text-muted-foreground">{invoice.customers.company}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{new Date(invoice.invoice_date).toLocaleDateString()}</TableCell>
                      <TableCell>₹{invoice.total_amount?.toLocaleString()}</TableCell>
                      <TableCell>₹{invoice.tax_amount?.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(invoice.payment_status)}>
                          {invoice.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => alert('Print Invoice - Coming Soon!')}>
                          <Printer className="h-3 w-3 mr-1" />
                          Print
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4">
                        No invoices found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}