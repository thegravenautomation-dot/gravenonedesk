import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { QuotationManager } from "./QuotationManager";
import { OrderManager } from "./OrderManager";
import { EditableQuotationView } from "./EditableQuotationView";
import { 
  User, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Edit, 
  FileText, 
  ShoppingCart, 
  CreditCard, 
  History,
  MessageSquare,
  MessageCircle
} from "lucide-react";

interface LeadProfileProps {
  leadId: string;
  onClose: () => void;
}

interface LeadData {
  id: string;
  lead_no: string;
  title: string;
  description?: string;
  status: string;
  value?: number;
  created_at: string;
  customers?: {
    id: string;
    name: string;
    company?: string;
    email?: string;
    phone?: string;
    gstin?: string;
    whatsapp_number?: string;
    designation?: string;
    billing_address?: string;
    shipping_address?: string;
    address?: string;
  };
}

interface CustomerData {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  gstin?: string;
  whatsapp_number?: string;
  designation?: string;
  billing_address?: string;
  shipping_address?: string;
  address?: string;
}

export function LeadProfile({ leadId, onClose }: LeadProfileProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [leadData, setLeadData] = useState<LeadData | null>(null);
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [isQuotationDialogOpen, setIsQuotationDialogOpen] = useState(false);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(null);
  const [isQuotationViewOpen, setIsQuotationViewOpen] = useState(false);
  
  const [editForm, setEditForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    gstin: "",
    whatsapp_number: "",
    designation: "",
    billing_address: "",
    shipping_address: "",
  });

  useEffect(() => {
    if (leadId && profile?.branch_id) {
      fetchLeadData();
      fetchQuotations();
      fetchOrders();
      fetchInvoices();
    }
  }, [leadId, profile?.branch_id]);

  const fetchLeadData = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          customers (*)
        `)
        .eq('id', leadId)
        .eq('branch_id', profile?.branch_id)
        .single();

      if (error) throw error;
      
      setLeadData(data);
      if (data.customers) {
        setCustomerData(data.customers);
        setEditForm({
          name: data.customers.name || "",
          company: data.customers.company || "",
          email: data.customers.email || "",
          phone: data.customers.phone || "",
          gstin: data.customers.gstin || "",
          whatsapp_number: data.customers.whatsapp_number || "",
          designation: data.customers.designation || "",
          billing_address: data.customers.billing_address || data.customers.address || "",
          shipping_address: data.customers.shipping_address || data.customers.address || "",
        });
      }
    } catch (error) {
      console.error('Error fetching lead data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch lead data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchQuotations = async () => {
    try {
      const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .eq('lead_id', leadId)
        .eq('branch_id', profile?.branch_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotations(data || []);
    } catch (error) {
      console.error('Error fetching quotations:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', leadData?.customers?.id)
        .eq('branch_id', profile?.branch_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('customer_id', leadData?.customers?.id)
        .eq('branch_id', profile?.branch_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  const handleUpdateCustomer = async () => {
    try {
      if (!customerData) return;

      const { error } = await supabase
        .from('customers')
        .update({
          name: editForm.name,
          company: editForm.company,
          email: editForm.email,
          phone: editForm.phone,
          gstin: editForm.gstin,
          whatsapp_number: editForm.whatsapp_number,
          designation: editForm.designation,
          billing_address: editForm.billing_address,
          shipping_address: editForm.shipping_address,
        })
        .eq('id', customerData.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Customer details updated successfully",
      });
      
      setIsEditingCustomer(false);
      fetchLeadData();
    } catch (error) {
      console.error('Error updating customer:', error);
      toast({
        title: "Error",
        description: "Failed to update customer details",
        variant: "destructive",
      });
    }
  };

  const handleViewQuotation = (quotationId: string) => {
    setSelectedQuotationId(quotationId);
    setIsQuotationViewOpen(true);
  };

  const handleConvertToOrder = (quotationId: string) => {
    setSelectedQuotationId(quotationId);
    setIsOrderDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new': return 'bg-blue-500';
      case 'contacted': return 'bg-yellow-500';
      case 'qualified': return 'bg-green-500';
      case 'proposal': return 'bg-purple-500';
      case 'won': return 'bg-emerald-500';
      case 'lost': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  if (!leadData) {
    return <div className="flex items-center justify-center p-8">Lead not found</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{leadData.title}</h1>
          <p className="text-muted-foreground">Lead #{leadData.lead_no}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(leadData.status)}>
            {leadData.status}
          </Badge>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="quotations">Quotations</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Lead Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Lead Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <p className="font-medium">{leadData.title}</p>
                </div>
                <div>
                  <Label>Description</Label>
                  <p className="text-sm text-muted-foreground">
                    {leadData.description || "No description provided"}
                  </p>
                </div>
                <div>
                  <Label>Value</Label>
                  <p className="font-medium">
                    {leadData.value ? `₹${leadData.value.toLocaleString()}` : "Not specified"}
                  </p>
                </div>
                <div>
                  <Label>Created Date</Label>
                  <p className="text-sm">{new Date(leadData.created_at).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Customer Information
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingCustomer(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {customerData ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Name</Label>
                        <p className="font-medium">{customerData.name}</p>
                      </div>
                      <div>
                        <Label>Company</Label>
                        <p className="text-sm">{customerData.company || "N/A"}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Email</Label>
                        <p className="text-sm flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {customerData.email || "N/A"}
                        </p>
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <p className="text-sm flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {customerData.phone || "N/A"}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>WhatsApp</Label>
                        <p className="text-sm flex items-center gap-2">
                          <MessageCircle className="h-4 w-4" />
                          {customerData.whatsapp_number || "N/A"}
                        </p>
                      </div>
                      <div>
                        <Label>Designation</Label>
                        <p className="text-sm">{customerData.designation || "N/A"}</p>
                      </div>
                    </div>
                    <div>
                      <Label>GST Number</Label>
                      <p className="text-sm">{customerData.gstin || "N/A"}</p>
                    </div>
                    <div>
                      <Label>Billing Address</Label>
                      <p className="text-sm">{customerData.billing_address || customerData.address || "N/A"}</p>
                    </div>
                    <div>
                      <Label>Shipping Address</Label>
                      <p className="text-sm">{customerData.shipping_address || customerData.address || "N/A"}</p>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">No customer information available</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-4">
            <Dialog open={isQuotationDialogOpen} onOpenChange={setIsQuotationDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Create Quotation
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Quotation</DialogTitle>
                  <DialogDescription>
                    Create a new quotation for this lead
                  </DialogDescription>
                </DialogHeader>
                <QuotationManager 
                  leadId={leadId}
                  customerId={customerData?.id}
                  onSuccess={() => {
                    setIsQuotationDialogOpen(false);
                    fetchQuotations();
                  }}
                />
              </DialogContent>
            </Dialog>
            
            <Button variant="outline">
              <MessageSquare className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="quotations">
          <Card>
            <CardHeader>
              <CardTitle>Quotations</CardTitle>
              <CardDescription>All quotations for this lead</CardDescription>
            </CardHeader>
            <CardContent>
              {quotations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quotation No</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Valid Till</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotations.map((quotation) => (
                      <TableRow key={quotation.id}>
                        <TableCell className="font-medium">{quotation.quotation_no}</TableCell>
                        <TableCell>{new Date(quotation.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{quotation.status}</Badge>
                        </TableCell>
                        <TableCell>₹{quotation.total_amount?.toLocaleString()}</TableCell>
                        <TableCell>{quotation.valid_till ? new Date(quotation.valid_till).toLocaleDateString() : "N/A"}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleViewQuotation(quotation.id)}>
              View
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleConvertToOrder(quotation.id)}>
              Convert to Order
            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No quotations found for this lead
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Orders</CardTitle>
              <CardDescription>All purchase orders from this customer</CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order No</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Delivery Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.order_no}</TableCell>
                        <TableCell>{new Date(order.order_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{order.status}</Badge>
                        </TableCell>
                        <TableCell>₹{order.total_amount?.toLocaleString()}</TableCell>
                        <TableCell>{order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : "TBD"}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">View</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No orders found for this customer
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>All invoices for this customer</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice No</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoice_no}</TableCell>
                        <TableCell>{new Date(invoice.invoice_date).toLocaleDateString()}</TableCell>
                        <TableCell>₹{invoice.total_amount?.toLocaleString()}</TableCell>
                        <TableCell>₹{invoice.paid_amount?.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{invoice.payment_status}</Badge>
                        </TableCell>
                        <TableCell>{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : "N/A"}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">View</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No invoices found for this customer
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>Payment records for this customer</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">
                Payment tracking feature coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Activity History</CardTitle>
              <CardDescription>All activities related to this lead</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">
                Activity history feature coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditingCustomer} onOpenChange={setIsEditingCustomer}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Customer Information</DialogTitle>
            <DialogDescription>
              Update customer details for better lead management
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={editForm.company}
                onChange={(e) => setEditForm({...editForm, company: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({...editForm, email: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="whatsapp">WhatsApp Number</Label>
              <Input
                id="whatsapp"
                value={editForm.whatsapp_number}
                onChange={(e) => setEditForm({...editForm, whatsapp_number: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                value={editForm.designation}
                onChange={(e) => setEditForm({...editForm, designation: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="gstin">GST Number</Label>
              <Input
                id="gstin"
                value={editForm.gstin}
                onChange={(e) => setEditForm({...editForm, gstin: e.target.value})}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="billing_address">Billing Address</Label>
              <Textarea
                id="billing_address"
                value={editForm.billing_address}
                onChange={(e) => setEditForm({...editForm, billing_address: e.target.value})}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="shipping_address">Shipping Address</Label>
              <Textarea
                id="shipping_address"
                value={editForm.shipping_address}
                onChange={(e) => setEditForm({...editForm, shipping_address: e.target.value})}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsEditingCustomer(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateCustomer}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quotation View Dialog */}
      {isQuotationViewOpen && selectedQuotationId && (
        <Dialog open={isQuotationViewOpen} onOpenChange={setIsQuotationViewOpen}>
          <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden">
            <EditableQuotationView 
              quotationId={selectedQuotationId}
              onClose={() => {
                setIsQuotationViewOpen(false);
                setSelectedQuotationId(null);
                fetchQuotations();
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}