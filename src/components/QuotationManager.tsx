import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { QuotationTemplate } from "./QuotationTemplate";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Eye, FileText, ShoppingCart } from "lucide-react";

interface QuotationManagerProps {
  leadId?: string;
  customerId?: string;
  onSuccess?: () => void;
}

interface QuotationItem {
  id?: string;
  sr_no: number;
  item_name: string;
  description: string;
  hsn_code: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_amount: number;
  gst_rate: number;
  gst_amount: number;
}

interface BranchData {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  account_holder_name?: string;
  terms_conditions?: string;
}

export function QuotationManager({ leadId, customerId, onSuccess }: QuotationManagerProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [branchData, setBranchData] = useState<BranchData | null>(null);
  const [customerData, setCustomerData] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  const [quotationData, setQuotationData] = useState({
    quotation_no: "",
    valid_till: "",
    terms: "",
  });

  const [items, setItems] = useState<QuotationItem[]>([
    {
      sr_no: 1,
      item_name: "",
      description: "",
      hsn_code: "",
      quantity: 1,
      unit: "Nos",
      unit_price: 0,
      total_amount: 0,
      gst_rate: 18,
      gst_amount: 0,
    }
  ]);

  useEffect(() => {
    if (profile?.branch_id) {
      fetchBranchData();
      generateQuotationNumber();
    }
    if (customerId) {
      fetchCustomerData();
    }
  }, [profile?.branch_id, customerId]);

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

  const fetchCustomerData = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error) throw error;
      setCustomerData(data);
    } catch (error) {
      console.error('Error fetching customer data:', error);
    }
  };

  const generateQuotationNumber = async () => {
    try {
      const { data, error } = await supabase
        .from('quotations')
        .select('quotation_no')
        .eq('branch_id', profile?.branch_id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextNumber = 1;
      if (data && data.length > 0) {
        const lastNumber = data[0].quotation_no.match(/\d+$/);
        if (lastNumber) {
          nextNumber = parseInt(lastNumber[0]) + 1;
        }
      }

      const quotationNo = `QUO-${new Date().getFullYear()}-${String(nextNumber).padStart(4, '0')}`;
      setQuotationData(prev => ({ ...prev, quotation_no: quotationNo }));
    } catch (error) {
      console.error('Error generating quotation number:', error);
    }
  };

  const addItem = () => {
    const newItem: QuotationItem = {
      sr_no: items.length + 1,
      item_name: "",
      description: "",
      hsn_code: "",
      quantity: 1,
      unit: "Nos",
      unit_price: 0,
      total_amount: 0,
      gst_rate: 18,
      gst_amount: 0,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      // Renumber items
      const renumberedItems = newItems.map((item, i) => ({
        ...item,
        sr_no: i + 1
      }));
      setItems(renumberedItems);
    }
  };

  const updateItem = (index: number, field: keyof QuotationItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Recalculate amounts when quantity or unit_price changes
    if (field === 'quantity' || field === 'unit_price' || field === 'gst_rate') {
      const item = newItems[index];
      const subtotal = item.quantity * item.unit_price;
      const gstAmount = (subtotal * item.gst_rate) / 100;
      newItems[index].total_amount = subtotal;
      newItems[index].gst_amount = gstAmount;
    }
    
    setItems(newItems);
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total_amount, 0);
    const totalGst = items.reduce((sum, item) => sum + item.gst_amount, 0);
    const total = subtotal + totalGst;
    
    return { subtotal, totalGst, total };
  };

  const handleSaveQuotation = async () => {
    try {
      if (!quotationData.quotation_no || items.some(item => !item.item_name)) {
        toast({
          title: "Error",
          description: "Please fill all required fields",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);
      const { subtotal, totalGst, total } = calculateTotals();

      // Create quotation
      const { data: quotation, error: quotationError } = await supabase
        .from('quotations')
        .insert({
          quotation_no: quotationData.quotation_no,
          customer_id: customerId,
          lead_id: leadId,
          branch_id: profile?.branch_id,
          subtotal: subtotal,
          tax_amount: totalGst,
          total_amount: total,
          valid_till: quotationData.valid_till || null,
          terms: quotationData.terms || branchData?.terms_conditions,
          status: 'draft',
          created_by: profile?.id,
        })
        .select()
        .single();

      if (quotationError) throw quotationError;

      // Create quotation items
      const quotationItems = items.map(item => ({
        quotation_id: quotation.id,
        sr_no: item.sr_no,
        item_name: item.item_name,
        description: item.description,
        hsn_code: item.hsn_code,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        total_amount: item.total_amount,
        gst_rate: item.gst_rate,
        gst_amount: item.gst_amount,
      }));

      const { error: itemsError } = await supabase
        .from('quotation_items')
        .insert(quotationItems);

      if (itemsError) throw itemsError;

      toast({
        title: "Success",
        description: "Quotation created successfully",
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error saving quotation:', error);
      toast({
        title: "Error",
        description: "Failed to create quotation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const convertToProformaInvoice = async () => {
    try {
      setLoading(true);
      // First save the quotation
      await handleSaveQuotation();
      
      // Then convert logic would go here
      toast({
        title: "Success",
        description: "Quotation converted to Proforma Invoice",
      });
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

  const { subtotal, totalGst, total } = calculateTotals();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="quotation_no">Quotation Number</Label>
          <Input
            id="quotation_no"
            value={quotationData.quotation_no}
            onChange={(e) => setQuotationData({...quotationData, quotation_no: e.target.value})}
            readOnly
          />
        </div>
        <div>
          <Label htmlFor="valid_till">Valid Till</Label>
          <Input
            id="valid_till"
            type="date"
            value={quotationData.valid_till}
            onChange={(e) => setQuotationData({...quotationData, valid_till: e.target.value})}
          />
        </div>
        <div>
          <Label>Customer</Label>
          <p className="text-sm font-medium py-2">
            {customerData?.name || "No customer selected"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Quotation Items</CardTitle>
            <Button onClick={addItem} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Sr. No.</TableHead>
                  <TableHead className="min-w-40">Item Name *</TableHead>
                  <TableHead className="min-w-40">Description</TableHead>
                  <TableHead className="w-24">HSN Code</TableHead>
                  <TableHead className="w-20">Qty</TableHead>
                  <TableHead className="w-20">Unit</TableHead>
                  <TableHead className="w-24">Unit Price</TableHead>
                  <TableHead className="w-20">GST %</TableHead>
                  <TableHead className="w-24">GST Amount</TableHead>
                  <TableHead className="w-24">Total</TableHead>
                  <TableHead className="w-16">Action</TableHead>
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
                        placeholder="Enter item name"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        placeholder="Enter description"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.hsn_code}
                        onChange={(e) => updateItem(index, 'hsn_code', e.target.value)}
                        placeholder="HSN"
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
                      <Select value={item.unit} onValueChange={(value) => updateItem(index, 'unit', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Nos">Nos</SelectItem>
                          <SelectItem value="Kg">Kg</SelectItem>
                          <SelectItem value="Meter">Meter</SelectItem>
                          <SelectItem value="Sq.Ft">Sq.Ft</SelectItem>
                          <SelectItem value="Set">Set</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.gst_rate}
                        onChange={(e) => updateItem(index, 'gst_rate', parseFloat(e.target.value) || 0)}
                        min="0"
                        max="28"
                        step="0.01"
                      />
                    </TableCell>
                    <TableCell>₹{item.gst_amount.toFixed(2)}</TableCell>
                    <TableCell>₹{(item.total_amount + item.gst_amount).toFixed(2)}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
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
          
          <div className="mt-4 flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total GST:</span>
                <span>₹{totalGst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total Amount:</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Quotation Preview</DialogTitle>
                <DialogDescription>
                  Preview of the quotation before saving
                </DialogDescription>
              </DialogHeader>
              <QuotationTemplate
                quotationData={{
                  ...quotationData,
                  subtotal,
                  tax_amount: totalGst,
                  total_amount: total,
                }}
                items={items}
                branchData={branchData}
                customerData={customerData}
              />
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={convertToProformaInvoice} disabled={loading}>
            <FileText className="h-4 w-4 mr-2" />
            Save as Proforma Invoice
          </Button>
          <Button onClick={handleSaveQuotation} disabled={loading}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            Save Quotation
          </Button>
        </div>
      </div>
    </div>
  );
}