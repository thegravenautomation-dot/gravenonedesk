import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { FileText, Clock, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { format } from 'date-fns';

interface RFQ {
  id: string;
  rfq_no: string;
  title: string;
  description: string;
  due_date: string;
  status: string;
  created_at: string;
  rfq_vendors: Array<{
    status: string;
    invited_at: string;
  }>;
  vendor_quotations: Array<{
    id: string;
    quotation_no: string;
    status: string;
    total_amount: number;
    submission_date: string;
  }>;
}

export default function VendorPortal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorInfo, setVendorInfo] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchVendorInfo();
      fetchRFQs();
    }
  }, [user]);

  const fetchVendorInfo = async () => {
    try {
      const { data } = await supabase
        .from('vendor_users')
        .select(`
          vendor_id,
          vendors (
            id, name, email, contact_person
          )
        `)
        .eq('user_id', user?.id)
        .single();

      setVendorInfo(data);
    } catch (error) {
      console.error('Error fetching vendor info:', error);
    }
  };

  const fetchRFQs = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('rfqs')
        .select(`
          id, rfq_no, title, description, due_date, status, created_at,
          rfq_vendors!inner (
            status, invited_at,
            vendor_id
          ),
          vendor_quotations (
            id, quotation_no, status, total_amount, submission_date
          )
        `)
        .eq('rfq_vendors.vendor_id', vendorInfo?.vendor_id)
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'submitted': return 'bg-green-100 text-green-800';
      case 'selected': return 'bg-emerald-100 text-emerald-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <Clock className="h-4 w-4" />;
      case 'submitted': return <CheckCircle className="h-4 w-4" />;
      case 'selected': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <AlertCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const handleSubmitQuotation = (rfqId: string) => {
    navigate(`/vendor/quotation/${rfqId}`);
  };

  const handleViewQuotation = (quotationId: string) => {
    navigate(`/vendor/quotation/view/${quotationId}`);
  };

  if (!vendorInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground mb-4">
                You are not registered as a vendor or your application is still pending approval.
              </p>
              <Button onClick={() => navigate('/vendor/register')}>
                Register as Vendor
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Vendor Portal</h1>
          <p className="text-muted-foreground">
            Welcome back, {vendorInfo?.vendors?.contact_person}
          </p>
        </div>

        <Tabs defaultValue="rfqs" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="rfqs">Active RFQs</TabsTrigger>
            <TabsTrigger value="quotations">My Quotations</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="rfqs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Request for Quotations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading RFQs...</div>
                ) : rfqs.filter(rfq => rfq.status === 'sent' && !rfq.vendor_quotations.length).length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No active RFQs available</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>RFQ No.</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rfqs
                        .filter(rfq => rfq.status === 'sent' && !rfq.vendor_quotations.length)
                        .map((rfq) => (
                          <TableRow key={rfq.id}>
                            <TableCell className="font-medium">{rfq.rfq_no}</TableCell>
                            <TableCell>{rfq.title}</TableCell>
                            <TableCell>{format(new Date(rfq.due_date), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor('invited')}>
                                Invited
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                onClick={() => handleSubmitQuotation(rfq.id)}
                                className="flex items-center gap-1"
                              >
                                <Plus className="h-4 w-4" />
                                Submit Quote
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quotations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Submitted Quotations</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quotation No.</TableHead>
                      <TableHead>RFQ</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Submitted Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rfqs
                      .filter(rfq => rfq.vendor_quotations.length > 0)
                      .map((rfq) =>
                        rfq.vendor_quotations.map((quotation) => (
                          <TableRow key={quotation.id}>
                            <TableCell className="font-medium">{quotation.quotation_no}</TableCell>
                            <TableCell>{rfq.rfq_no}</TableCell>
                            <TableCell>₹{quotation.total_amount.toLocaleString()}</TableCell>
                            <TableCell>{format(new Date(quotation.submission_date), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(quotation.status)}>
                                {getStatusIcon(quotation.status)}
                                <span className="ml-1 capitalize">{quotation.status}</span>
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewQuotation(quotation.id)}
                              >
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>RFQ History</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>RFQ No.</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Date Received</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rfqs.map((rfq) => (
                      <TableRow key={rfq.id}>
                        <TableCell className="font-medium">{rfq.rfq_no}</TableCell>
                        <TableCell>{rfq.title}</TableCell>
                        <TableCell>{format(new Date(rfq.rfq_vendors[0]?.invited_at), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{format(new Date(rfq.due_date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(rfq.vendor_quotations[0]?.status || 'invited')}>
                            {rfq.vendor_quotations.length > 0 ? rfq.vendor_quotations[0].status : 'invited'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}