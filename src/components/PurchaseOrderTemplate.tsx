import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface PurchaseOrderItem {
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

interface PurchaseOrderData {
  po_no: string;
  po_date?: string;
  delivery_date?: string;
  terms_conditions?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  exchange_rate?: number;
}

interface VendorData {
  name: string;
  email?: string;
  phone?: string;
  contact_person?: string;
  address?: string;
  gstin?: string;
}

interface BranchData {
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  terms_conditions?: string;
}

interface PurchaseOrderTemplateProps {
  purchaseOrderData: PurchaseOrderData;
  items: PurchaseOrderItem[];
  branchData: BranchData | null;
  vendorData: VendorData | null;
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

export function PurchaseOrderTemplate({ 
  purchaseOrderData, 
  items, 
  branchData, 
  vendorData 
}: PurchaseOrderTemplateProps) {
  const currentDate = new Date().toLocaleDateString('en-IN');
  const getCurrencySymbol = (currencyCode: string) => {
    return currencies.find(c => c.code === currencyCode)?.symbol || '';
  };

  return (
    <div className="max-w-4xl mx-auto bg-white text-black p-6 print:p-4 print:text-xs" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header with Company Branding */}
      <div className="text-center mb-6 border-b-4 border-purple-600 pb-4">
        <h1 className="text-4xl font-bold text-purple-800 mb-2 tracking-wide">
          GRAVEN AUTOMATION PRIVATE LIMITED
        </h1>
        <div className="text-sm text-gray-700 leading-relaxed">
          <p className="font-medium">7/25, TOWER F, 2ND FLOOR KIRTI NAGAR NEW DELHI 110015</p>
          <p className="font-medium">CALL OR WHATSAPP : +917905350134 / 9919089567 || SALES@GRAVENAUTOMATION.COM</p>
          <p className="font-semibold text-gray-800 mt-1">GST : 07AACCG1025G1ZX &nbsp;&nbsp;&nbsp; PAN : AACCG1025G</p>
        </div>
      </div>

      {/* Document Header */}
      <div className="text-center mb-6">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
          <h2 className="text-3xl font-bold text-purple-800 mb-3 uppercase tracking-wider">
            PURCHASE ORDER
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-6 text-sm bg-gray-50 p-4 rounded-lg">
          <div className="text-left space-y-2">
            <p><strong className="text-gray-700">PO No:</strong> <span className="text-purple-600 font-semibold">{purchaseOrderData.po_no}</span></p>
            <p><strong className="text-gray-700">Date:</strong> <span className="font-medium">{currentDate}</span></p>
            <p><strong className="text-gray-700">Currency:</strong> <span className="font-medium">{purchaseOrderData.currency}</span></p>
            {purchaseOrderData.exchange_rate && purchaseOrderData.currency !== 'INR' && (
              <p><strong className="text-gray-700">Exchange Rate:</strong> <span className="font-medium">1 {purchaseOrderData.currency} = {purchaseOrderData.exchange_rate} INR</span></p>
            )}
          </div>
          <div className="text-right space-y-2">
            {purchaseOrderData.delivery_date && (
              <p><strong className="text-gray-700">Delivery Date:</strong> <span className="font-medium text-red-600">{new Date(purchaseOrderData.delivery_date).toLocaleDateString('en-IN')}</span></p>
            )}
          </div>
        </div>
      </div>

      {/* Vendor Details */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
          <h3 className="font-bold mb-3 text-blue-800 text-lg border-b border-blue-300 pb-1">Ship From (Vendor):</h3>
          <div className="text-sm space-y-2">
            <p className="font-bold text-gray-800">{vendorData?.name}</p>
            {vendorData?.contact_person && <p className="font-medium text-gray-700">Contact: {vendorData.contact_person}</p>}
            {vendorData?.address && <p className="text-gray-600">{vendorData.address}</p>}
            {vendorData?.phone && <p className="text-gray-600"><strong>Phone:</strong> {vendorData.phone}</p>}
            {vendorData?.email && <p className="text-gray-600"><strong>Email:</strong> {vendorData.email}</p>}
            {vendorData?.gstin && <p className="text-gray-600"><strong>GSTIN:</strong> {vendorData.gstin}</p>}
          </div>
        </div>

        <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
          <h3 className="font-bold mb-3 text-green-800 text-lg border-b border-green-300 pb-1">Ship To (Our Company):</h3>
          <div className="text-sm space-y-2">
            <p className="font-bold text-gray-800">GRAVEN AUTOMATION PRIVATE LIMITED</p>
            <p className="text-gray-600">7/25, TOWER F, 2ND FLOOR</p>
            <p className="text-gray-600">KIRTI NAGAR NEW DELHI 110015</p>
            <p className="text-gray-600"><strong>Phone:</strong> +917905350134</p>
            <p className="text-gray-600"><strong>Email:</strong> sales@gravenautomation.com</p>
            <p className="text-gray-600"><strong>GSTIN:</strong> 07AACCG1025G1ZX</p>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-6">
        <h3 className="font-bold text-lg text-gray-800 mb-3">Item Details</h3>
        <Table className="border-2 border-gray-400 rounded-lg overflow-hidden">
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
              <TableHead className="border border-purple-500 text-center font-bold text-white">Sr. No.</TableHead>
              <TableHead className="border border-purple-500 font-bold text-white">Item Description</TableHead>
              <TableHead className="border border-purple-500 text-center font-bold text-white">HSN Code</TableHead>
              <TableHead className="border border-purple-500 text-center font-bold text-white">Qty</TableHead>
              <TableHead className="border border-purple-500 text-center font-bold text-white">Unit</TableHead>
              <TableHead className="border border-purple-500 text-right font-bold text-white">Unit Price</TableHead>
              <TableHead className="border border-purple-500 text-right font-bold text-white">Amount</TableHead>
              <TableHead className="border border-purple-500 text-center font-bold text-white">GST %</TableHead>
              <TableHead className="border border-purple-500 text-right font-bold text-white">GST Amount</TableHead>
              <TableHead className="border border-purple-500 text-right font-bold text-white">Total Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={index} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                <TableCell className="border border-gray-300 text-center font-medium">{item.sr_no}</TableCell>
                <TableCell className="border border-gray-300">
                  <div>
                    <p className="font-semibold text-gray-800">{item.item_name}</p>
                    {item.description && (
                      <p className="text-sm text-gray-600 italic">{item.description}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="border border-gray-300 text-center font-mono text-sm">{item.hsn_code}</TableCell>
                <TableCell className="border border-gray-300 text-center font-medium">{item.quantity}</TableCell>
                <TableCell className="border border-gray-300 text-center">{item.unit}</TableCell>
                <TableCell className="border border-gray-300 text-right font-mono">{getCurrencySymbol(purchaseOrderData.currency)}{item.unit_price.toFixed(2)}</TableCell>
                <TableCell className="border border-gray-300 text-right font-mono">{getCurrencySymbol(purchaseOrderData.currency)}{item.total_amount.toFixed(2)}</TableCell>
                <TableCell className="border border-gray-300 text-center">{item.gst_rate}%</TableCell>
                <TableCell className="border border-gray-300 text-right font-mono">{getCurrencySymbol(purchaseOrderData.currency)}{item.gst_amount.toFixed(2)}</TableCell>
                <TableCell className="border border-gray-300 text-right font-bold text-purple-700">
                  {getCurrencySymbol(purchaseOrderData.currency)}{(item.total_amount + item.gst_amount).toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-6">
        <div className="w-96">
          <Table className="border-2 border-gray-400 rounded-lg overflow-hidden">
            <TableBody>
              <TableRow className="bg-blue-50">
                <TableCell className="border border-gray-300 font-semibold text-gray-700">Subtotal:</TableCell>
                <TableCell className="border border-gray-300 text-right font-mono text-lg">{getCurrencySymbol(purchaseOrderData.currency)}{purchaseOrderData.subtotal.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow className="bg-green-50">
                <TableCell className="border border-gray-300 font-semibold text-gray-700">Total GST:</TableCell>
                <TableCell className="border border-gray-300 text-right font-mono text-lg">{getCurrencySymbol(purchaseOrderData.currency)}{purchaseOrderData.tax_amount.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
                <TableCell className="border border-purple-500 font-bold text-xl">TOTAL AMOUNT:</TableCell>
                <TableCell className="border border-purple-500 text-right font-bold text-xl">
                  {getCurrencySymbol(purchaseOrderData.currency)}{purchaseOrderData.total_amount.toFixed(2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Terms and Conditions */}
      <div className="mb-6">
        <h3 className="font-bold mb-3 text-lg text-gray-800">Terms & Conditions:</h3>
        <div className="text-sm whitespace-pre-line border-2 border-purple-200 p-4 rounded-lg bg-purple-50">
          {purchaseOrderData.terms_conditions || `Terms and Conditions:
1. Delivery should be made as per schedule.
2. Quality should meet specifications.
3. Payment terms: 30 days from delivery.
4. All items should be properly packed and labeled.
5. GST: 07AACCG1025G1ZX | PAN: AACCG1025G`}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-purple-600 pt-6 mt-8">
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-2">
            <p className="text-lg font-bold text-purple-800">
              Please confirm receipt and delivery schedule
            </p>
            <p className="text-sm text-gray-600">
              Contact us for any clarifications
            </p>
          </div>
          <div className="text-right">
            <div className="border-t-2 border-gray-400 pt-4 mt-8 w-48 ml-auto">
              <p className="font-bold text-gray-800 mb-4">Authorized Signature</p>
              <p className="text-sm font-medium text-purple-700 mt-12">
                GRAVEN AUTOMATION PRIVATE LIMITED
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}