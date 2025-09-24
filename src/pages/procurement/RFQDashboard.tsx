import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/DashboardLayout';
import RFQManager from '@/components/RFQManager';
import { FileText, Plus, Search, Eye, Edit, BarChart3, Clock, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface RFQ {
  id: string;
  rfq_no: string;
  title: string;
  description: string;
  due_date: string;
  status: string;
  created_at: string;
  created_by: string;
  rfq_vendors: Array<{ vendor_id: string; status: string }>;
  vendor_quotations: Array<{
    id: string;
    vendor_id: string;
    total_amount: number;
    status: string;
    vendors: { name: string };
  }>;
}

interface VendorApplication {
  id: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  status: string;
  application_date: string;
  business_type: string;
}

export default function RFQDashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [vendorApplications, setVendorApplications] = useState<VendorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [rfqDialogOpen, setRfqDialogOpen] = useState(false);
  const [selectedRfqId, setSelectedRfqId] = useState<string | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (profile?.branch_id) {
      fetchRFQs();
      fetchVendorApplications();
    }
  }, [profile?.branch_id]);

  const fetchRFQs = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('rfqs')
        .select(`
          id, rfq_no, title, description, due_date, status, created_at, created_by,
          rfq_vendors (
            vendor_id, status
          ),
          vendor_quotations (
            id, vendor_id, total_amount, status,
            vendors (name)
          )
        `)
        .eq('branch_id', profile?.branch_id)
        .order('created_at', { ascending: false });

      setRfqs(data || []);
    } catch (error) {
      console.error('Error fetching RFQs:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch RFQs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchVendorApplications = async () => {
    try {
      const { data } = await supabase
        .from('vendor_applications')
        .select('*')
        .eq('branch_id', profile?.branch_id)
        .eq('status', 'pending')
        .order('application_date', { ascending: false });

      setVendorApplications(data || []);
    } catch (error) {
      console.error('Error fetching vendor applications:', error);
    }
  };

  const handleApproveVendor = async (applicationId: string, applicationData: VendorApplication) => {
    try {
      // Create vendor record
      const { data: vendor, error: vendorError } = await supabase
        .from('vendors')
        .insert({
          name: applicationData.company_name,
          contact_person: applicationData.contact_person,
          email: applicationData.email,
          phone: applicationData.phone,
          city: applicationData.city,
          state: applicationData.state,
          branch_id: profile?.branch_id,
          business_type: applicationData.business_type,
          is_active: true
        })
        .select('id')
        .single();

      if (vendorError) throw vendorError;

      // Update application status
      const { error: updateError } = await supabase
        .from('vendor_applications')
        .update({
          status: 'approved',
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      // Create vendor user account (this would trigger an edge function to send credentials)
      await supabase.functions.invoke('create-vendor-user', {
        body: {
          email: applicationData.email,
          vendor_id: vendor.id,
          company_name: applicationData.company_name
        }
      });

      toast({
        title: 'Success',
        description: 'Vendor approved and account created successfully!',
      });

      fetchVendorApplications();
    } catch (error: any) {
      console.error('Error approving vendor:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve vendor',
        variant: 'destructive',
      });
    }
  };

  const handleRejectVendor = async (applicationId: string) => {
    try {
      const { error } = await supabase
        .from('vendor_applications')
        .update({
          status: 'rejected',
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Vendor application rejected',
      });

      fetchVendorApplications();
    } catch (error: any) {
      console.error('Error rejecting vendor:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject vendor',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'closed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <FileText className="h-4 w-4" />;
      case 'sent': return <Clock className="h-4 w-4" />;
      case 'closed': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const filteredRfqs = rfqs.filter(rfq => {
    const matchesSearch = rfq.rfq_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rfq.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || rfq.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    totalRfqs: rfqs.length,
    activeRfqs: rfqs.filter(r => r.status === 'sent').length,
    pendingApplications: vendorApplications.length,
    quotationsReceived: rfqs.reduce((sum, rfq) => sum + rfq.vendor_quotations.length, 0)
  };

  return (
    <DashboardLayout title="RFQ Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">RFQ Management</h1>
            <p className="text-muted-foreground">
              Manage Request for Quotations and vendor applications
            </p>
          </div>
          <Button onClick={() => setRfqDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create RFQ
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total RFQs</p>
                  <p className="text-2xl font-bold">{stats.totalRfqs}</p>
                </div>
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active RFQs</p>
                  <p className="text-2xl font-bold">{stats.activeRfqs}</p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Applications</p>
                  <p className="text-2xl font-bold">{stats.pendingApplications}</p>
                </div>
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Quotations Received</p>
                  <p className="text-2xl font-bold">{stats.quotationsReceived}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="rfqs" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="rfqs">RFQ Management</TabsTrigger>
            <TabsTrigger value="applications">
              Vendor Applications ({stats.pendingApplications})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rfqs" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Request for Quotations</CardTitle>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search RFQs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 w-64"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading RFQs...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>RFQ No.</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Vendors</TableHead>
                        <TableHead>Responses</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRfqs.map((rfq) => (
                        <TableRow key={rfq.id}>
                          <TableCell className="font-medium">{rfq.rfq_no}</TableCell>
                          <TableCell>{rfq.title}</TableCell>
                          <TableCell>{format(new Date(rfq.due_date), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>{rfq.rfq_vendors.length}</TableCell>
                          <TableCell>{rfq.vendor_quotations.length}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(rfq.status)}>
                              {getStatusIcon(rfq.status)}
                              <span className="ml-1 capitalize">{rfq.status}</span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedRfqId(rfq.id);
                                  setRfqDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  // Navigate to comparison view
                                  window.location.href = `/procurement/rfq/${rfq.id}/compare`;
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="applications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Vendor Applications</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company Name</TableHead>
                      <TableHead>Contact Person</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Business Type</TableHead>
                      <TableHead>Application Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendorApplications.map((application) => (
                      <TableRow key={application.id}>
                        <TableCell className="font-medium">{application.company_name}</TableCell>
                        <TableCell>{application.contact_person}</TableCell>
                        <TableCell>{application.email}</TableCell>
                        <TableCell>{application.city}, {application.state}</TableCell>
                        <TableCell>{application.business_type}</TableCell>
                        <TableCell>{format(new Date(application.application_date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleApproveVendor(application.id, application)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRejectVendor(application.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* RFQ Manager Dialog */}
        <RFQManager
          open={rfqDialogOpen}
          onOpenChange={setRfqDialogOpen}
          rfqId={selectedRfqId}
          onSuccess={() => {
            fetchRFQs();
            setSelectedRfqId(undefined);
          }}
        />
      </div>
    </DashboardLayout>
  );
}