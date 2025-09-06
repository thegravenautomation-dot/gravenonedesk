import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { QuotationTemplate } from "./QuotationTemplate";
import { Edit, History, Download, FileText, ShoppingCart } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Timeline, TimelineContent, TimelineItem, TimelinePoint } from "@/components/ui/timeline";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EditableQuotationViewProps {
  quotationId: string;
  onClose: () => void;
  onEdit?: () => void;
}

export function EditableQuotationView({ quotationId, onClose, onEdit }: EditableQuotationViewProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [quotationData, setQuotationData] = useState<any>(null);
  const [quotationItems, setQuotationItems] = useState<any[]>([]);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [branchData, setBranchData] = useState<any>(null);
  const [customerData, setCustomerData] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editData, setEditData] = useState<{ valid_till: string; terms: string }>({ valid_till: "", terms: "" });
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (quotationId && profile?.branch_id) {
      fetchQuotationData();
      fetchRevisions();
    }
  }, [quotationId, profile?.branch_id]);

  const fetchQuotationData = async () => {
    try {
      // Fetch quotation with customer info
      const { data: quotation, error: quotationError } = await supabase
        .from('quotations')
        .select(`
          *,
          customers (*)
        `)
        .eq('id', quotationId)
        .eq('branch_id', profile?.branch_id)
        .single();

      if (quotationError) throw quotationError;

      // Fetch quotation items
      const { data: items, error: itemsError } = await supabase
        .from('quotation_items')
        .select('*')
        .eq('quotation_id', quotationId)
        .order('sr_no');

      if (itemsError) throw itemsError;

      // Fetch branch data
      const { data: branch, error: branchError } = await supabase
        .from('branches')
        .select('*')
        .eq('id', profile?.branch_id)
        .single();

      if (branchError) throw branchError;

      setQuotationData(quotation);
      setQuotationItems(items || []);
      setBranchData(branch);
      setCustomerData(quotation.customers);
    } catch (error) {
      console.error('Error fetching quotation data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch quotation data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRevisions = async () => {
    try {
      const { data, error } = await supabase
        .from('quotation_revisions')
        .select('*')
        .eq('quotation_id', quotationId)
        .order('revision_no', { ascending: false });

      if (error) throw error;
      setRevisions(data || []);
    } catch (error) {
      console.error('Error fetching revisions:', error);
    }
  };

  const saveRevision = async (note: string) => {
    try {
      const nextRevisionNo = (revisions[0]?.revision_no || 0) + 1;
      
      const { error } = await supabase
        .from('quotation_revisions')
        .insert({
          quotation_id: quotationId,
          revision_no: nextRevisionNo,
          snapshot: {
            quotation: quotationData,
            items: quotationItems,
            timestamp: new Date().toISOString()
          },
          note,
          created_by: profile?.id
        });

      if (error) throw error;
      
      await fetchRevisions();
      
      toast({
        title: "Success",
        description: "Revision saved successfully",
      });
    } catch (error) {
      console.error('Error saving revision:', error);
      toast({
        title: "Error",
        description: "Failed to save revision",
        variant: "destructive",
      });
    }
  };

  const convertToProformaInvoice = async () => {
    try {
      setLoading(true);
      
      // Generate proforma invoice number
      const { data: lastInvoice } = await supabase
        .from('invoices')
        .select('invoice_no')
        .eq('branch_id', profile?.branch_id)
        .eq('invoice_type', 'proforma')
        .order('created_at', { ascending: false })
        .limit(1);

      let nextNumber = 1;
      if (lastInvoice && lastInvoice.length > 0) {
        const lastNumber = lastInvoice[0].invoice_no.match(/\d+$/);
        if (lastNumber) {
          nextNumber = parseInt(lastNumber[0]) + 1;
        }
      }

      const invoiceNo = `PI-${new Date().getFullYear()}-${String(nextNumber).padStart(4, '0')}`;

      // Create proforma invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_no: invoiceNo,
          invoice_type: 'proforma',
          customer_id: quotationData.customer_id,
          branch_id: profile?.branch_id,
          subtotal: quotationData.subtotal,
          tax_amount: quotationData.tax_amount,
          total_amount: quotationData.total_amount,
          payment_status: 'pending',
          invoice_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items from quotation items
      const invoiceItems = quotationItems.map(item => ({
        invoice_id: invoice.id,
        sr_no: item.sr_no,
        item_name: item.item_name,
        description: item.description,
        hsn_code: item.hsn_code,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        total_amount: item.total_amount,
        gst_rate: item.gst_rate,
        gst_amount: item.gst_amount
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      toast({
        title: "Success",
        description: `Proforma Invoice ${invoiceNo} created successfully`,
      });

      onClose();
    } catch (error) {
      console.error('Error converting to proforma invoice:', error);
      toast({
        title: "Error",
        description: "Failed to convert to proforma invoice",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const convertToOrder = async () => {
    try {
      setLoading(true);
      
      // Generate order number
      const { data: lastOrder } = await supabase
        .from('orders')
        .select('order_no')
        .eq('branch_id', profile?.branch_id)
        .order('created_at', { ascending: false })
        .limit(1);

      let nextNumber = 1;
      if (lastOrder && lastOrder.length > 0) {
        const lastNumber = lastOrder[0].order_no.match(/\d+$/);
        if (lastNumber) {
          nextNumber = parseInt(lastNumber[0]) + 1;
        }
      }

      const orderNo = `ORD-${new Date().getFullYear()}-${String(nextNumber).padStart(4, '0')}`;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_no: orderNo,
          quotation_id: quotationId,
          customer_id: quotationData.customer_id,
          branch_id: profile?.branch_id,
          subtotal: quotationData.subtotal,
          tax_amount: quotationData.tax_amount,
          total_amount: quotationData.total_amount,
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items from quotation items
      const orderItems = quotationItems.map(item => ({
        order_id: order.id,
        sr_no: item.sr_no,
        item_name: item.item_name,
        description: item.description,
        hsn_code: item.hsn_code,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        total_amount: item.total_amount,
        gst_rate: item.gst_rate,
        gst_amount: item.gst_amount
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast({
        title: "Success",
        description: "Quotation converted to order successfully",
      });

      onClose();
    } catch (error) {
      console.error('Error converting to order:', error);
      toast({
        title: "Error",
        description: "Failed to convert quotation to order",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    try {
      const content = printRef.current?.innerHTML;
      if (!content) return;
      const printWindow = window.open('', '', 'width=1024,height=768');
      if (!printWindow) return;
      printWindow.document.write(`<!doctype html><html><head><title>Quotation ${quotationData.quotation_no}</title><meta name="viewport" content="width=device-width, initial-scale=1"/><style>@page{size:A4;margin:12mm;}body{font-family:ui-sans-serif,system-ui;}</style></head><body>${content}</body></html>`);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } catch (e) {
      console.error('Print failed', e);
      toast({ title: 'Error', description: 'Failed to open print dialog', variant: 'destructive' });
    }
  };

  const saveEdits = async () => {
    try {
      await saveRevision('Edited quotation details');
      const { error } = await supabase
        .from('quotations')
        .update({
          valid_till: editData.valid_till || null,
          terms: editData.terms
        })
        .eq('id', quotationId);
      if (error) throw error;
      await fetchQuotationData();
      setIsEditMode(false);
      toast({ title: 'Saved', description: 'Quotation updated' });
    } catch (error) {
      console.error('Save edits error', error);
      toast({ title: 'Error', description: 'Failed to save changes', variant: 'destructive' });
    }
  };

  if (!quotationData) {
    return <div className="flex items-center justify-center p-8">Quotation not found</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quotation {quotationData.quotation_no}</h1>
          <p className="text-muted-foreground">Customer: {customerData?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{quotationData.status}</Badge>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      <Tabs defaultValue="view" className="w-full">
        <TabsList>
          <TabsTrigger value="view">View</TabsTrigger>
          <TabsTrigger value="history">Edit History</TabsTrigger>
        </TabsList>

        <TabsContent value="view" className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              {!isEditMode ? (
                <>
                  <Button variant="outline" onClick={() => { setIsEditMode(true); setEditData({ valid_till: (quotationData.valid_till ? new Date(quotationData.valid_till).toISOString().slice(0,10) : ''), terms: quotationData.terms || '' }); }}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Quotation
                  </Button>
                  <Button variant="outline" onClick={handlePrint}>
                    <Download className="h-4 w-4 mr-2" />
                    Print / PDF
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setIsEditMode(false)}>
                    Cancel
                  </Button>
                  <Button onClick={saveEdits}>
                    Save Changes
                  </Button>
                </>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={convertToOrder} disabled={loading}>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Convert to Order
              </Button>
              <Button variant="outline" onClick={convertToProformaInvoice} disabled={loading}>
                <FileText className="h-4 w-4 mr-2" />
                Convert to Proforma Invoice
              </Button>
            </div>
          </div>

          {!isEditMode ? (
            <Card>
              <CardContent className="p-0">
                <div ref={printRef}>
                  <QuotationTemplate
                    quotationData={quotationData}
                    items={quotationItems}
                    branchData={branchData}
                    customerData={customerData}
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Edit Quotation</CardTitle>
                <CardDescription>Update key details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="valid_till">Valid Till</Label>
                    <Input id="valid_till" type="date" value={editData.valid_till} onChange={(e) => setEditData({ ...editData, valid_till: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="terms">Terms</Label>
                    <Input id="terms" value={editData.terms} onChange={(e) => setEditData({ ...editData, terms: e.target.value })} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Edit History
              </CardTitle>
              <CardDescription>
                Track all changes made to this quotation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {revisions.length > 0 ? (
                <Timeline>
                  {revisions.map((revision, index) => (
                    <TimelineItem key={revision.id}>
                      <TimelinePoint />
                      <TimelineContent>
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">Revision {revision.revision_no}</h4>
                            <p className="text-sm text-muted-foreground">
                              {new Date(revision.created_at).toLocaleString()}
                            </p>
                            {revision.note && (
                              <p className="text-sm mt-1">{revision.note}</p>
                            )}
                          </div>
                          <Button variant="outline" size="sm">
                            View Snapshot
                          </Button>
                        </div>
                      </TimelineContent>
                    </TimelineItem>
                  ))}
                </Timeline>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No edit history available
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}