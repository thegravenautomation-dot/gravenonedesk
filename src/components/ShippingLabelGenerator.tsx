import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Printer, FileText, Package, Building, MapPin, Download } from "lucide-react";

interface ShippingLabelGeneratorProps {
  shipmentId: string;
  onLabelGenerated?: (labelPath: string) => void;
}

interface ShipmentDetails {
  id: string;
  order_id: string;
  awb_number: string;
  courier_provider: string;
  shipping_address: any;
  weight_kg: number;
  cod_amount: number;
  delivery_type: string;
  orders: {
    order_no: string;
    total_amount: number;
    customers: {
      name: string;
      phone: string;
      email: string;
    };
  };
  branches: {
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
    email: string;
  };
}

export function ShippingLabelGenerator({ shipmentId, onLabelGenerated }: ShippingLabelGeneratorProps) {
  const { profile } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [shipmentDetails, setShipmentDetails] = useState<ShipmentDetails | null>(null);
  const [labelSize, setLabelSize] = useState('A6');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const fetchShipmentDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          id, order_id, awb_number, courier_provider, shipping_address,
          weight_kg, cod_amount, delivery_type,
          orders (
            order_no, total_amount,
            customers (name, phone, email)
          ),
          branches (name, address, city, state, pincode, phone, email)
        `)
        .eq('id', shipmentId)
        .single();

      if (error) throw error;
      const shipmentData = Array.isArray(data) ? data[0] : data;
      setShipmentDetails(shipmentData);
      setIsPreviewOpen(true);
    } catch (error: any) {
      toast.error('Failed to fetch shipment details: ' + error.message);
    }
  };

  const generateBarcode = (shipmentId: string, orderNo: string): string => {
    // Generate a simple barcode data string
    const timestamp = Date.now().toString();
    return `${orderNo}-${shipmentId.slice(-8)}-${timestamp.slice(-6)}`;
  };

  const generateShippingLabel = async () => {
    if (!shipmentDetails) return;

    setIsGenerating(true);
    try {
      // Generate barcode data
      const barcodeData = generateBarcode(shipmentDetails.id, shipmentDetails.orders.order_no);

      // Call edge function to generate PDF label
      const { data, error } = await supabase.functions.invoke('generate-shipping-label', {
        body: {
          shipment_id: shipmentId,
          label_size: labelSize,
          barcode_data: barcodeData,
          shipment_details: shipmentDetails
        }
      });

      if (error) throw error;

      // Store label information in database
      const { error: insertError } = await supabase
        .from('shipping_labels')
        .insert({
          shipment_id: shipmentId,
          label_pdf_path: data.label_path,
          barcode_data: barcodeData,
          label_size: labelSize,
          generated_by: profile?.id
        });

      if (insertError) throw insertError;

      toast.success('Shipping label generated successfully');
      onLabelGenerated?.(data.label_path);
      setIsPreviewOpen(false);

      // Download the generated label
      downloadLabel(data.label_path);
    } catch (error: any) {
      toast.error('Failed to generate shipping label: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadLabel = async (labelPath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('shipping-labels')
        .download(labelPath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `shipping-label-${shipmentDetails?.orders.order_no || 'unknown'}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error('Failed to download label: ' + error.message);
    }
  };

  const formatAddress = (address: any): string => {
    if (!address) return '';
    return `${address.address || ''}, ${address.city || ''}, ${address.state || ''} - ${address.pincode || ''}`.replace(/^,\s*|,\s*$/g, '');
  };

  return (
    <>
      <Button onClick={fetchShipmentDetails} variant="outline" size="sm">
        <Printer className="h-4 w-4 mr-2" />
        Print Label
      </Button>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Generate Shipping Label
            </DialogTitle>
          </DialogHeader>
          
          {shipmentDetails && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      From (Our Company)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="font-medium">{shipmentDetails.branches.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatAddress({
                        address: shipmentDetails.branches.address,
                        city: shipmentDetails.branches.city,
                        state: shipmentDetails.branches.state,
                        pincode: shipmentDetails.branches.pincode
                      })}
                    </div>
                    <div className="text-sm">
                      Phone: {shipmentDetails.branches.phone}
                    </div>
                    <div className="text-sm">
                      Email: {shipmentDetails.branches.email}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      To (Customer)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="font-medium">{shipmentDetails.orders.customers.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatAddress(shipmentDetails.shipping_address)}
                    </div>
                    <div className="text-sm">
                      Phone: {shipmentDetails.orders.customers.phone}
                    </div>
                    {shipmentDetails.orders.customers.email && (
                      <div className="text-sm">
                        Email: {shipmentDetails.orders.customers.email}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Shipment Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="font-medium">Order No:</span>
                    <p className="text-sm text-muted-foreground">{shipmentDetails.orders.order_no}</p>
                  </div>
                  <div>
                    <span className="font-medium">AWB Number:</span>
                    <p className="text-sm text-muted-foreground">{shipmentDetails.awb_number}</p>
                  </div>
                  <div>
                    <span className="font-medium">Weight:</span>
                    <p className="text-sm text-muted-foreground">{shipmentDetails.weight_kg} kg</p>
                  </div>
                  <div>
                    <span className="font-medium">COD Amount:</span>
                    <p className="text-sm text-muted-foreground">₹{shipmentDetails.cod_amount}</p>
                  </div>
                  <div>
                    <span className="font-medium">Courier:</span>
                    <p className="text-sm text-muted-foreground">{shipmentDetails.courier_provider.toUpperCase()}</p>
                  </div>
                  <div>
                    <span className="font-medium">Delivery Type:</span>
                    <p className="text-sm text-muted-foreground">{shipmentDetails.delivery_type}</p>
                  </div>
                  <div>
                    <span className="font-medium">Order Value:</span>
                    <p className="text-sm text-muted-foreground">₹{shipmentDetails.orders.total_amount}</p>
                  </div>
                  <div>
                    <span className="font-medium">Barcode:</span>
                    <p className="text-xs font-mono text-muted-foreground">
                      {generateBarcode(shipmentDetails.id, shipmentDetails.orders.order_no)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label htmlFor="label_size">Label Size</Label>
                  <Select value={labelSize} onValueChange={setLabelSize}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A4">A4 (210 x 297 mm)</SelectItem>
                      <SelectItem value="A5">A5 (148 x 210 mm)</SelectItem>
                      <SelectItem value="A6">A6 (105 x 148 mm)</SelectItem>
                      <SelectItem value="thermal">Thermal (4 x 6 inch)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={generateShippingLabel} 
                  disabled={isGenerating}
                  className="flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  {isGenerating ? 'Generating...' : 'Generate & Print Label'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}