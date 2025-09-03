import React, { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { DashboardCard } from '@/components/DashboardCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Plus, Search, Filter, TrendingUp, Users, Target, DollarSign } from 'lucide-react'

interface Lead {
  id: string
  company_name: string
  contact_person: string
  email: string
  phone: string
  source: string
  status: string
  requirements: string
  budget: number
  created_at: string
}

export default function SalesDashboard() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [newLeadOpen, setNewLeadOpen] = useState(false)
  const { profile } = useAuth()
  const { toast } = useToast()

  const [newLead, setNewLead] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    source: 'website',
    requirements: '',
    budget: 0,
  })

  useEffect(() => {
    fetchLeads()
  }, [])

  const fetchLeads = async () => {
    try {
      let query = supabase.from('leads').select('*')
      
      if (profile?.role !== 'admin' && profile?.role !== 'manager') {
        query = query.eq('assigned_to', profile?.id)
      }
      
      const { data, error } = await query.order('created_at', { ascending: false })
      
      if (error) throw error
      setLeads(data || [])
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch leads',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const { error } = await supabase.from('leads').insert([
        {
          ...newLead,
          assigned_to: profile?.id,
          branch_id: profile?.branch_id,
          status: 'new',
        },
      ])

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Lead created successfully',
      })

      setNewLeadOpen(false)
      setNewLead({
        company_name: '',
        contact_person: '',
        email: '',
        phone: '',
        source: 'website',
        requirements: '',
        budget: 0,
      })
      fetchLeads()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create lead',
        variant: 'destructive',
      })
    }
  }

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.contact_person.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      qualified: 'bg-purple-100 text-purple-800',
      proposal: 'bg-orange-100 text-orange-800',
      negotiation: 'bg-pink-100 text-pink-800',
      closed_won: 'bg-green-100 text-green-800',
      closed_lost: 'bg-red-100 text-red-800',
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const stats = {
    totalLeads: leads.length,
    newLeads: leads.filter(l => l.status === 'new').length,
    qualifiedLeads: leads.filter(l => l.status === 'qualified').length,
    totalValue: leads.reduce((sum, lead) => sum + (lead.budget || 0), 0),
  }

  return (
    <DashboardLayout title="Sales Dashboard" subtitle="Manage leads, quotations, and sales pipeline">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <DashboardCard
            title="Total Leads"
            value={stats.totalLeads.toString()}
            icon={Users}
            variant="blue"
          />
          <DashboardCard
            title="New Leads"
            value={stats.newLeads.toString()}
            icon={TrendingUp}
            variant="green"
          />
          <DashboardCard
            title="Qualified"
            value={stats.qualifiedLeads.toString()}
            icon={Target}
            variant="purple"
          />
          <DashboardCard
            title="Pipeline Value"
            value={`₹${(stats.totalValue / 100000).toFixed(1)}L`}
            icon={DollarSign}
            variant="orange"
          />
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="proposal">Proposal</SelectItem>
                <SelectItem value="negotiation">Negotiation</SelectItem>
                <SelectItem value="closed_won">Closed Won</SelectItem>
                <SelectItem value="closed_lost">Closed Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Dialog open={newLeadOpen} onOpenChange={setNewLeadOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Lead</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateLead} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    id="company_name"
                    value={newLead.company_name}
                    onChange={(e) => setNewLead({ ...newLead, company_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_person">Contact Person</Label>
                  <Input
                    id="contact_person"
                    value={newLead.contact_person}
                    onChange={(e) => setNewLead({ ...newLead, contact_person: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newLead.email}
                    onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newLead.phone}
                    onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="source">Lead Source</Label>
                  <Select value={newLead.source} onValueChange={(value) => setNewLead({ ...newLead, source: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="indiamart">IndiaMART</SelectItem>
                      <SelectItem value="tradeindia">TradeIndia</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="call">Cold Call</SelectItem>
                      <SelectItem value="email">Email Campaign</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget">Budget (₹)</Label>
                  <Input
                    id="budget"
                    type="number"
                    value={newLead.budget}
                    onChange={(e) => setNewLead({ ...newLead, budget: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="requirements">Requirements</Label>
                  <Textarea
                    id="requirements"
                    value={newLead.requirements}
                    onChange={(e) => setNewLead({ ...newLead, requirements: e.target.value })}
                    rows={3}
                  />
                </div>
                <Button type="submit" className="w-full">Create Lead</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Leads Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Budget</TableHead>
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
              ) : filteredLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No leads found
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.company_name}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{lead.contact_person}</div>
                        <div className="text-sm text-muted-foreground">{lead.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{lead.source}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(lead.status)}>
                        {lead.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>₹{lead.budget?.toLocaleString() || 0}</TableCell>
                    <TableCell>
                      {new Date(lead.created_at).toLocaleDateString()}
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