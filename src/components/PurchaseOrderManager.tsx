import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, FileText, Download, DollarSign } from "lucide-react";

interface Order {
  id: string;
  order_no: string;
  customer_id: string;
  total_amount: number;
  order_date: string;
  status: string;
  customers: {
    name: string;
    company?: string;
  };
  order_items: {
    id: string;
    item_name: string;
    description: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
  }[];
}

interface Vendor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  contact_person?: string;
}

interface PurchaseOrderManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceOrders?: string[];
  onSuccess?: () => void;
}

interface POItem {
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
  source_order_item_id?: string;
}

const currencies = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' }
];

export function PurchaseOrderManager({ open, onOpenChange, sourceOrders = [], onSuccess }: PurchaseOrderManagerProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<string[]>(sourceOrders);
  const [selectedVendor, setSelectedVendor] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [exchangeRate, setExchangeRate] = useState(1.0);
  const [items, setItems] = useState<POItem[]>([]);

  const [poData, setPOData] = useState({
    po_no: "",
    delivery_date: "",
    terms_conditions: `Terms and Conditions:
1. Delivery should be made as per schedule.
2. Quality should meet specifications.
3. Payment terms: 30 days from delivery.
4. All items should be properly packed and labeled.`,
    supplier_contact: "",
    supplier_email: ""
  });

  useEffect(() => {
    if (open) {
      fetchVendors();
      fetchOrders();
      generatePONumber();
    }
  }, [open, profile?.branch_id]);

  useEffect(() => {
    if (selectedOrders.length > 0) {
      loadItemsFromOrders();
    }
  }, [selectedOrders, orders]);

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, name, email, phone, contact_person')
        .eq('branch_id', profile?.branch_id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setVendors(data || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, order_no, customer_id, total_amount, order_date, status,
          customers (name, company),
          order_items (id, item_name, description, quantity, unit_price, total_amount)
        `)
        .eq('branch_id', profile?.branch_id)
        .in('status', ['pending', 'confirmed'])
        .order('order_date', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const generatePONumber = async () => {
    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('po_no')
        .eq('branch_id', profile?.branch_id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextNumber = 1;
      if (data && data.length > 0) {
        const lastNumber = data[0].po_no.match(/\d+$/);
        if (lastNumber) {
          nextNumber = parseInt(lastNumber[0]) + 1;
        }
      }

      const poNo = `PO-${new Date().getFullYear()}-${String(nextNumber).padStart(4, '0')}`;
      setPOData(prev => ({ ...prev, po_no: poNo }));
    } catch (error) {
      console.error('Error generating PO number:', error);
    }
  };

  const loadItemsFromOrders = () => {
    const selectedOrderData = orders.filter(order => selectedOrders.includes(order.id));
    const allItems: POItem[] = [];
    let srNo = 1;

    selectedOrderData.forEach(order => {
      order.order_items.forEach(item => {
        const gstAmount = (item.total_amount * 18) / 100; // Default 18% GST
        allItems.push({
          sr_no: srNo++,
          item_name: item.item_name,
          description: item.description,
          hsn_code: "",
          quantity: item.quantity,
          unit: "Nos",
          unit_price: item.unit_price,
          total_amount: item.total_amount,
          gst_rate: 18,
          gst_amount: gstAmount,
          source_order_item_id: item.id
        });
      });
    });

    setItems(allItems);
  };

  const addItem = () => {
    const newItem: POItem = {
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
      const renumberedItems = newItems.map((item, i) => ({
        ...item,
        sr_no: i + 1
      }));
      setItems(renumberedItems);
    }
  };

  const updateItem = (index: number, field: keyof POItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
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
    const convertedTotal = currency === 'INR' ? total : total / exchangeRate;
    
    return { subtotal, totalGst, total: convertedTotal };
  };

  const handleSavePO = async () => {
    try {
      if (!selectedVendor || items.length === 0 || items.some(item => !item.item_name)) {
        toast({
          title: "Error",
          description: "Please fill all required fields",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);
      const { subtotal, totalGst, total } = calculateTotals();

      // Create purchase order
      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .insert({
          po_no: poData.po_no,
          vendor_id: selectedVendor,
          branch_id: profile?.branch_id,
          delivery_date: poData.delivery_date || null,
          subtotal: subtotal,
          tax_amount: totalGst,
          total_amount: total,
          currency: currency,
          exchange_rate: exchangeRate,
          source_order_ids: selectedOrders,
          order_source: selectedOrders.length > 0 ? 'orders' : 'manual',
          supplier_contact: poData.supplier_contact,
          supplier_email: poData.supplier_email,
          terms_conditions: poData.terms_conditions,
          status: 'pending',
          created_by: profile?.id
        })
        .select()
        .single();

      if (poError) throw poError;

      // Create purchase order items
      const poItems = items.map(item => ({
        purchase_order_id: po.id,
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
        source_order_item_id: item.source_order_item_id
      }));

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(poItems);

      if (itemsError) throw itemsError;

      toast({
        title: "Success",
        description: "Purchase Order created successfully",
      });

      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error saving purchase order:', error);
      toast({
        title: "Error",
        description: "Failed to create purchase order",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCurrencySymbol = (currencyCode: string) => {
    return currencies.find(c => c.code === currencyCode)?.symbol || '';
  };

  const { subtotal, totalGst, total } = calculateTotals();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Purchase Order</DialogTitle>
          <DialogDescription>
            {selectedOrders.length > 0 
              ? `Creating PO from ${selectedOrders.length} order(s)` 
              : "Create a new purchase order"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label htmlFor="po_no">PO Number</Label>
              <Input
                id="po_no"
                value={poData.po_no}
                onChange={(e) => setPOData({...poData, po_no: e.target.value})}
                readOnly
              />
            </div>
            <div>
              <Label htmlFor="vendor">Vendor *</Label>
              <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((curr) => (
                    <SelectItem key={curr.code} value={curr.code}>
                      {curr.code} ({curr.symbol}) - {curr.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="delivery_date">Delivery Date</Label>
              <Input
                id="delivery_date"
                type="date"
                value={poData.delivery_date}
                onChange={(e) => setPOData({...poData, delivery_date: e.target.value})}
              />
            </div>
          </div>

          {currency !== 'INR' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="exchange_rate">Exchange Rate (1 {currency} = {exchangeRate} INR)</Label>
                <Input
                  id="exchange_rate"
                  type="number"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 1)}
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
          )}

          {/* Source Orders Selection */}
          {orders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Source Orders</CardTitle>
                <CardDescription>Select orders to create purchase order from</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {orders.map((order) => (
                    <div key={order.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={order.id}
                        checked={selectedOrders.includes(order.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedOrders([...selectedOrders, order.id]);
                          } else {
                            setSelectedOrders(selectedOrders.filter(id => id !== order.id));
                          }
                        }}
                      />
                      <Label htmlFor={order.id} className="flex-1 cursor-pointer">
                        {order.order_no} - {order.customers?.name} - ₹{order.total_amount.toLocaleString()}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Items Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Purchase Order Items</CardTitle>
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
                      <TableHead className="w-24">Unit Price ({getCurrencySymbol(currency)})</TableHead>
                      <TableHead className="w-20">GST %</TableHead>
                      <TableHead className="w-24">GST Amount</TableHead>
                      <TableHead className="w-24">Total ({getCurrencySymbol(currency)})</TableHead>
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
                        <TableCell>{getCurrencySymbol(currency)}{item.gst_amount.toFixed(2)}</TableCell>
                        <TableCell>{getCurrencySymbol(currency)}{(item.total_amount + item.gst_amount).toFixed(2)}</TableCell>
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
                    <span>{getCurrencySymbol(currency)}{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total GST:</span>
                    <span>{getCurrencySymbol(currency)}{totalGst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total Amount:</span>
                    <span>{getCurrencySymbol(currency)}{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Terms and Additional Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="supplier_contact">Supplier Contact</Label>
              <Input
                id="supplier_contact"
                value={poData.supplier_contact}
                onChange={(e) => setPOData({...poData, supplier_contact: e.target.value})}
                placeholder="Contact person"
              />
            </div>
            <div>
              <Label htmlFor="supplier_email">Supplier Email</Label>
              <Input
                id="supplier_email"
                type="email"
                value={poData.supplier_email}
                onChange={(e) => setPOData({...poData, supplier_email: e.target.value})}
                placeholder="supplier@email.com"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="terms_conditions">Terms & Conditions</Label>
            <Textarea
              id="terms_conditions"
              value={poData.terms_conditions}
              onChange={(e) => setPOData({...poData, terms_conditions: e.target.value})}
              rows={5}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePO} disabled={loading}>
              {loading ? "Creating..." : "Create Purchase Order"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}