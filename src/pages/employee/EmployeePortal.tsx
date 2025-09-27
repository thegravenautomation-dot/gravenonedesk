import React, { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { DashboardCard } from '@/components/DashboardCard'
import { AIAssistant } from '@/components/AIAssistant'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { leaveRequestSchema, type LeaveRequestData } from '@/lib/validations'
import { 
  User, 
  Calendar, 
  DollarSign, 
  FileText, 
  Clock, 
  CreditCard,
  Plus,
  CheckCircle,
  XCircle,
  Bot
} from 'lucide-react'

interface LeaveRequest {
  id: string
  leave_type: string
  start_date: string
  end_date: string
  reason?: string
  status: string
  created_at: string
  employee_id: string
  branch_id: string
}

interface EmployeeData {
  id: string
  employee_id: string
  full_name: string
  email?: string
  phone?: string
  department?: string
  designation?: string
  basic_salary?: number
  status: string
}

export default function EmployeePortal() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [newLeaveOpen, setNewLeaveOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const { profile } = useAuth()
  const { toast } = useToast()

  const [newLeave, setNewLeave] = useState<LeaveRequestData>({
    leave_type: '',
    start_date: '',
    end_date: '',
    reason: '',
  })

  useEffect(() => {
    fetchEmployeeData()
  }, [])

  const fetchEmployeeData = async () => {
    if (!profile?.id) return
    
    try {
      setLoading(true)
      
      // Fetch leave requests
      const { data: leaves, error: leavesError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', profile.id)
        .order('created_at', { ascending: false })

      if (leavesError && leavesError.code !== 'PGRST116') {
        console.error('Leave requests error:', leavesError)
        throw new Error('Failed to fetch leave requests')
      }
      
      setLeaveRequests(leaves || [])

      // Fetch employee data
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('profile_id', profile.id)
        .single()

      if (employeeError && employeeError.code !== 'PGRST116') {
        console.error('Employee data error:', employeeError)
      } else {
        setEmployeeData(employee || null)
      }

    } catch (error: any) {
      console.error('Fetch error:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch employee data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setValidationErrors({})
    
    if (!profile?.id || !profile?.branch_id) {
      toast({
        title: 'Error',
        description: 'User profile not found',
        variant: 'destructive',
      })
      setSubmitting(false)
      return
    }
    
    try {
      // Validate form data using Zod schema
      const validatedData = leaveRequestSchema.parse(newLeave)
      
      const { error } = await supabase.from('leave_requests').insert([
        {
          leave_type: validatedData.leave_type as any, // Cast to enum type
          start_date: validatedData.start_date,
          end_date: validatedData.end_date,
          reason: validatedData.reason,
          employee_id: profile.id,
          branch_id: profile.branch_id,
          status: 'pending',
        },
      ])

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Leave request submitted successfully',
      })

      setNewLeaveOpen(false)
      setNewLeave({
        leave_type: '',
        start_date: '',
        end_date: '',
        reason: '',
      })
      fetchEmployeeData()
    } catch (error: any) {
      console.error('Leave request error:', error)
      
      if (error.errors) {
        // Handle Zod validation errors
        const errors: Record<string, string> = {}
        error.errors.forEach((err: any) => {
          errors[err.path[0]] = err.message
        })
        setValidationErrors(errors)
        
        toast({
          title: 'Validation Error',
          description: 'Please check the form for errors and try again.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Error',
          description: error.message || 'Failed to submit leave request',
          variant: 'destructive',
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleLeaveChange = (field: keyof LeaveRequestData, value: string) => {
    setNewLeave(prev => ({ ...prev, [field]: value }))
    // Clear field error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const getFieldError = (field: string) => validationErrors[field] || ''

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const currentSalary = employeeData?.basic_salary || 0

  if (loading) {
    return (
      <DashboardLayout title="Employee Portal" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Employee Portal" subtitle="Manage your profile, leaves, and employee information">
      <div className="space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <DashboardCard
            title="Current Salary"
            value={currentSalary ? `₹${(currentSalary / 1000).toFixed(0)}K` : '₹0'}
            icon={DollarSign}
            variant="green"
          />
          <DashboardCard
            title="Leave Balance"
            value="18 days"
            icon={Calendar}
            variant="blue"
          />
          <DashboardCard
            title="Pending Requests"
            value={leaveRequests.filter(r => r.status === 'pending').length.toString()}
            icon={Clock}
            variant="orange"
          />
          <DashboardCard
            title="Employee ID"
            value={employeeData?.employee_id || profile?.employee_id || 'N/A'}
            icon={CreditCard}
            variant="purple"
          />
        </div>

        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="leaves">Leaves</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="ai-assistant">
              <Bot className="h-4 w-4 mr-1" />
              AI Assistant
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Dialog open={newLeaveOpen} onOpenChange={setNewLeaveOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full justify-start" variant="outline">
                        <Calendar className="mr-2 h-4 w-4" />
                        Apply for Leave
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Apply for Leave</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleLeaveRequest} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="leave_type">Leave Type *</Label>
                          <Select value={newLeave.leave_type} onValueChange={(value) => handleLeaveChange('leave_type', value)}>
                            <SelectTrigger className={getFieldError('leave_type') ? 'border-red-500' : ''}>
                              <SelectValue placeholder="Select leave type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="casual">Casual Leave</SelectItem>
                              <SelectItem value="sick">Sick Leave</SelectItem>
                              <SelectItem value="annual">Annual Leave</SelectItem>
                              <SelectItem value="maternity">Maternity Leave</SelectItem>
                              <SelectItem value="paternity">Paternity Leave</SelectItem>
                            </SelectContent>
                          </Select>
                          {getFieldError('leave_type') && (
                            <p className="text-sm text-red-600 mt-1">{getFieldError('leave_type')}</p>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="start_date">Start Date *</Label>
                            <Input
                              id="start_date"
                              type="date"
                              value={newLeave.start_date}
                              onChange={(e) => handleLeaveChange('start_date', e.target.value)}
                              className={getFieldError('start_date') ? 'border-red-500' : ''}
                              required
                            />
                            {getFieldError('start_date') && (
                              <p className="text-sm text-red-600 mt-1">{getFieldError('start_date')}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="end_date">End Date *</Label>
                            <Input
                              id="end_date"
                              type="date"
                              value={newLeave.end_date}
                              onChange={(e) => handleLeaveChange('end_date', e.target.value)}
                              className={getFieldError('end_date') ? 'border-red-500' : ''}
                              required
                            />
                            {getFieldError('end_date') && (
                              <p className="text-sm text-red-600 mt-1">{getFieldError('end_date')}</p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="reason">Reason *</Label>
                          <Textarea
                            id="reason"
                            value={newLeave.reason}
                            onChange={(e) => handleLeaveChange('reason', e.target.value)}
                            className={getFieldError('reason') ? 'border-red-500' : ''}
                            placeholder="Reason for leave (minimum 5 characters)..."
                            required
                          />
                          {getFieldError('reason') && (
                            <p className="text-sm text-red-600 mt-1">{getFieldError('reason')}</p>
                          )}
                        </div>
                        <Button type="submit" className="w-full" disabled={submitting}>
                          {submitting ? 'Submitting...' : 'Submit Leave Request'}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>

                  <Button className="w-full justify-start" variant="outline">
                    <FileText className="mr-2 h-4 w-4" />
                    View Profile Information
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activities</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-success mt-1" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Salary credited</p>
                      <p className="text-xs text-muted-foreground">2 days ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 text-info mt-1" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Leave approved</p>
                      <p className="text-xs text-muted-foreground">1 week ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 text-primary mt-1" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Profile updated</p>
                      <p className="text-xs text-muted-foreground">1 month ago</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="leaves" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Leave Requests</h3>
              <Dialog open={newLeaveOpen} onOpenChange={setNewLeaveOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Leave Request
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied On</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveRequests.map((leave) => (
                    <TableRow key={leave.id}>
                      <TableCell className="font-medium capitalize">{leave.leave_type}</TableCell>
                      <TableCell>{new Date(leave.start_date).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(leave.end_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {Math.ceil((new Date(leave.end_date).getTime() - new Date(leave.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(leave.status)}>
                          {leave.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(leave.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                  {leaveRequests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No leave requests found. Click "New Leave Request" to submit your first request.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Full Name</Label>
                    <Input value={employeeData?.full_name || profile?.full_name || ''} disabled />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input value={employeeData?.email || profile?.email || ''} disabled />
                  </div>
                  <div>
                    <Label>Employee ID</Label>
                    <Input value={employeeData?.employee_id || profile?.employee_id || ''} disabled />
                  </div>
                  <div>
                    <Label>Department</Label>
                    <Input value={employeeData?.department || profile?.department || ''} disabled />
                  </div>
                  <div>
                    <Label>Designation</Label>
                    <Input value={employeeData?.designation || profile?.designation || ''} disabled />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={employeeData?.phone || profile?.phone || ''} disabled />
                  </div>
                </div>
                {employeeData && (
                  <div className="pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Basic Salary</Label>
                        <Input value={employeeData.basic_salary ? `₹${employeeData.basic_salary.toLocaleString()}` : 'N/A'} disabled />
                      </div>
                      <div>
                        <Label>Status</Label>
                        <Input value={employeeData.status || 'N/A'} disabled className="capitalize" />
                      </div>
                    </div>
                  </div>
                )}
                <div className="pt-4">
                  <Button variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Request Profile Update
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai-assistant" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AIAssistant className="lg:col-span-2" />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}