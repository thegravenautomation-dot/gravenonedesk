import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

interface InvoiceItem {
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

interface InvoiceData {
  invoice_no: string;
  invoice_date?: string;
  due_date?: string;
  invoice_type: 'regular' | 'proforma';
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  payment_status?: string;
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

interface ProformaInvoiceTemplateProps {
  invoiceData: InvoiceData;
  items: InvoiceItem[];
  branchData: BranchData | null;
  customerData: CustomerData | null;
}

export function ProformaInvoiceTemplate({ 
  invoiceData, 
  items, 
  branchData, 
  customerData 
}: ProformaInvoiceTemplateProps) {
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

      {/* Invoice Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2 text-red-600">
          {invoiceData.invoice_type === 'proforma' ? 'PROFORMA INVOICE' : 'INVOICE'}
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="text-left">
            <p><strong>Invoice No:</strong> {invoiceData.invoice_no}</p>
            <p><strong>Date:</strong> {invoiceData.invoice_date ? new Date(invoiceData.invoice_date).toLocaleDateString('en-IN') : currentDate}</p>
          </div>
          <div className="text-right">
            {invoiceData.due_date && (
              <p><strong>Due Date:</strong> {new Date(invoiceData.due_date).toLocaleDateString('en-IN')}</p>
            )}
            {invoiceData.payment_status && (
              <p><strong>Status:</strong> <span className="font-semibold text-blue-600">{invoiceData.payment_status.toUpperCase()}</span></p>
            )}
          </div>
        </div>
      </div>

      {/* Customer Details */}
      <div className="grid grid-cols-2 gap-8 mb-6">
        <div>
          <h3 className="font-bold text-lg mb-3 text-primary">Bill To:</h3>
          <div className="bg-gray-50 p-4 rounded">
            <p className="font-semibold text-lg">{customerData?.name}</p>
            {customerData?.company && <p className="text-gray-600">{customerData.company}</p>}
            {customerData?.billing_address && (
              <p className="mt-2 text-sm">{customerData.billing_address}</p>
            )}
            {customerData?.email && <p className="text-sm">Email: {customerData.email}</p>}
            {customerData?.phone && <p className="text-sm">Phone: {customerData.phone}</p>}
            {customerData?.gstin && <p className="text-sm font-semibold">GSTIN: {customerData.gstin}</p>}
          </div>
        </div>
        
        <div>
          <h3 className="font-bold text-lg mb-3 text-primary">From:</h3>
          <div className="bg-gray-50 p-4 rounded">
            <p className="font-semibold text-lg">{branchData?.name}</p>
            <p className="text-sm">{branchData?.address}</p>
            <p className="text-sm">{branchData?.city}, {branchData?.state}</p>
            <p className="text-sm">Phone: {branchData?.phone}</p>
            <p className="text-sm">Email: {branchData?.email}</p>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-6">
        <Table className="border">
          <TableHeader className="bg-gray-100">
            <TableRow>
              <TableHead className="border text-center font-bold">Sr. No.</TableHead>
              <TableHead className="border font-bold">Item Description</TableHead>
              <TableHead className="border text-center font-bold">HSN Code</TableHead>
              <TableHead className="border text-center font-bold">Qty</TableHead>
              <TableHead className="border text-center font-bold">Unit</TableHead>
              <TableHead className="border text-right font-bold">Rate</TableHead>
              <TableHead className="border text-right font-bold">Amount</TableHead>
              <TableHead className="border text-right font-bold">GST %</TableHead>
              <TableHead className="border text-right font-bold">GST Amount</TableHead>
              <TableHead className="border text-right font-bold">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={index} className="border-b">
                <TableCell className="border text-center">{item.sr_no}</TableCell>
                <TableCell className="border">
                  <div>
                    <p className="font-medium">{item.item_name}</p>
                    {item.description && <p className="text-sm text-gray-600">{item.description}</p>}
                  </div>
                </TableCell>
                <TableCell className="border text-center">{item.hsn_code}</TableCell>
                <TableCell className="border text-center">{item.quantity}</TableCell>
                <TableCell className="border text-center">{item.unit}</TableCell>
                <TableCell className="border text-right">₹{item.unit_price.toFixed(2)}</TableCell>
                <TableCell className="border text-right">₹{item.total_amount.toFixed(2)}</TableCell>
                <TableCell className="border text-center">{item.gst_rate}%</TableCell>
                <TableCell className="border text-right">₹{item.gst_amount.toFixed(2)}</TableCell>
                <TableCell className="border text-right font-semibold">₹{(item.total_amount + item.gst_amount).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Totals Section */}
      <div className="flex justify-end mb-6">
        <div className="w-80">
          <div className="bg-gray-50 p-4 rounded border">
            <div className="flex justify-between mb-2">
              <span>Subtotal:</span>
              <span>₹{invoiceData.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Total GST:</span>
              <span>₹{invoiceData.tax_amount.toFixed(2)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-bold text-lg">
              <span>Total Amount:</span>
              <span>₹{invoiceData.total_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Banking Details */}
      {branchData?.bank_name && (
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-3 text-primary">Banking Details:</h3>
          <div className="bg-gray-50 p-4 rounded border">
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
          </div>
        </div>
      )}

      {/* Terms and Conditions */}
      {branchData?.terms_conditions && (
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-3 text-primary">Terms & Conditions:</h3>
          <div className="bg-gray-50 p-4 rounded border text-sm">
            <pre className="whitespace-pre-wrap font-sans">{branchData.terms_conditions}</pre>
          </div>
        </div>
      )}

      {/* Proforma Invoice Note */}
      {invoiceData.invoice_type === 'proforma' && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm font-semibold text-yellow-800">
            <strong>Note:</strong> This is a Proforma Invoice. This document is not a demand for payment but an estimate of costs. 
            A commercial invoice will be issued upon confirmation of the order.
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Thank you for your business!</p>
        <p>This is a computer-generated document and does not require a signature.</p>
      </div>
    </div>
  );
}