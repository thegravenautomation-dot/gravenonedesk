import React, { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { DashboardCard } from '@/components/DashboardCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Plus, Search, Truck, Package, Clock, CheckCircle } from 'lucide-react'

interface DispatchOrder {
  id: string
  order_number: string
  customer_name: string
  destination: string
  transporter: string
  status: 'pending' | 'in_transit' | 'delivered' | 'cancelled'
  dispatch_date: string
  expected_delivery: string
  created_at: string
}

export default function DispatchDashboard() {
  const [orders, setOrders] = useState<DispatchOrder[]>([
    {
      id: '1',
      order_number: 'ORD-001',
      customer_name: 'ABC Industries',
      destination: 'Mumbai, Maharashtra',
      transporter: 'XYZ Logistics',
      status: 'pending',
      dispatch_date: new Date().toISOString(),
      expected_delivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      order_number: 'ORD-002',
      customer_name: 'Tech Solutions Ltd',
      destination: 'Delhi, Delhi',
      transporter: 'Quick Transport',
      status: 'in_transit',
      dispatch_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      expected_delivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
  ])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [newOrderOpen, setNewOrderOpen] = useState(false)
  const { toast } = useToast()

  const [newOrder, setNewOrder] = useState({
    order_number: '',
    customer_name: '',
    destination: '',
    transporter: '',
    expected_delivery: '',
  })

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const orderNumber = `ORD-${Date.now().toString().slice(-6)}`
      const newOrderData: DispatchOrder = {
        id: Date.now().toString(),
        order_number: orderNumber,
        customer_name: newOrder.customer_name,
        destination: newOrder.destination,
        transporter: newOrder.transporter,
        status: 'pending',
        dispatch_date: new Date().toISOString(),
        expected_delivery: newOrder.expected_delivery,
        created_at: new Date().toISOString(),
      }

      setOrders(prev => [newOrderData, ...prev])

      toast({
        title: 'Success',
        description: 'Dispatch order created successfully',
      })

      setNewOrderOpen(false)
      setNewOrder({
        order_number: '',
        customer_name: '',
        destination: '',
        transporter: '',
        expected_delivery: '',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create dispatch order',
        variant: 'destructive',
      })
    }
  }

  const updateOrderStatus = (orderId: string, status: DispatchOrder['status']) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, status } : order
    ))
    toast({
      title: 'Success',
      description: 'Order status updated successfully',
    })
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_transit: 'bg-blue-100 text-blue-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const stats = {
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.status === 'pending').length,
    inTransit: orders.filter(o => o.status === 'in_transit').length,
    deliveredToday: orders.filter(o => 
      o.status === 'delivered' && 
      new Date(o.dispatch_date).toDateString() === new Date().toDateString()
    ).length,
  }

  return (
    <DashboardLayout title="Dispatch Dashboard" subtitle="Manage orders, shipments, and delivery tracking">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <DashboardCard
            title="Total Orders"
            value={stats.totalOrders.toString()}
            icon={Package}
            variant="blue"
          />
          <DashboardCard
            title="Pending"
            value={stats.pendingOrders.toString()}
            icon={Clock}
            variant="orange"
          />
          <DashboardCard
            title="In Transit"
            value={stats.inTransit.toString()}
            icon={Truck}
            variant="purple"
          />
          <DashboardCard
            title="Delivered Today"
            value={stats.deliveredToday.toString()}
            icon={CheckCircle}
            variant="green"
          />
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Dialog open={newOrderOpen} onOpenChange={setNewOrderOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Dispatch Order</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateOrder} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_name">Customer Name</Label>
                  <Input
                    id="customer_name"
                    value={newOrder.customer_name}
                    onChange={(e) => setNewOrder({ ...newOrder, customer_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destination">Destination</Label>
                  <Input
                    id="destination"
                    value={newOrder.destination}
                    onChange={(e) => setNewOrder({ ...newOrder, destination: e.target.value })}
                    placeholder="City, State"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transporter">Transporter</Label>
                  <Input
                    id="transporter"
                    value={newOrder.transporter}
                    onChange={(e) => setNewOrder({ ...newOrder, transporter: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expected_delivery">Expected Delivery</Label>
                  <Input
                    id="expected_delivery"
                    type="date"
                    value={newOrder.expected_delivery}
                    onChange={(e) => setNewOrder({ ...newOrder, expected_delivery: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">Create Order</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Orders Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Transporter</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expected Delivery</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell>{order.customer_name}</TableCell>
                    <TableCell>{order.destination}</TableCell>
                    <TableCell>{order.transporter}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(order.expected_delivery).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={order.status} 
                        onValueChange={(value) => updateOrderStatus(order.id, value as DispatchOrder['status'])}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_transit">In Transit</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
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