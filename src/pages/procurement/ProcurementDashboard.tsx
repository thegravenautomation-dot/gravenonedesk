import React, { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { DashboardCard } from '@/components/DashboardCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Plus, Search, Package, Truck, ShoppingCart, AlertTriangle } from 'lucide-react'

interface Vendor {
  id: string
  vendor_name: string
  contact_person: string
  email: string
  phone: string
  category: string
  status: string
  payment_terms?: string
  created_at: string
}

export default function ProcurementDashboard() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [newVendorOpen, setNewVendorOpen] = useState(false)
  const { profile } = useAuth()
  const { toast } = useToast()

  const [newVendor, setNewVendor] = useState({
    vendor_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    gst_number: '',
    pan_number: '',
    payment_terms: '',
    category: '',
  })

  useEffect(() => {
    fetchVendors()
  }, [])

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
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

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const { error } = await supabase.from('vendors').insert([
        {
          ...newVendor,
          branch_id: profile?.branch_id,
          status: 'active',
        },
      ])

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Vendor added successfully',
      })

      setNewVendorOpen(false)
      setNewVendor({
        vendor_name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        gst_number: '',
        pan_number: '',
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

  const filteredVendors = vendors.filter(vendor =>
    vendor.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.contact_person.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-red-100 text-red-800',
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const stats = {
    totalVendors: vendors.length,
    activeVendors: vendors.filter(v => v.status === 'active').length,
    categories: [...new Set(vendors.map(v => v.category))].length,
    newVendors: vendors.filter(v => {
      const created = new Date(v.created_at)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return created >= thirtyDaysAgo
    }).length,
  }

  return (
    <DashboardLayout title="Procurement Dashboard" subtitle="Manage vendors, purchase orders, and inventory">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            title="Categories"
            value={stats.categories.toString()}
            icon={ShoppingCart}
            variant="purple"
          />
          <DashboardCard
            title="New This Month"
            value={stats.newVendors.toString()}
            icon={AlertTriangle}
            variant="orange"
          />
        </div>

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
                  <Label htmlFor="vendor_name">Vendor Name</Label>
                  <Input
                    id="vendor_name"
                    value={newVendor.vendor_name}
                    onChange={(e) => setNewVendor({ ...newVendor, vendor_name: e.target.value })}
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
                  <Label htmlFor="gst_number">GST Number</Label>
                  <Input
                    id="gst_number"
                    value={newVendor.gst_number}
                    onChange={(e) => setNewVendor({ ...newVendor, gst_number: e.target.value })}
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
                    <TableCell className="font-medium">{vendor.vendor_name}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{vendor.contact_person}</div>
                        <div className="text-sm text-muted-foreground">{vendor.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{vendor.category}</TableCell>
                    <TableCell>{vendor.payment_terms || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(vendor.status)}>
                        {vendor.status}
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
      </div>
    </DashboardLayout>
  )
}