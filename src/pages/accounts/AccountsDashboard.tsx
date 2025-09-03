import React, { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { DashboardCard } from '@/components/DashboardCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Plus, Search, Receipt, CreditCard, AlertCircle, TrendingUp } from 'lucide-react'

interface Invoice {
  id: string
  invoice_number: string
  customer_name: string
  customer_gst: string
  subtotal: number
  cgst: number
  sgst: number
  igst: number
  total_amount: number
  payment_status: string
  due_date: string
  created_at: string
}

export default function AccountsDashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [newInvoiceOpen, setNewInvoiceOpen] = useState(false)
  const { profile } = useAuth()
  const { toast } = useToast()

  const [newInvoice, setNewInvoice] = useState({
    customer_name: '',
    customer_gst: '',
    subtotal: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    due_date: '',
  })

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setInvoices(data || [])
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch invoices',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const invoiceNumber = `INV-${Date.now()}`
      const totalAmount = newInvoice.subtotal + newInvoice.cgst + newInvoice.sgst + newInvoice.igst

      const { error } = await supabase.from('invoices').insert([
        {
          ...newInvoice,
          invoice_number: invoiceNumber,
          total_amount: totalAmount,
          payment_status: 'pending',
          branch_id: profile?.branch_id,
          created_by: profile?.id,
          items: [],
        },
      ])

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Invoice created successfully',
      })

      setNewInvoiceOpen(false)
      setNewInvoice({
        customer_name: '',
        customer_gst: '',
        subtotal: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        due_date: '',
      })
      fetchInvoices()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create invoice',
        variant: 'destructive',
      })
    }
  }

  const filteredInvoices = invoices.filter(invoice =>
    invoice.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      partial: 'bg-orange-100 text-orange-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const stats = {
    totalInvoices: invoices.length,
    totalRevenue: invoices.reduce((sum, inv) => sum + inv.total_amount, 0),
    pendingAmount: invoices
      .filter(inv => inv.payment_status === 'pending' || inv.payment_status === 'partial')
      .reduce((sum, inv) => sum + inv.total_amount, 0),
    overdueInvoices: invoices.filter(inv => 
      inv.payment_status !== 'paid' && new Date(inv.due_date) < new Date()
    ).length,
  }

  return (
    <DashboardLayout title="Accounts Dashboard" subtitle="Manage invoices, payments, and financial records">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <DashboardCard
            title="Total Invoices"
            value={stats.totalInvoices.toString()}
            icon={Receipt}
            variant="blue"
          />
          <DashboardCard
            title="Total Revenue"
            value={`₹${(stats.totalRevenue / 100000).toFixed(1)}L`}
            icon={TrendingUp}
            variant="green"
          />
          <DashboardCard
            title="Pending Amount"
            value={`₹${(stats.pendingAmount / 100000).toFixed(1)}L`}
            icon={CreditCard}
            variant="orange"
          />
          <DashboardCard
            title="Overdue"
            value={stats.overdueInvoices.toString()}
            icon={AlertCircle}
            variant="red"
          />
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <Dialog open={newInvoiceOpen} onOpenChange={setNewInvoiceOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Invoice</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateInvoice} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_name">Customer Name</Label>
                  <Input
                    id="customer_name"
                    value={newInvoice.customer_name}
                    onChange={(e) => setNewInvoice({ ...newInvoice, customer_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_gst">Customer GST</Label>
                  <Input
                    id="customer_gst"
                    value={newInvoice.customer_gst}
                    onChange={(e) => setNewInvoice({ ...newInvoice, customer_gst: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subtotal">Subtotal (₹)</Label>
                  <Input
                    id="subtotal"
                    type="number"
                    value={newInvoice.subtotal}
                    onChange={(e) => setNewInvoice({ ...newInvoice, subtotal: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="cgst">CGST (₹)</Label>
                    <Input
                      id="cgst"
                      type="number"
                      value={newInvoice.cgst}
                      onChange={(e) => setNewInvoice({ ...newInvoice, cgst: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sgst">SGST (₹)</Label>
                    <Input
                      id="sgst"
                      type="number"
                      value={newInvoice.sgst}
                      onChange={(e) => setNewInvoice({ ...newInvoice, sgst: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="igst">IGST (₹)</Label>
                    <Input
                      id="igst"
                      type="number"
                      value={newInvoice.igst}
                      onChange={(e) => setNewInvoice({ ...newInvoice, igst: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={newInvoice.due_date}
                    onChange={(e) => setNewInvoice({ ...newInvoice, due_date: e.target.value })}
                    required
                  />
                </div>
                <div className="text-lg font-semibold">
                  Total: ₹{(newInvoice.subtotal + newInvoice.cgst + newInvoice.sgst + newInvoice.igst).toLocaleString()}
                </div>
                <Button type="submit" className="w-full">Create Invoice</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Invoices Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No invoices found
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{invoice.customer_name}</div>
                        {invoice.customer_gst && (
                          <div className="text-sm text-muted-foreground">GST: {invoice.customer_gst}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>₹{invoice.total_amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(invoice.payment_status)}>
                        {invoice.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(invoice.due_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(invoice.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  )
}