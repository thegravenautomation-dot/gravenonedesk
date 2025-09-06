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
    <div className="max-w-4xl mx-auto bg-white text-black p-8 print:p-4">
      {/* Header with Company Branding */}
      <div className="text-center mb-8 border-b-2 border-primary pb-4">
        <h1 className="text-3xl font-bold text-primary mb-2">
          {branchData?.name || "Company Name"}
        </h1>
        <div className="text-sm text-gray-600">
          <p>{branchData?.address}</p>
          <p>{branchData?.city}, {branchData?.state}</p>
          <p>Phone: {branchData?.phone} | Email: {branchData?.email}</p>
        </div>
      </div>

      {/* Document Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">
          {templateType === 'order' ? 'PURCHASE ORDER' : templateType === 'invoice' ? 'INVOICE' : 'QUOTATION'}
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="text-left">
              <p><strong>
                {templateType === 'order' ? 'Order No:' : templateType === 'invoice' ? 'Invoice No:' : 'Quotation No:'}
              </strong> {quotationData.quotation_no || quotationData.order_no || quotationData.invoice_no}</p>
            <p><strong>Date:</strong> {currentDate}</p>
          </div>
          <div className="text-right">
            {quotationData.valid_till && (
              <p><strong>Valid Till:</strong> {new Date(quotationData.valid_till).toLocaleDateString('en-IN')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Customer Details */}
      <div className="grid grid-cols-2 gap-8 mb-6">
        <Card>
          <CardContent className="p-4">
            <h3 className="font-bold mb-2">Bill To:</h3>
            <div className="text-sm space-y-1">
              <p className="font-medium">{customerData?.name}</p>
              {customerData?.company && <p>{customerData.company}</p>}
              <p>{customerData?.billing_address || customerData?.address}</p>
              {customerData?.phone && <p>Phone: {customerData.phone}</p>}
              {customerData?.email && <p>Email: {customerData.email}</p>}
              {customerData?.gstin && <p>GSTIN: {customerData.gstin}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="font-bold mb-2">Ship To:</h3>
            <div className="text-sm space-y-1">
              <p className="font-medium">{customerData?.name}</p>
              {customerData?.company && <p>{customerData.company}</p>}
              <p>{customerData?.shipping_address || customerData?.billing_address || customerData?.address}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      <div className="mb-6">
        <Table className="border">
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="border text-center font-bold">Sr. No.</TableHead>
              <TableHead className="border font-bold">Item Description</TableHead>
              <TableHead className="border text-center font-bold">HSN Code</TableHead>
              <TableHead className="border text-center font-bold">Qty</TableHead>
              <TableHead className="border text-center font-bold">Unit</TableHead>
              <TableHead className="border text-right font-bold">Unit Price</TableHead>
              <TableHead className="border text-right font-bold">Amount</TableHead>
              <TableHead className="border text-center font-bold">GST %</TableHead>
              <TableHead className="border text-right font-bold">GST Amount</TableHead>
              <TableHead className="border text-right font-bold">Total Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={index}>
                <TableCell className="border text-center">{item.sr_no}</TableCell>
                <TableCell className="border">
                  <div>
                    <p className="font-medium">{item.item_name}</p>
                    {item.description && (
                      <p className="text-sm text-gray-600">{item.description}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="border text-center">{item.hsn_code}</TableCell>
                <TableCell className="border text-center">{item.quantity}</TableCell>
                <TableCell className="border text-center">{item.unit}</TableCell>
                <TableCell className="border text-right">₹{item.unit_price.toFixed(2)}</TableCell>
                <TableCell className="border text-right">₹{item.total_amount.toFixed(2)}</TableCell>
                <TableCell className="border text-center">{item.gst_rate}%</TableCell>
                <TableCell className="border text-right">₹{item.gst_amount.toFixed(2)}</TableCell>
                <TableCell className="border text-right font-medium">
                  ₹{(item.total_amount + item.gst_amount).toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-6">
        <div className="w-80">
          <Table className="border">
            <TableBody>
              <TableRow>
                <TableCell className="border font-medium">Subtotal:</TableCell>
                <TableCell className="border text-right">₹{quotationData.subtotal.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="border font-medium">Total GST:</TableCell>
                <TableCell className="border text-right">₹{quotationData.tax_amount.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow className="bg-gray-50">
                <TableCell className="border font-bold text-lg">Total Amount:</TableCell>
                <TableCell className="border text-right font-bold text-lg">
                  ₹{quotationData.total_amount.toFixed(2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Banking Details */}
      {branchData?.bank_name && (
        <div className="mb-6">
          <h3 className="font-bold mb-2">Banking Details:</h3>
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>Bank Name:</strong> {branchData.bank_name}</p>
                  <p><strong>Account Holder:</strong> {branchData.account_holder_name}</p>
                </div>
                <div>
                  <p><strong>Account Number:</strong> {branchData.account_number}</p>
                  <p><strong>IFSC Code:</strong> {branchData.ifsc_code}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Terms and Conditions */}
      <div className="mb-6">
        <h3 className="font-bold mb-2">Terms & Conditions:</h3>
        <div className="text-sm whitespace-pre-line border p-4 rounded">
          {quotationData.terms || branchData?.terms_conditions || `Terms and Conditions:
1. Payment should be made within 30 days from the date of invoice.
2. Goods once sold will not be taken back or exchanged.
3. Delivery period: 15-20 working days from the date of order confirmation.
4. Any disputes will be subject to local jurisdiction only.
5. Prices are subject to change without prior notice.`}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t pt-4 mt-8">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">
              Thank you for your business!
            </p>
          </div>
          <div className="text-right">
            <div className="border-t pt-4 mt-8">
              <p className="font-medium">Authorized Signature</p>
              <p className="text-sm text-gray-600 mt-2">
                {branchData?.name}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}