import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/DashboardLayout'
import { DashboardCard } from '@/components/DashboardCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PurchaseOrderManager } from '@/components/PurchaseOrderManager'
import { PurchaseOrderTemplate } from '@/components/PurchaseOrderTemplate'
import { ProductManager } from '@/components/ProductManager'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { 
  Plus, 
  Search, 
  Package, 
  Truck, 
  ShoppingCart, 
  AlertTriangle, 
  FileText,
  Eye,
  Printer,
  ArrowRightLeft,
  DollarSign
} from 'lucide-react'

interface Vendor {
  id: string
  name: string
  contact_person: string
  email: string
  phone: string
  category: string
  is_active: boolean
  payment_terms?: string
  created_at: string
}

interface PurchaseOrder {
  id: string
  po_no: string
  vendor_id: string
  total_amount: number
  currency: string
  delivery_date: string
  status: string
  created_at: string
  vendors?: {
    name: string;
  };
  source_order_ids?: string[];
  order_source?: string;
}

interface Order {
  id: string
  order_no: string
  customer_id: string
  total_amount: number
  order_date: string
  status: string
  customers: {
    name: string;
    company?: string;
  };
}

export default function ProcurementDashboard() {
  const navigate = useNavigate()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [newVendorOpen, setNewVendorOpen] = useState(false)
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [newPOOpen, setNewPOOpen] = useState(false)
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [previewPO, setPreviewPO] = useState<any>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const { profile } = useAuth()
  const { toast } = useToast()

  const [newVendor, setNewVendor] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    gstin: '',
    pan: '',
    payment_terms: '',
    category: '',
  })

  useEffect(() => {
    fetchVendors()
    fetchPurchaseOrders()
    fetchOrders()
  }, [profile?.branch_id])

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('branch_id', profile?.branch_id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setVendors(data || [])
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch vendors',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchPurchaseOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          vendors (name)
        `)
        .eq('branch_id', profile?.branch_id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setPurchaseOrders(data || [])
    } catch (error) {
      console.error('Error fetching purchase orders:', error)
    }
  }

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, order_no, customer_id, total_amount, order_date, status,
          customers (name, company)
        `)
        .eq('branch_id', profile?.branch_id)
        .in('status', ['pending', 'confirmed'])
        .order('order_date', { ascending: false })
      
      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error('Error fetching orders:', error)
    }
  }

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const { error } = await supabase.from('vendors').insert([
        {
          ...newVendor,
          branch_id: profile?.branch_id,
          is_active: true,
        },
      ])

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Vendor added successfully',
      })

      setNewVendorOpen(false)
      setNewVendor({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        gstin: '',
        pan: '',
        payment_terms: '',
        category: '',
      })
      fetchVendors()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add vendor',
        variant: 'destructive',
      })
    }
  }

  const handleCreatePOFromOrders = () => {
    setNewPOOpen(true)
  }

  const handlePreviewPO = async (po: PurchaseOrder) => {
    try {
      const { data: poData, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          vendors (name, email, phone, contact_person, address, gstin),
          purchase_order_items (*)
        `)
        .eq('id', po.id)
        .single()

      if (error) throw error
      setPreviewPO(poData)
      setIsPreviewOpen(true)
    } catch (error) {
      console.error('Error fetching PO details:', error)
    }
  }

  const filteredVendors = vendors.filter(vendor =>
    (vendor.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (vendor.contact_person || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      received: 'bg-green-100 text-green-800',
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const stats = {
    totalVendors: vendors.length,
    activeVendors: vendors.filter(v => v.is_active).length,
    categories: [...new Set(vendors.map(v => v.category))].length,
    totalOrders: orders.length,
    totalPurchaseOrders: purchaseOrders.length,
    pendingPO: purchaseOrders.filter(po => po.status === 'pending').length,
  }

  return (
    <DashboardLayout title="Procurement Dashboard" subtitle="Manage vendors, purchase orders, and inventory">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <DashboardCard
            title="Total Vendors"
            value={stats.totalVendors.toString()}
            icon={Package}
            variant="blue"
          />
          <DashboardCard
            title="Active Vendors"
            value={stats.activeVendors.toString()}
            icon={Truck}
            variant="green"
          />
          <DashboardCard
            title="Pending Orders"
            value={stats.totalOrders.toString()}
            icon={ShoppingCart}
            variant="orange"
          />
          <DashboardCard
            title="Purchase Orders"
            value={stats.totalPurchaseOrders.toString()}
            icon={FileText}
            variant="purple"
          />
          <DashboardCard
            title="Pending POs"
            value={stats.pendingPO.toString()}
            icon={AlertTriangle}
            variant="red"
          />
          <DashboardCard
            title="Categories"
            value={stats.categories.toString()}
            icon={DollarSign}
            variant="blue"
          />
        </div>

        {/* Tabs for different sections */}
        <Tabs defaultValue="vendors" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="vendors">Vendors</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="orders">Orders to Process</TabsTrigger>
            <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
            <TabsTrigger 
              value="rfq" 
              asChild
            >
              <button onClick={() => navigate('/procurement/rfq')}>
                RFQ Management
              </button>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vendors" className="space-y-4">

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search vendors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              
              <Dialog open={newVendorOpen} onOpenChange={setNewVendorOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Vendor
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Vendor</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateVendor} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Vendor Name</Label>
                      <Input
                        id="name"
                        value={newVendor.name}
                        onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_person">Contact Person</Label>
                      <Input
                        id="contact_person"
                        value={newVendor.contact_person}
                        onChange={(e) => setNewVendor({ ...newVendor, contact_person: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newVendor.email}
                        onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={newVendor.phone}
                        onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Input
                        id="category"
                        value={newVendor.category}
                        onChange={(e) => setNewVendor({ ...newVendor, category: e.target.value })}
                        placeholder="e.g. Electronics, Raw Materials"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gstin">GST Number</Label>
                      <Input
                        id="gstin"
                        value={newVendor.gstin}
                        onChange={(e) => setNewVendor({ ...newVendor, gstin: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payment_terms">Payment Terms</Label>
                      <Input
                        id="payment_terms"
                        value={newVendor.payment_terms}
                        onChange={(e) => setNewVendor({ ...newVendor, payment_terms: e.target.value })}
                        placeholder="e.g. 30 days"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Textarea
                        id="address"
                        value={newVendor.address}
                        onChange={(e) => setNewVendor({ ...newVendor, address: e.target.value })}
                        rows={2}
                      />
                    </div>
                    <Button type="submit" className="w-full">Add Vendor</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Vendors Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Payment Terms</TableHead>
                    <TableHead>Status</TableHead>
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
                  ) : filteredVendors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        No vendors found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredVendors.map((vendor) => (
                      <TableRow key={vendor.id}>
                        <TableCell className="font-medium">{vendor.name}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{vendor.contact_person}</div>
                            <div className="text-sm text-muted-foreground">{vendor.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>{vendor.category}</TableCell>
                        <TableCell>{vendor.payment_terms || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(vendor.is_active ? 'active' : 'inactive')}>
                            {vendor.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(vendor.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <ProductManager />
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Orders Ready for Processing
                  <Button onClick={handleCreatePOFromOrders} disabled={orders.length === 0}>
                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                    Create Purchase Order
                  </Button>
                </CardTitle>
                <CardDescription>
                  Convert customer orders into purchase orders for vendors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order No</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            No pending orders found
                          </TableCell>
                        </TableRow>
                      ) : (
                        orders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">{order.order_no}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{order.customers?.name}</div>
                                {order.customers?.company && (
                                  <div className="text-sm text-muted-foreground">{order.customers.company}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{new Date(order.order_date).toLocaleDateString()}</TableCell>
                            <TableCell>₹{order.total_amount.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(order.status)}>
                                {order.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedOrders([order.id]);
                                  setNewPOOpen(true);
                                }}
                              >
                                Create PO
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="purchase-orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Purchase Orders
                  <Button onClick={() => setNewPOOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Purchase Order
                  </Button>
                </CardTitle>
                <CardDescription>
                  Manage all purchase orders and track deliveries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>PO No</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Currency</TableHead>
                        <TableHead>Delivery Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchaseOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            No purchase orders found
                          </TableCell>
                        </TableRow>
                      ) : (
                        purchaseOrders.map((po) => (
                          <TableRow key={po.id}>
                            <TableCell className="font-medium">{po.po_no}</TableCell>
                            <TableCell>{po.vendors?.name}</TableCell>
                            <TableCell>{po.currency === 'INR' ? '₹' : po.currency} {po.total_amount.toLocaleString()}</TableCell>
                            <TableCell>{po.currency}</TableCell>
                            <TableCell>
                              {po.delivery_date ? new Date(po.delivery_date).toLocaleDateString() : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(po.status)}>
                                {po.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {po.order_source === 'orders' ? `From ${po.source_order_ids?.length || 0} order(s)` : 'Manual'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePreviewPO(po)}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Purchase Order Manager Dialog */}
        <PurchaseOrderManager
          open={newPOOpen}
          onOpenChange={setNewPOOpen}
          sourceOrders={selectedOrders}
          onSuccess={() => {
            fetchPurchaseOrders();
            setSelectedOrders([]);
          }}
        />

        {/* Purchase Order Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Purchase Order Preview</DialogTitle>
            </DialogHeader>
            {previewPO && (
              <PurchaseOrderTemplate
                purchaseOrderData={{
                  po_no: previewPO.po_no,
                  delivery_date: previewPO.delivery_date,
                  terms_conditions: previewPO.terms_conditions,
                  subtotal: previewPO.subtotal,
                  tax_amount: previewPO.tax_amount,
                  total_amount: previewPO.total_amount,
                  currency: previewPO.currency,
                  exchange_rate: previewPO.exchange_rate
                }}
                items={previewPO.purchase_order_items || []}
                branchData={null}
                vendorData={previewPO.vendors}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}