import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, RotateCcw, FileText, TrendingUp, TrendingDown, FileBarChart, FileSpreadsheet } from "lucide-react";
import { CustomerLedgerReport } from "./reports/CustomerLedgerReport";
import { exportToPDF, exportCustomerLedgerToExcel } from "@/lib/reportExports";

interface CustomerLedgerProps {
  customerId?: string;
}

interface LedgerEntry {
  id?: string;
  customer_id: string;
  transaction_date: string;
  transaction_type: string;
  reference_type?: string;
  reference_id?: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
  balance: number;
  is_editable: boolean;
}

export function CustomerLedger({ customerId }: CustomerLedgerProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(customerId || "");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [branchData, setBranchData] = useState<any>(null);
  const [accountSummary, setAccountSummary] = useState<any>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const [entryData, setEntryData] = useState<LedgerEntry>({
    customer_id: customerId || "",
    transaction_date: new Date().toISOString().split('T')[0],
    transaction_type: "adjustment",
    description: "",
    debit_amount: 0,
    credit_amount: 0,
    balance: 0,
    is_editable: true
  });

  useEffect(() => {
    if (profile?.branch_id) {
      fetchCustomers();
      fetchBranchData();
    }
  }, [profile?.branch_id]);

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

  useEffect(() => {
    if (selectedCustomerId) {
      fetchLedgerEntries();
      fetchAccountSummary();
    }
  }, [selectedCustomerId]);

  const fetchAccountSummary = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_customer_account_summary', { p_customer_id: selectedCustomerId });

      if (error) throw error;
      setAccountSummary(data[0] || { total_orders: 0, total_payments: 0, current_balance: 0, total_due: 0 });
    } catch (error) {
      console.error('Error fetching account summary:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, company')
        .eq('branch_id', profile?.branch_id)
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchLedgerEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_ledger')
        .select('*')
        .eq('customer_id', selectedCustomerId)
        .eq('branch_id', profile?.branch_id)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLedgerEntries(data || []);
    } catch (error) {
      console.error('Error fetching ledger entries:', error);
    }
  };

  const recalculateBalance = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase.rpc('recalculate_customer_balance', {
        customer_uuid: selectedCustomerId
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Customer balance recalculated successfully",
      });

      fetchLedgerEntries();
    } catch (error) {
      console.error('Error recalculating balance:', error);
      toast({
        title: "Error",
        description: "Failed to recalculate balance",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEntry = async () => {
    try {
      if (!entryData.customer_id || !entryData.description) {
        toast({
          title: "Error",
          description: "Please fill all required fields",
          variant: "destructive",
        });
        return;
      }

      if (entryData.debit_amount === 0 && entryData.credit_amount === 0) {
        toast({
          title: "Error",
          description: "Please enter either debit or credit amount",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);

      const entryPayload = {
        ...entryData,
        branch_id: profile?.branch_id,
        created_by: profile?.id
      };

      if (editingEntry?.id) {
        // Update existing entry
        const { error } = await supabase
          .from('customer_ledger')
          .update(entryPayload)
          .eq('id', editingEntry.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Ledger entry updated successfully",
        });
      } else {
        // Create new entry
        const { error } = await supabase
          .from('customer_ledger')
          .insert(entryPayload);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Ledger entry created successfully",
        });
      }

      setIsDialogOpen(false);
      setEditingEntry(null);
      resetForm();
      
      // Recalculate balance after adding/updating entry
      await recalculateBalance();
    } catch (error) {
      console.error('Error saving ledger entry:', error);
      toast({
        title: "Error",
        description: "Failed to save ledger entry",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEntryData({
      customer_id: selectedCustomerId,
      transaction_date: new Date().toISOString().split('T')[0],
      transaction_type: "adjustment",
      description: "",
      debit_amount: 0,
      credit_amount: 0,
      balance: 0,
      is_editable: true
    });
  };

  const handleEdit = (entry: any) => {
    if (!entry.is_editable) {
      toast({
        title: "Warning",
        description: "This entry is system-generated and cannot be edited",
        variant: "destructive",
      });
      return;
    }

    setEditingEntry(entry);
    setEntryData({
      ...entry,
      transaction_date: entry.transaction_date ? new Date(entry.transaction_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setEditingEntry(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const getTransactionTypeLabel = (type: string) => {
    const types = {
      order: 'Order',
      payment: 'Payment',
      invoice: 'Invoice',
      adjustment: 'Manual Adjustment'
    };
    return types[type as keyof typeof types] || type;
  };

  const getCurrentBalance = () => {
    if (ledgerEntries.length === 0) return 0;
    return ledgerEntries[0].balance || 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Customer Ledger</h2>
          <p className="text-muted-foreground">Track customer account transactions and balance</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={recalculateBalance} disabled={loading || !selectedCustomerId}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Recalculate Balance
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleNew} disabled={!selectedCustomerId}>
                <Plus className="h-4 w-4 mr-2" />
                Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingEntry ? 'Edit Ledger Entry' : 'Add Manual Entry'}
                </DialogTitle>
                <DialogDescription>
                  {editingEntry ? 'Update ledger entry details' : 'Add a manual adjustment to customer ledger'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="customer_id">Customer *</Label>
                  <Select value={entryData.customer_id} onValueChange={(value) => setEntryData({...entryData, customer_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name} {customer.company && `(${customer.company})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="transaction_date">Date *</Label>
                  <Input
                    id="transaction_date"
                    type="date"
                    value={entryData.transaction_date}
                    onChange={(e) => setEntryData({...entryData, transaction_date: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={entryData.description}
                    onChange={(e) => setEntryData({...entryData, description: e.target.value})}
                    placeholder="Enter transaction description"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="debit_amount">Debit Amount</Label>
                    <Input
                      id="debit_amount"
                      type="number"
                      value={entryData.debit_amount}
                      onChange={(e) => setEntryData({...entryData, debit_amount: parseFloat(e.target.value) || 0})}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <Label htmlFor="credit_amount">Credit Amount</Label>
                    <Input
                      id="credit_amount"
                      type="number"
                      value={entryData.credit_amount}
                      onChange={(e) => setEntryData({...entryData, credit_amount: parseFloat(e.target.value) || 0})}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEntry} disabled={loading}>
                  {loading ? 'Saving...' : (editingEntry ? 'Update Entry' : 'Add Entry')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!customerId && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex space-x-4 items-end">
              <div className="flex-1">
                <Label htmlFor="customer_select">Select Customer</Label>
                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a customer to view ledger" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} {customer.company && `(${customer.company})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedCustomerId && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Customer Balance
                <div className="flex items-center space-x-2">
                  {getCurrentBalance() >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  )}
                  <span className={`text-2xl font-bold ${getCurrentBalance() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{Math.abs(getCurrentBalance()).toLocaleString()}
                    {getCurrentBalance() >= 0 ? ' (Credit)' : ' (Debit)'}
                  </span>
                </div>
              </CardTitle>
              <CardDescription>
                Current account balance for selected customer
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                Complete transaction history with running balance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Debit</TableHead>
                      <TableHead>Credit</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          {new Date(entry.transaction_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{entry.description}</TableCell>
                        <TableCell>
                          <Badge variant={entry.is_editable ? "secondary" : "outline"}>
                            {getTransactionTypeLabel(entry.transaction_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-red-600">
                          {entry.debit_amount > 0 && `₹${entry.debit_amount.toLocaleString()}`}
                        </TableCell>
                        <TableCell className="text-green-600">
                          {entry.credit_amount > 0 && `₹${entry.credit_amount.toLocaleString()}`}
                        </TableCell>
                        <TableCell className={entry.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                          ₹{Math.abs(entry.balance).toLocaleString()}
                          {entry.balance >= 0 ? ' Cr' : ' Dr'}
                        </TableCell>
                        <TableCell>
                          {entry.is_editable && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(entry)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {ledgerEntries.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">
                          No transactions found for this customer
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Report Dialog */}
          <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Customer Ledger Report</DialogTitle>
                <DialogDescription>
                  View and export ledger report for {customers.find(c => c.id === selectedCustomerId)?.name}
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex gap-2 mb-4">
                <Button onClick={handleExportPDF} variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                <Button onClick={handleExportExcel} variant="outline">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
              </div>

              {selectedCustomerId && accountSummary && (
                <CustomerLedgerReport
                  ref={reportRef}
                  customerData={customers.find(c => c.id === selectedCustomerId) || { name: 'Unknown' }}
                  ledgerEntries={ledgerEntries}
                  branchData={branchData}
                  accountSummary={accountSummary}
                />
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}