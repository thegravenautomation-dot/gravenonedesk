import React, { useState, useEffect } from 'react';
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Filter, FileText, Users, DollarSign, TrendingUp, Package, Wifi } from "lucide-react";
import { ActionButtons } from "@/components/common/ActionButtons";
import { DeleteConfirmationDialog } from "@/components/common/DeleteConfirmationDialog";
import { QuotationEditDialog } from "@/components/QuotationEditDialog";
import { InvoiceEditDialog } from "@/components/InvoiceEditDialog";
import { OrderEditDialog } from "@/components/OrderEditDialog";
import { OrderManager } from "@/components/OrderManager";
import { PaymentManager } from "@/components/PaymentManager";
import { OrdersWithPayments } from "@/components/OrdersWithPayments";
import { EditableQuotationView } from "@/components/EditableQuotationView";
import { checkPermissions, getActionButtons } from "@/lib/permissions";
import { logDelete } from "@/lib/auditLogger";

export default function EnhancedSalesDashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [quotations, setQuotations] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false);
  
  // Dialog states
  const [quotationEditDialog, setQuotationEditDialog] = useState({ open: false, id: null });
  const [invoiceEditDialog, setInvoiceEditDialog] = useState({ open: false, id: null });
  const [orderEditDialog, setOrderEditDialog] = useState({ open: false, id: null });
  const [quotationViewDialog, setQuotationViewDialog] = useState({ open: false, id: null });
  const [deleteDialog, setDeleteDialog] = useState({ 
    open: false, 
    type: null as 'quotation' | 'invoice' | 'order' | 'customer' | null, 
    id: null as string | null, 
    name: ""
  });
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("quotations");

  useEffect(() => {
    if (profile?.branch_id) {
      fetchAllData();
      setupRealTimeSubscriptions();
    }
    
    return () => {
      // Cleanup subscriptions on unmount
      supabase.removeAllChannels();
    };
  }, [profile?.branch_id]);

  const setupRealTimeSubscriptions = () => {
    if (!profile?.branch_id) return;

    const quotationsChannel = supabase
      .channel('quotations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quotations',
          filter: `branch_id=eq.${profile.branch_id}`,
        },
        (payload) => {
          console.log('Quotations real-time update:', payload);
          fetchQuotations();
          toast({
            title: "Real-time Update",
            description: "Quotations data has been updated",
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices',
          filter: `branch_id=eq.${profile.branch_id}`,
        },
        (payload) => {
          console.log('Invoices real-time update:', payload);
          fetchInvoices();
          toast({
            title: "Real-time Update",
            description: "Invoices data has been updated",
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `branch_id=eq.${profile.branch_id}`,
        },
        (payload) => {
          console.log('Orders real-time update:', payload);
          fetchOrders();
          toast({
            title: "Real-time Update",
            description: "Orders data has been updated",
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsRealTimeConnected(true);
          console.log('Real-time subscriptions active');
        } else if (status === 'CHANNEL_ERROR') {
          setIsRealTimeConnected(false);
          console.error('Real-time subscription error');
        }
      });
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchQuotations(),
        fetchInvoices(),
        fetchOrders(),
        fetchCustomers()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuotations = async () => {
    try {
      const { data, error } = await supabase
        .from('quotations')
        .select(`
          *,
          customers (name, company)
        `)
        .eq('branch_id', profile?.branch_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotations(data || []);
    } catch (error) {
      console.error('Error fetching quotations:', error);
    }
  };

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customers (name, company)
        `)
        .eq('branch_id', profile?.branch_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customers (name, company)
        `)
        .eq('branch_id', profile?.branch_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('branch_id', profile?.branch_id)
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id || !deleteDialog.type) return;

    try {
      let error;
      const tableName = deleteDialog.type === 'customer' ? 'customers' : 
                       deleteDialog.type === 'quotation' ? 'quotations' : 
                       deleteDialog.type === 'order' ? 'orders' : 'invoices';

      // Get the record data before deletion for audit logging
      const { data: recordData } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', deleteDialog.id)
        .single();

      // Delete the record
      ({ error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', deleteDialog.id));

      if (error) throw error;

      // Log the deletion
      if (recordData && profile?.id && profile?.branch_id) {
        await logDelete(
          profile.id,
          profile.branch_id,
          deleteDialog.type as any,
          deleteDialog.id,
          recordData
        );
      }

      toast({
        title: "Success",
        description: `${deleteDialog.type} deleted successfully`,
      });

      // Refresh data
      if (deleteDialog.type === 'quotation') fetchQuotations();
      else if (deleteDialog.type === 'invoice') fetchInvoices();
      else if (deleteDialog.type === 'order') fetchOrders();
      else if (deleteDialog.type === 'customer') fetchCustomers();

      setDeleteDialog({ open: false, type: null, id: null, name: "" });
    } catch (error) {
      console.error('Error deleting record:', error);
      toast({
        title: "Error",
        description: "Failed to delete record",
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft': return 'secondary';
      case 'sent': return 'default';
      case 'approved': 
      case 'paid': return 'default';
      case 'rejected':
      case 'cancelled': return 'destructive';
      case 'pending': return 'outline';
      default: return 'secondary';
    }
  };

  const renderQuotationsTab = () => {
    const filteredQuotations = quotations.filter(q => {
      const matchesSearch = q.quotation_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (q.customers?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search quotations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setQuotationEditDialog({ open: true, id: null })}>
            <Plus className="h-4 w-4 mr-2" />
            New Quotation
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quotation No</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Valid Till</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredQuotations.map((quotation) => {
              const actionButtons = getActionButtons(
                profile?.role as any,
                'quotation',
                quotation.status,
                quotation.created_by === profile?.id
              );

              return (
                <TableRow key={quotation.id}>
                  <TableCell className="font-medium">{quotation.quotation_no}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{quotation.customers?.name}</div>
                      {quotation.customers?.company && (
                        <div className="text-sm text-muted-foreground">{quotation.customers.company}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(quotation.status)}>
                      {quotation.status}
                    </Badge>
                  </TableCell>
                  <TableCell>₹{quotation.total_amount?.toLocaleString()}</TableCell>
                  <TableCell>
                    {quotation.valid_till ? new Date(quotation.valid_till).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>{new Date(quotation.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <ActionButtons
                      showEdit={actionButtons.showEdit}
                      showDelete={actionButtons.showDelete}
                      showView={true}
                      editDisabled={!actionButtons.showEdit}
                      deleteDisabled={!actionButtons.showDelete}
                      editDisabledReason={actionButtons.editDisabledReason}
                      deleteDisabledReason={actionButtons.deleteDisabledReason}
                      onView={() => setQuotationViewDialog({ open: true, id: quotation.id })}
                      onEdit={() => setQuotationEditDialog({ open: true, id: quotation.id })}
                      onDelete={() => setDeleteDialog({
                        open: true,
                        type: 'quotation',
                        id: quotation.id,
                        name: quotation.quotation_no
                      })}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderInvoicesTab = () => {
    const filteredInvoices = invoices.filter(i => {
      const matchesSearch = i.invoice_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (i.customers?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || i.payment_status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
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
          <Button onClick={() => setInvoiceEditDialog({ open: true, id: null })}>
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice No</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.map((invoice) => {
              const actionButtons = getActionButtons(
                profile?.role as any,
                'invoice',
                invoice.payment_status
              );

              return (
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
                  <TableCell>
                    <Badge variant={invoice.invoice_type === 'proforma' ? 'secondary' : 'default'}>
                      {invoice.invoice_type === 'proforma' ? 'Proforma' : 'Regular'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(invoice.payment_status)}>
                      {invoice.payment_status}
                    </Badge>
                  </TableCell>
                  <TableCell>₹{invoice.total_amount?.toLocaleString()}</TableCell>
                  <TableCell>
                    {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>
                    <ActionButtons
                      showEdit={actionButtons.showEdit}
                      showDelete={actionButtons.showDelete}
                      editDisabled={!actionButtons.showEdit}
                      deleteDisabled={!actionButtons.showDelete}
                      editDisabledReason={actionButtons.editDisabledReason}
                      deleteDisabledReason={actionButtons.deleteDisabledReason}
                      onEdit={() => setInvoiceEditDialog({ open: true, id: invoice.id })}
                      onDelete={() => setDeleteDialog({
                        open: true,
                        type: 'invoice',
                        id: invoice.id,
                        name: invoice.invoice_no
                      })}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderOrdersTab = () => {
    const filteredOrders = orders.filter(o => {
      const matchesSearch = o.order_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (o.customers?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setOrderEditDialog({ open: true, id: null })}>
            <Plus className="h-4 w-4 mr-2" />
            New Order
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order No</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Delivery Date</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map((order) => {
              const actionButtons = getActionButtons(
                profile?.role as any,
                'purchase_order',
                order.status,
                order.customer_id === profile?.id
              );

              return (
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
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(order.status)}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>₹{order.total_amount?.toLocaleString()}</TableCell>
                  <TableCell>
                    {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <ActionButtons
                      showEdit={actionButtons.showEdit}
                      showDelete={actionButtons.showDelete}
                      editDisabled={!actionButtons.showEdit}
                      deleteDisabled={!actionButtons.showDelete}
                      editDisabledReason={actionButtons.editDisabledReason}
                      deleteDisabledReason={actionButtons.deleteDisabledReason}
                      onEdit={() => setOrderEditDialog({ open: true, id: order.id })}
                      onDelete={() => setDeleteDialog({
                        open: true,
                        type: 'order',
                        id: order.id,
                        name: order.order_no
                      })}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderCustomersTab = () => {
    const filteredCustomers = customers.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (c.company || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Customer
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.map((customer) => {
              const actionButtons = getActionButtons(
                profile?.role as any,
                'customer',
                undefined,
                customer.created_by === profile?.id
              );

              return (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.company || '-'}</TableCell>
                  <TableCell>{customer.phone || '-'}</TableCell>
                  <TableCell>{customer.email || '-'}</TableCell>
                  <TableCell>{customer.city || '-'}</TableCell>
                  <TableCell>
                    <ActionButtons
                      showEdit={actionButtons.showEdit}
                      showDelete={actionButtons.showDelete}
                      editDisabled={!actionButtons.showEdit}
                      deleteDisabled={!actionButtons.showDelete}
                      editDisabledReason={actionButtons.editDisabledReason}
                      deleteDisabledReason={actionButtons.deleteDisabledReason}
                      onEdit={() => {
                        // TODO: Open customer edit dialog
                        toast({ title: "Customer edit coming soon" });
                      }}
                      onDelete={() => setDeleteDialog({
                        open: true,
                        type: 'customer',
                        id: customer.id,
                        name: customer.name
                      })}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  // Stats calculations
  const stats = {
    totalQuotations: quotations.length,
    totalInvoices: invoices.length,
    totalCustomers: customers.length,
    totalRevenue: invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0),
    pendingAmount: invoices
      .filter(inv => inv.payment_status === 'pending')
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0),
  };

  if (loading) {
    return (
      <DashboardLayout title="Sales Dashboard" subtitle="Enhanced with Edit & Delete functionality">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Sales Dashboard" 
      subtitle="Enhanced with comprehensive Edit & Delete functionality"
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Quotations</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalQuotations}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalInvoices}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{(stats.totalRevenue / 100000).toFixed(1)}L</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="quotations">Quotations</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="enhanced-orders">Orders+</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
          </TabsList>

          <TabsContent value="quotations" className="space-y-4">
            {renderQuotationsTab()}
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            {renderOrdersTab()}
          </TabsContent>

          <TabsContent value="enhanced-orders" className="space-y-4">
            <OrdersWithPayments />
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <PaymentManager />
          </TabsContent>

          <TabsContent value="invoices" className="space-y-4">
            {renderInvoicesTab()}
          </TabsContent>

          <TabsContent value="customers" className="space-y-4">
            {renderCustomersTab()}
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Dialogs */}
      <QuotationEditDialog
        open={quotationEditDialog.open}
        onOpenChange={(open) => setQuotationEditDialog({ open, id: null })}
        quotationId={quotationEditDialog.id}
        onSuccess={() => {
          fetchQuotations();
          setQuotationEditDialog({ open: false, id: null });
        }}
      />

      <InvoiceEditDialog
        open={invoiceEditDialog.open}
        onOpenChange={(open) => setInvoiceEditDialog({ open, id: null })}
        invoiceId={invoiceEditDialog.id}
        onSuccess={() => {
          fetchInvoices();
          setInvoiceEditDialog({ open: false, id: null });
        }}
      />

      <OrderEditDialog
        open={orderEditDialog.open}
        onOpenChange={(open) => setOrderEditDialog({ open, id: null })}
        orderId={orderEditDialog.id}
        onSuccess={() => {
          fetchOrders();
          setOrderEditDialog({ open: false, id: null });
        }}
      />

      {/* Quotation View Dialog */}
      {quotationViewDialog.open && quotationViewDialog.id && (
        <EditableQuotationView
          quotationId={quotationViewDialog.id}
          onClose={() => setQuotationViewDialog({ open: false, id: null })}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        onConfirm={handleDelete}
        title={`Delete ${deleteDialog.type}`}
        description={`Are you sure you want to delete this ${deleteDialog.type}? This action cannot be undone.`}
        itemName={deleteDialog.name}
      />
    </DashboardLayout>
  );
}