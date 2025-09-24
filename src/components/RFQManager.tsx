import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Send, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface RFQItem {
  sr_no: number;
  item_name: string;
  description: string;
  specification: string;
  quantity: number;
  unit: string;
  hsn_code: string;
  gst_rate: number;
  required_delivery_date: string;
}

interface Vendor {
  id: string;
  name: string;
  email: string;
  contact_person: string;
  city: string;
}

interface RFQManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rfqId?: string;
  onSuccess?: () => void;
}

export default function RFQManager({ open, onOpenChange, rfqId, onSuccess }: RFQManagerProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [showVendorSelection, setShowVendorSelection] = useState(false);

  const [rfqData, setRfqData] = useState({
    rfq_no: '',
    title: '',
    description: '',
    due_date: '',
    terms_conditions: 'Standard terms and conditions apply.',
    status: 'draft'
  });

  const [items, setItems] = useState<RFQItem[]>([
    {
      sr_no: 1,
      item_name: '',
      description: '',
      specification: '',
      quantity: 1,
      unit: 'Nos',
      hsn_code: '',
      gst_rate: 18,
      required_delivery_date: ''
    }
  ]);

  useEffect(() => {
    if (open) {
      if (rfqId) {
        fetchRFQData();
      } else {
        resetForm();
        generateRFQNumber();
      }
      fetchVendors();
    }
  }, [open, rfqId]);

  const fetchVendors = async () => {
    try {
      const { data } = await supabase
        .from('vendors')
        .select('id, name, email, contact_person, city')
        .eq('branch_id', profile?.branch_id)
        .eq('is_active', true)
        .order('name');

      setVendors(data || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const generateRFQNumber = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const { data } = await supabase
        .from('rfqs')
        .select('rfq_no')
        .like('rfq_no', `RFQ-${currentYear}-%`)
        .order('created_at', { ascending: false })
        .limit(1);

      let nextNumber = 1;
      if (data && data.length > 0) {
        const lastNumber = parseInt(data[0].rfq_no.split('-')[2]);
        nextNumber = lastNumber + 1;
      }

      const rfqNo = `RFQ-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;
      setRfqData(prev => ({ ...prev, rfq_no: rfqNo }));
    } catch (error) {
      console.error('Error generating RFQ number:', error);
    }
  };

  const fetchRFQData = async () => {
    try {
      const { data: rfq } = await supabase
        .from('rfqs')
        .select(`
          *, 
          rfq_items (*),
          rfq_vendors (vendor_id)
        `)
        .eq('id', rfqId)
        .single();

      if (rfq) {
        setRfqData({
          rfq_no: rfq.rfq_no,
          title: rfq.title,
          description: rfq.description || '',
          due_date: rfq.due_date,
          terms_conditions: rfq.terms_conditions || '',
          status: rfq.status
        });

        if (rfq.rfq_items) {
          setItems(rfq.rfq_items.map((item: any) => ({
            sr_no: item.sr_no,
            item_name: item.item_name,
            description: item.description || '',
            specification: item.specification || '',
            quantity: item.quantity,
            unit: item.unit,
            hsn_code: item.hsn_code || '',
            gst_rate: item.gst_rate,
            required_delivery_date: item.required_delivery_date || ''
          })));
        }

        if (rfq.rfq_vendors) {
          setSelectedVendors(rfq.rfq_vendors.map((rv: any) => rv.vendor_id));
        }
      }
    } catch (error) {
      console.error('Error fetching RFQ data:', error);
    }
  };

  const resetForm = () => {
    setRfqData({
      rfq_no: '',
      title: '',
      description: '',
      due_date: '',
      terms_conditions: 'Standard terms and conditions apply.',
      status: 'draft'
    });
    setItems([{
      sr_no: 1,
      item_name: '',
      description: '',
      specification: '',
      quantity: 1,
      unit: 'Nos',
      hsn_code: '',
      gst_rate: 18,
      required_delivery_date: ''
    }]);
    setSelectedVendors([]);
  };

  const addItem = () => {
    const newItem: RFQItem = {
      sr_no: items.length + 1,
      item_name: '',
      description: '',
      specification: '',
      quantity: 1,
      unit: 'Nos',
      hsn_code: '',
      gst_rate: 18,
      required_delivery_date: ''
    };
    setItems([...items, newItem]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      // Renumber the items
      const renumberedItems = newItems.map((item, i) => ({
        ...item,
        sr_no: i + 1
      }));
      setItems(renumberedItems);
    }
  };

  const updateItem = (index: number, field: keyof RFQItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSave = async (sendToVendors = false) => {
    try {
      setLoading(true);

      // Validate required fields
      if (!rfqData.title || !rfqData.due_date) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields',
          variant: 'destructive',
        });
        return;
      }

      // Validate items
      for (const item of items) {
        if (!item.item_name || item.quantity <= 0) {
          toast({
            title: 'Validation Error',
            description: 'Please fill in all item details',
            variant: 'destructive',
          });
          return;
        }
      }

      if (sendToVendors && selectedVendors.length === 0) {
        toast({
          title: 'Validation Error',
          description: 'Please select at least one vendor',
          variant: 'destructive',
        });
        return;
      }

      const rfqPayload = {
        ...rfqData,
        created_by: user?.id,
        branch_id: profile?.branch_id,
        status: sendToVendors ? 'sent' : 'draft'
      };

      let savedRFQId = rfqId;

      if (rfqId) {
        // Update existing RFQ
        const { error: rfqError } = await supabase
          .from('rfqs')
          .update(rfqPayload)
          .eq('id', rfqId);

        if (rfqError) throw rfqError;

        // Delete existing items
        await supabase.from('rfq_items').delete().eq('rfq_id', rfqId);
      } else {
        // Create new RFQ
        const { data: newRFQ, error: rfqError } = await supabase
          .from('rfqs')
          .insert(rfqPayload)
          .select('id')
          .single();

        if (rfqError) throw rfqError;
        savedRFQId = newRFQ.id;
      }

      // Insert items
      const itemsPayload = items.map(item => ({
        ...item,
        rfq_id: savedRFQId
      }));

      const { error: itemsError } = await supabase
        .from('rfq_items')
        .insert(itemsPayload);

      if (itemsError) throw itemsError;

      // Handle vendor assignments
      if (sendToVendors) {
        // Delete existing vendor assignments
        if (rfqId) {
          await supabase.from('rfq_vendors').delete().eq('rfq_id', rfqId);
        }

        // Insert new vendor assignments
        const vendorAssignments = selectedVendors.map(vendorId => ({
          rfq_id: savedRFQId,
          vendor_id: vendorId
        }));

        const { error: vendorError } = await supabase
          .from('rfq_vendors')
          .insert(vendorAssignments);

        if (vendorError) throw vendorError;

        // Send notifications (this would call an edge function)
        await supabase.functions.invoke('send-rfq-notifications', {
          body: {
            rfq_id: savedRFQId,
            vendor_ids: selectedVendors
          }
        });
      }

      toast({
        title: 'Success',
        description: sendToVendors ? 'RFQ sent to vendors successfully!' : 'RFQ saved successfully!',
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error saving RFQ:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save RFQ',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {rfqId ? 'Edit RFQ' : 'Create New RFQ'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* RFQ Details */}
            <Card>
              <CardHeader>
                <CardTitle>RFQ Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>RFQ Number</Label>
                    <Input value={rfqData.rfq_no} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date *</Label>
                    <Input
                      type="date"
                      value={rfqData.due_date}
                      onChange={(e) => setRfqData(prev => ({ ...prev, due_date: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    value={rfqData.title}
                    onChange={(e) => setRfqData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="RFQ Title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={rfqData.description}
                    onChange={(e) => setRfqData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="RFQ Description"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Terms & Conditions</Label>
                  <Textarea
                    value={rfqData.terms_conditions}
                    onChange={(e) => setRfqData(prev => ({ ...prev, terms_conditions: e.target.value }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Items
                  <Button onClick={addItem} size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sr.</TableHead>
                        <TableHead>Item Name *</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Specification</TableHead>
                        <TableHead>Qty *</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>HSN Code</TableHead>
                        <TableHead>GST %</TableHead>
                        <TableHead>Delivery Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.sr_no}</TableCell>
                          <TableCell>
                            <Input
                              value={item.item_name}
                              onChange={(e) => updateItem(index, 'item_name', e.target.value)}
                              placeholder="Item name"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.description}
                              onChange={(e) => updateItem(index, 'description', e.target.value)}
                              placeholder="Description"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.specification}
                              onChange={(e) => updateItem(index, 'specification', e.target.value)}
                              placeholder="Specification"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                              min="0"
                              step="0.01"
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={item.unit}
                              onValueChange={(value) => updateItem(index, 'unit', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Nos">Nos</SelectItem>
                                <SelectItem value="Kg">Kg</SelectItem>
                                <SelectItem value="Ltr">Ltr</SelectItem>
                                <SelectItem value="Mtr">Mtr</SelectItem>
                                <SelectItem value="Set">Set</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.hsn_code}
                              onChange={(e) => updateItem(index, 'hsn_code', e.target.value)}
                              placeholder="HSN Code"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.gst_rate}
                              onChange={(e) => updateItem(index, 'gst_rate', parseFloat(e.target.value) || 0)}
                              min="0"
                              max="100"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              value={item.required_delivery_date}
                              onChange={(e) => updateItem(index, 'required_delivery_date', e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(index)}
                              disabled={items.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end space-x-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => handleSave(false)} disabled={loading}>
                Save as Draft
              </Button>
              <Button
                onClick={() => setShowVendorSelection(true)}
                disabled={loading}
                className="bg-primary"
              >
                <Send className="h-4 w-4 mr-1" />
                Send to Vendors
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Vendor Selection Dialog */}
      <Dialog open={showVendorSelection} onOpenChange={setShowVendorSelection}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Select Vendors</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Select</TableHead>
                  <TableHead>Vendor Name</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedVendors.includes(vendor.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedVendors([...selectedVendors, vendor.id]);
                          } else {
                            setSelectedVendors(selectedVendors.filter(id => id !== vendor.id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{vendor.name}</TableCell>
                    <TableCell>{vendor.contact_person}</TableCell>
                    <TableCell>{vendor.email}</TableCell>
                    <TableCell>{vendor.city}</TableCell>
                    <TableCell>{vendor.city}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-end space-x-4">
              <Button variant="outline" onClick={() => setShowVendorSelection(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                setShowVendorSelection(false);
                handleSave(true);
              }} disabled={loading || selectedVendors.length === 0}>
                Send RFQ ({selectedVendors.length} vendors)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}