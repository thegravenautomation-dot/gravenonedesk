import { forwardRef } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

interface LedgerEntry {
  id: string;
  transaction_date: string;
  transaction_type: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
  balance: number;
  reference_type?: string;
  payment_mode?: string;
}

interface CustomerData {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
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
}

interface AccountSummary {
  total_orders: number;
  total_payments: number;
  current_balance: number;
  total_due: number;
}

interface CustomerLedgerReportProps {
  customerData: CustomerData;
  ledgerEntries: LedgerEntry[];
  branchData: BranchData | null;
  accountSummary: AccountSummary;
  dateRange?: {
    from: string;
    to: string;
  };
}

export const CustomerLedgerReport = forwardRef<HTMLDivElement, CustomerLedgerReportProps>(
  ({ customerData, ledgerEntries, branchData, accountSummary, dateRange }, ref) => {
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
          <h2 className="text-2xl font-bold mb-2 text-purple-600">
            CUSTOMER LEDGER REPORT
          </h2>
          <p className="text-sm text-gray-600">Generated on: {currentDate}</p>
          {dateRange && (
            <p className="text-sm text-gray-600">
              Period: {new Date(dateRange.from).toLocaleDateString('en-IN')} to {new Date(dateRange.to).toLocaleDateString('en-IN')}
            </p>
          )}
        </div>

        {/* Customer Information */}
        <Card className="mb-6">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Customer Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Name:</strong> {customerData.name}</p>
                {customerData.company && (
                  <p><strong>Company:</strong> {customerData.company}</p>
                )}
                <p><strong>Email:</strong> {customerData.email || 'N/A'}</p>
              </div>
              <div>
                <p><strong>Phone:</strong> {customerData.phone || 'N/A'}</p>
                {customerData.gstin && (
                  <p><strong>GSTIN:</strong> {customerData.gstin}</p>
                )}
                <p><strong>Address:</strong> {customerData.address || 'N/A'}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Account Summary */}
        <Card className="mb-6">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Account Summary</h3>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-lg font-bold text-blue-600">₹{accountSummary.total_orders.toFixed(2)}</p>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <p className="text-sm text-gray-600">Total Payments</p>
                <p className="text-lg font-bold text-green-600">₹{accountSummary.total_payments.toFixed(2)}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-600">Current Balance</p>
                <p className={`text-lg font-bold ${accountSummary.current_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{accountSummary.current_balance.toFixed(2)}
                </p>
              </div>
              <div className="bg-red-50 p-3 rounded">
                <p className="text-sm text-gray-600">Amount Due</p>
                <p className="text-lg font-bold text-red-600">₹{accountSummary.total_due.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Ledger Entries */}
        <Card>
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Transaction History</h3>
            {ledgerEntries.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Debit</TableHead>
                    <TableHead>Credit</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Mode</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{new Date(entry.transaction_date).toLocaleDateString('en-IN')}</TableCell>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell className="capitalize">{entry.transaction_type}</TableCell>
                      <TableCell className="text-red-600">
                        {entry.debit_amount > 0 ? `₹${entry.debit_amount.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="text-green-600">
                        {entry.credit_amount > 0 ? `₹${entry.credit_amount.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className={`font-medium ${entry.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ₹{entry.balance.toFixed(2)}
                      </TableCell>
                      <TableCell className="capitalize">{entry.payment_mode || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-gray-500 text-center py-4">No transactions found</p>
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

CustomerLedgerReport.displayName = "CustomerLedgerReport";