import { forwardRef } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

interface PaymentEntry {
  id: string;
  amount: number;
  payment_date: string;
  method: string;
  reference?: string;
  note?: string;
  payment_mode: string;
}

interface OrderData {
  order_no: string;
  customer_name: string;
  customer_company?: string;
  order_date: string;
  total_amount: number;
  status: string;
}

interface BranchData {
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
}

interface OrderPaymentSummaryReportProps {
  orderData: OrderData;
  payments: PaymentEntry[];
  branchData: BranchData | null;
  totalPaid: number;
  balanceDue: number;
}

export const OrderPaymentSummaryReport = forwardRef<HTMLDivElement, OrderPaymentSummaryReportProps>(
  ({ orderData, payments, branchData, totalPaid, balanceDue }, ref) => {
    const currentDate = new Date().toLocaleDateString('en-IN');

    return (
      <div ref={ref} className="max-w-4xl mx-auto bg-white text-black p-8 print:p-4">
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

        {/* Report Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2 text-blue-600">
            ORDER PAYMENT SUMMARY
          </h2>
          <p className="text-sm text-gray-600">Generated on: {currentDate}</p>
        </div>

        {/* Order Information */}
        <Card className="mb-6">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Order Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Order No:</strong> {orderData.order_no}</p>
                <p><strong>Customer:</strong> {orderData.customer_name}</p>
                {orderData.customer_company && (
                  <p><strong>Company:</strong> {orderData.customer_company}</p>
                )}
              </div>
              <div>
                <p><strong>Order Date:</strong> {new Date(orderData.order_date).toLocaleDateString('en-IN')}</p>
                <p><strong>Status:</strong> <span className="capitalize">{orderData.status}</span></p>
                <p><strong>Order Amount:</strong> ₹{orderData.total_amount.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Payment Summary */}
        <Card className="mb-6">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Payment Summary</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-green-50 p-3 rounded">
                <p className="text-sm text-gray-600">Total Paid</p>
                <p className="text-lg font-bold text-green-600">₹{totalPaid.toFixed(2)}</p>
              </div>
              <div className="bg-red-50 p-3 rounded">
                <p className="text-sm text-gray-600">Balance Due</p>
                <p className="text-lg font-bold text-red-600">₹{balanceDue.toFixed(2)}</p>
              </div>
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-sm text-gray-600">Payment Status</p>
                <p className="text-lg font-bold text-blue-600">
                  {balanceDue <= 0 ? 'PAID' : totalPaid > 0 ? 'PARTIAL' : 'PENDING'}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Payment History */}
        <Card>
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Payment History</h3>
            {payments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{new Date(payment.payment_date).toLocaleDateString('en-IN')}</TableCell>
                      <TableCell className="font-medium">₹{payment.amount.toFixed(2)}</TableCell>
                      <TableCell className="capitalize">{payment.method || 'Cash'}</TableCell>
                      <TableCell className="capitalize">{payment.payment_mode}</TableCell>
                      <TableCell>{payment.reference || '-'}</TableCell>
                      <TableCell>{payment.note || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-gray-500 text-center py-4">No payments recorded yet</p>
            )}
          </div>
        </Card>

        <Separator className="my-6" />

        {/* Footer */}
        <div className="text-center text-xs text-gray-500">
          <p>This is a computer-generated report. No signature required.</p>
          <p>Generated by {branchData?.name || "ERP System"} on {currentDate}</p>
        </div>
      </div>
    );
  }
);

OrderPaymentSummaryReport.displayName = "OrderPaymentSummaryReport";