import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FileText, FileSpreadsheet, Download, Calendar, DollarSign, Receipt, Filter } from "lucide-react";
import { ordersApi, type CustomerLedgerResponse } from "@/lib/ordersApi";
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface CustomerLedgerTabProps {
  customerId: string;
  customerName: string;
}

interface LedgerEntry {
  id: string;
  transaction_date: string;
  transaction_type: string;
  reference_type: string;
  reference_id: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
  balance: number;
  payment_mode?: string;
  order_no?: string;
  customer_po_no?: string;
}

export function CustomerLedgerTab({ customerId, customerName }: CustomerLedgerTabProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [ledgerData, setLedgerData] = useState<CustomerLedgerResponse | null>(null);
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    limit: 50,
    offset: 0
  });
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchLedgerData();
  }, [customerId]);

  const fetchLedgerData = async () => {
    try {
      setLoading(true);
      const data = await ordersApi.getCustomerLedger(customerId, {
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
        limit: filters.limit,
        offset: filters.offset
      });
      setLedgerData(data);
    } catch (error) {
      console.error('Error fetching ledger data:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch ledger data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = () => {
    setFilters(prev => ({ ...prev, offset: 0 }));
    fetchLedgerData();
  };

  const exportToPDF = async () => {
    if (!tableRef.current || !ledgerData) return;

    try {
      const canvas = await html2canvas(tableRef.current, {
        scale: 2,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4'); // landscape
      
      // Add title
      pdf.setFontSize(16);
      pdf.text(`Customer Ledger - ${customerName}`, 20, 20);
      
      // Add summary
      pdf.setFontSize(12);
      const summary = ledgerData.account_summary;
      pdf.text(`Total Orders: ₹${summary.total_orders.toLocaleString()}`, 20, 35);
      pdf.text(`Total Payments: ₹${summary.total_payments.toLocaleString()}`, 100, 35);
      pdf.text(`Current Balance: ₹${summary.current_balance.toLocaleString()}`, 180, 35);
      pdf.text(`Account Status: ${summary.account_status}`, 260, 35);
      
      // Add table image
      const imgWidth = 277; // A4 landscape width minus margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 15, 50, imgWidth, imgHeight);
      
      // Add footer
      pdf.setFontSize(8);
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, 20, pdf.internal.pageSize.height - 10);
      
      pdf.save(`Customer-Ledger-${customerName}-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: "Success",
        description: "Ledger exported to PDF successfully!",
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Error",
        description: "Failed to export PDF",
        variant: "destructive",
      });
    }
  };

  const exportToExcel = () => {
    if (!ledgerData) return;

    try {
      // Prepare summary data
      const summaryData = [
        ['Customer Ledger Report'],
        ['Customer Name', customerName],
        ['Generated On', new Date().toLocaleString()],
        [],
        ['Account Summary'],
        ['Total Orders', `₹${ledgerData.account_summary.total_orders.toLocaleString()}`],
        ['Total Payments', `₹${ledgerData.account_summary.total_payments.toLocaleString()}`],
        ['Current Balance', `₹${ledgerData.account_summary.current_balance.toLocaleString()}`],
        ['Total Due', `₹${ledgerData.account_summary.total_due.toLocaleString()}`],
        ['Account Status', ledgerData.account_summary.account_status.toUpperCase()],
        [],
        ['Ledger Entries'],
        ['Date', 'Type', 'Order No', 'PO No', 'Description', 'Payment Mode', 'Debit', 'Credit', 'Balance']
      ];

      // Add ledger entries
      ledgerData.ledger_entries.forEach((entry: LedgerEntry) => {
        summaryData.push([
          new Date(entry.transaction_date).toLocaleDateString(),
          entry.transaction_type.toUpperCase(),
          entry.order_no || '-',
          entry.customer_po_no || '-',
          entry.description,
          entry.payment_mode || '-',
          entry.debit_amount > 0 ? `₹${entry.debit_amount.toLocaleString()}` : '-',
          entry.credit_amount > 0 ? `₹${entry.credit_amount.toLocaleString()}` : '-',
          `₹${entry.balance.toLocaleString()}`
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(summaryData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Customer Ledger');

      // Style the header
      ws['!cols'] = [
        { width: 12 }, { width: 8 }, { width: 12 }, { width: 12 }, 
        { width: 25 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 15 }
      ];

      XLSX.writeFile(wb, `Customer-Ledger-${customerName}-${new Date().toISOString().split('T')[0]}.xlsx`);
      
      toast({
        title: "Success",
        description: "Ledger exported to Excel successfully!",
      });
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast({
        title: "Error",
        description: "Failed to export Excel",
        variant: "destructive",
      });
    }
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'text-red-600'; // Customer owes money
    if (balance < 0) return 'text-green-600'; // Customer has credit
    return 'text-gray-600';
  };

  const getTransactionBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case 'order':
        return <Badge variant="destructive">Order</Badge>;
      case 'payment':
        return <Badge variant="default" className="bg-green-100 text-green-800">Payment</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading ledger data...</div>;
  }

  if (!ledgerData) {
    return <div className="flex items-center justify-center p-8">No ledger data found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Account Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Account Summary
            </div>
            <div className="flex gap-2">
              <Button onClick={exportToPDF} variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-1" />
                Export PDF
              </Button>
              <Button onClick={exportToExcel} variant="outline" size="sm">
                <FileSpreadsheet className="h-4 w-4 mr-1" />
                Export Excel
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                ₹{ledgerData.account_summary.total_orders.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Total Orders</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                ₹{ledgerData.account_summary.total_payments.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Total Payments</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className={`text-2xl font-bold ${getBalanceColor(ledgerData.account_summary.current_balance)}`}>
                ₹{Math.abs(ledgerData.account_summary.current_balance).toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Current Balance</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Badge variant={ledgerData.account_summary.account_status === 'credit' ? 'default' : 'destructive'} className="text-lg px-3 py-1">
                {ledgerData.account_summary.account_status.toUpperCase()}
              </Badge>
              <div className="text-sm text-muted-foreground mt-1">Account Status</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div>
              <Label htmlFor="fromDate">From Date</Label>
              <Input
                id="fromDate"
                type="date"
                value={filters.fromDate}
                onChange={(e) => setFilters(prev => ({ ...prev, fromDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="toDate">To Date</Label>
              <Input
                id="toDate"
                type="date"
                value={filters.toDate}
                onChange={(e) => setFilters(prev => ({ ...prev, toDate: e.target.value }))}
              />
            </div>
            <Button onClick={handleFilterChange}>
              Apply Filters
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setFilters({ fromDate: '', toDate: '', limit: 50, offset: 0 });
                fetchLedgerData();
              }}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ledger Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Ledger Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div ref={tableRef} className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Order No</TableHead>
                  <TableHead>Purchase Order No</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Payment Mode</TableHead>
                  <TableHead className="text-right">Debit Amount</TableHead>
                  <TableHead className="text-right">Credit Amount</TableHead>
                  <TableHead className="text-right">Running Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerData.ledger_entries.map((entry: LedgerEntry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(entry.transaction_date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getTransactionBadge(entry.transaction_type)}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">
                        {entry.order_no || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {entry.customer_po_no || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{entry.description}</span>
                    </TableCell>
                    <TableCell>
                      {entry.payment_mode ? (
                        <Badge variant="outline">{entry.payment_mode}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.debit_amount > 0 ? (
                        <span className="font-medium text-red-600">
                          ₹{entry.debit_amount.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.credit_amount > 0 ? (
                        <span className="font-medium text-green-600">
                          ₹{entry.credit_amount.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-medium ${getBalanceColor(entry.balance)}`}>
                        ₹{Math.abs(entry.balance).toLocaleString()}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {ledgerData.ledger_entries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No ledger entries found</p>
                      <p className="text-sm text-muted-foreground">
                        Transactions will appear here once orders and payments are recorded
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {ledgerData.pagination.has_more && (
            <div className="flex justify-center mt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setFilters(prev => ({ ...prev, offset: prev.offset + prev.limit }));
                  fetchLedgerData();
                }}
                disabled={loading}
              >
                Load More
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}