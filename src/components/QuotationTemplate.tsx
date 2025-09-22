import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

interface QuotationItem {
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

interface QuotationData {
  quotation_no?: string;
  order_no?: string;
  invoice_no?: string;
  valid_till?: string;
  terms?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
}

interface BranchData {
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

interface CustomerData {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  gstin?: string;
  billing_address?: string;
  shipping_address?: string;
  address?: string;
}

interface QuotationTemplateProps {
  quotationData: QuotationData;
  items: QuotationItem[];
  branchData: BranchData | null;
  customerData: CustomerData | null;
  templateType?: 'quotation' | 'order' | 'invoice';
}

export function QuotationTemplate({ 
  quotationData, 
  items, 
  branchData, 
  customerData,
  templateType = 'quotation'
}: QuotationTemplateProps) {
  const currentDate = new Date().toLocaleDateString('en-IN');

  return (
    <div className="max-w-4xl mx-auto bg-white text-black p-6 print:p-4 print:text-xs" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header with Company Branding - Enhanced */}
      <div className="text-center mb-6 border-b-4 border-blue-600 pb-4">
        <h1 className="text-4xl font-bold text-blue-800 mb-2 tracking-wide">
          GRAVEN AUTOMATION PRIVATE LIMITED
        </h1>
        <div className="text-sm text-gray-700 leading-relaxed">
          <p className="font-medium">7/25, TOWER F, 2ND FLOOR KIRTI NAGAR NEW DELHI 110015</p>
          <p className="font-medium">CALL OR WHATSAPP : +917905350134 / 9919089567 || SALES@GRAVENAUTOMATION.COM</p>
          <p className="font-semibold text-gray-800 mt-1">GST : 07AACCG1025G1ZX &nbsp;&nbsp;&nbsp; PAN : AACCG1025G</p>
        </div>
      </div>

      {/* Document Header - Enhanced */}
      <div className="text-center mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h2 className="text-3xl font-bold text-blue-800 mb-3 uppercase tracking-wider">
            {templateType === 'order' ? 'PURCHASE ORDER' : templateType === 'invoice' ? 'INVOICE' : 'QUOTATION'}
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-6 text-sm bg-gray-50 p-4 rounded-lg">
          <div className="text-left space-y-2">
            <p><strong className="text-gray-700">
              {templateType === 'order' ? 'Order No:' : templateType === 'invoice' ? 'Invoice No:' : 'Quotation No:'}
            </strong> <span className="text-blue-600 font-semibold">{quotationData.quotation_no || quotationData.order_no || quotationData.invoice_no}</span></p>
            <p><strong className="text-gray-700">Date:</strong> <span className="font-medium">{currentDate}</span></p>
          </div>
          <div className="text-right space-y-2">
            {quotationData.valid_till && (
              <p><strong className="text-gray-700">Valid Till:</strong> <span className="font-medium text-red-600">{new Date(quotationData.valid_till).toLocaleDateString('en-IN')}</span></p>
            )}
          </div>
        </div>
      </div>

      {/* Customer Details - Enhanced */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
          <h3 className="font-bold mb-3 text-blue-800 text-lg border-b border-blue-300 pb-1">Bill To:</h3>
          <div className="text-sm space-y-2">
            <p className="font-bold text-gray-800">{customerData?.name}</p>
            {customerData?.company && <p className="font-medium text-gray-700">{customerData.company}</p>}
            <p className="text-gray-600">{customerData?.billing_address || customerData?.address}</p>
            {customerData?.phone && <p className="text-gray-600"><strong>Phone:</strong> {customerData.phone}</p>}
            {customerData?.email && <p className="text-gray-600"><strong>Email:</strong> {customerData.email}</p>}
            {customerData?.gstin && <p className="text-gray-600"><strong>GSTIN:</strong> {customerData.gstin}</p>}
          </div>
        </div>

        <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
          <h3 className="font-bold mb-3 text-green-800 text-lg border-b border-green-300 pb-1">Ship To:</h3>
          <div className="text-sm space-y-2">
            <p className="font-bold text-gray-800">{customerData?.name}</p>
            {customerData?.company && <p className="font-medium text-gray-700">{customerData.company}</p>}
            <p className="text-gray-600">{customerData?.shipping_address || customerData?.billing_address || customerData?.address}</p>
          </div>
        </div>
      </div>

      {/* Items Table - Enhanced */}
      <div className="mb-6">
        <h3 className="font-bold text-lg text-gray-800 mb-3">Item Details</h3>
        <Table className="border-2 border-gray-400 rounded-lg overflow-hidden">
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <TableHead className="border border-blue-500 text-center font-bold text-white">Sr. No.</TableHead>
              <TableHead className="border border-blue-500 font-bold text-white">Item Description</TableHead>
              <TableHead className="border border-blue-500 text-center font-bold text-white">HSN Code</TableHead>
              <TableHead className="border border-blue-500 text-center font-bold text-white">Qty</TableHead>
              <TableHead className="border border-blue-500 text-center font-bold text-white">Unit</TableHead>
              <TableHead className="border border-blue-500 text-right font-bold text-white">Unit Price</TableHead>
              <TableHead className="border border-blue-500 text-right font-bold text-white">Amount</TableHead>
              <TableHead className="border border-blue-500 text-center font-bold text-white">GST %</TableHead>
              <TableHead className="border border-blue-500 text-right font-bold text-white">GST Amount</TableHead>
              <TableHead className="border border-blue-500 text-right font-bold text-white">Total Amount</TableHead>
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
                <TableCell className="border border-gray-300 text-right font-mono">₹{(Number(item.unit_price) || 0).toFixed(2)}</TableCell>
                <TableCell className="border border-gray-300 text-right font-mono">₹{(Number(item.total_amount) || 0).toFixed(2)}</TableCell>
                <TableCell className="border border-gray-300 text-center">{Number(item.gst_rate) || 0}%</TableCell>
                <TableCell className="border border-gray-300 text-right font-mono">₹{(Number(item.gst_amount) || 0).toFixed(2)}</TableCell>
                <TableCell className="border border-gray-300 text-right font-bold text-blue-700">
                  ₹{((Number(item.total_amount) || 0) + (Number(item.gst_amount) || 0)).toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Totals - Enhanced */}
      <div className="flex justify-end mb-6">
        <div className="w-96">
          <Table className="border-2 border-gray-400 rounded-lg overflow-hidden">
            <TableBody>
              <TableRow className="bg-blue-50">
                <TableCell className="border border-gray-300 font-semibold text-gray-700">Subtotal:</TableCell>
                <TableCell className="border border-gray-300 text-right font-mono text-lg">₹{(Number(quotationData.subtotal) || 0).toFixed(2)}</TableCell>
              </TableRow>
              <TableRow className="bg-green-50">
                <TableCell className="border border-gray-300 font-semibold text-gray-700">Total GST:</TableCell>
                <TableCell className="border border-gray-300 text-right font-mono text-lg">₹{(Number(quotationData.tax_amount) || 0).toFixed(2)}</TableCell>
              </TableRow>
              <TableRow className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <TableCell className="border border-blue-500 font-bold text-xl">TOTAL AMOUNT:</TableCell>
                <TableCell className="border border-blue-500 text-right font-bold text-xl">
                  ₹{(Number(quotationData.total_amount) || 0).toFixed(2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Banking Details - Enhanced */}
      {branchData?.bank_name && (
        <div className="mb-6">
          <h3 className="font-bold mb-3 text-lg text-gray-800">Banking Details:</h3>
          <div className="border-2 border-yellow-300 rounded-lg p-4 bg-yellow-50">
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div className="space-y-2">
                <p><strong className="text-gray-700">Bank Name:</strong> <span className="font-medium">{branchData.bank_name}</span></p>
                <p><strong className="text-gray-700">Account Holder:</strong> <span className="font-medium">{branchData.account_holder_name}</span></p>
              </div>
              <div className="space-y-2">
                <p><strong className="text-gray-700">Account Number:</strong> <span className="font-mono">{branchData.account_number}</span></p>
                <p><strong className="text-gray-700">IFSC Code:</strong> <span className="font-mono">{branchData.ifsc_code}</span></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Terms and Conditions - Enhanced */}
      <div className="mb-6">
        <h3 className="font-bold mb-3 text-lg text-gray-800">Terms & Conditions:</h3>
        <div className="text-sm whitespace-pre-line border-2 border-red-200 p-4 rounded-lg bg-red-50">
          {quotationData.terms || branchData?.terms_conditions || `Terms and Conditions:
1. Payment should be made within 30 days from the date of invoice.
2. Goods once sold will not be taken back or exchanged.
3. Delivery period: 15-20 working days from the date of order confirmation.
4. Any disputes will be subject to local jurisdiction only.
5. Prices are subject to change without prior notice.
6. GST: 07AACCG1025G1ZX | PAN: AACCG1025G`}
        </div>
      </div>

      {/* Footer - Enhanced */}
      <div className="border-t-2 border-blue-600 pt-6 mt-8">
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-2">
            <p className="text-lg font-bold text-blue-800">
              Thank you for your business!
            </p>
            <p className="text-sm text-gray-600">
              We appreciate your trust in GRAVEN AUTOMATION
            </p>
          </div>
          <div className="text-right">
            <div className="border-t-2 border-gray-400 pt-4 mt-8 w-48 ml-auto">
              <p className="font-bold text-gray-800 mb-4">Authorized Signature</p>
              <p className="text-sm font-medium text-blue-700 mt-12">
                GRAVEN AUTOMATION PRIVATE LIMITED
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}