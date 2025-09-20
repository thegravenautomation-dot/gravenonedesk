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
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { 
  User, 
  Calendar, 
  DollarSign, 
  FileText, 
  Clock, 
  CreditCard,
  Download,
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
  reason: string
  status: string
  created_at: string
}

interface PaySlip {
  id: string
  month: string
  year: number
  basic_salary: number
  allowances: number
  deductions: number
  net_salary: number
  created_at: string
}

export default function EmployeePortal() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [paySlips, setPaySlips] = useState<PaySlip[]>([])
  const [loading, setLoading] = useState(true)
  const [newLeaveOpen, setNewLeaveOpen] = useState(false)
  const [newLoanOpen, setNewLoanOpen] = useState(false)
  const { profile } = useAuth()
  const { toast } = useToast()

  const [newLeave, setNewLeave] = useState({
    leave_type: '',
    start_date: '',
    end_date: '',
    reason: '',
  })

  const [newLoan, setNewLoan] = useState({
    amount: '',
    reason: '',
    repayment_months: '',
  })

  useEffect(() => {
    fetchEmployeeData()
  }, [])

  const fetchEmployeeData = async () => {
    try {
      // Fetch leave requests
      const { data: leaves, error: leavesError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', profile?.id)
        .order('created_at', { ascending: false })

      if (leavesError) throw leavesError
      setLeaveRequests(leaves || [])

      // Fetch pay slips
      const { data: payslips, error: payslipsError } = await supabase
        .from('pay_slips')
        .select('*')
        .eq('employee_id', profile?.id)
        .order('year', { ascending: false })
        .order('month', { ascending: false })

      if (payslipsError) throw payslipsError
      setPaySlips(payslips || [])
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch employee data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const { error } = await supabase.from('leave_requests').insert([
        {
          ...newLeave,
          employee_id: profile?.id,
          branch_id: profile?.branch_id,
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
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit leave request',
        variant: 'destructive',
      })
    }
  }

  const handleLoanRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const { error } = await supabase.from('loan_requests').insert([
        {
          ...newLoan,
          amount: parseFloat(newLoan.amount),
          repayment_months: parseInt(newLoan.repayment_months),
          employee_id: profile?.id,
          status: 'pending',
        },
      ])

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Loan request submitted successfully',
      })

      setNewLoanOpen(false)
      setNewLoan({
        amount: '',
        reason: '',
        repayment_months: '',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit loan request',
        variant: 'destructive',
      })
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const totalEarnings = paySlips.reduce((sum, slip) => sum + slip.net_salary, 0)
  const currentMonthSlip = paySlips[0]

  return (
    <DashboardLayout title="Employee Portal" subtitle="Manage your profile, leaves, and payroll">
      <div className="space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <DashboardCard
            title="Total Earnings (YTD)"
            value={`₹${(totalEarnings / 100000).toFixed(1)}L`}
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
            title="Last Salary"
            value={currentMonthSlip ? `₹${(currentMonthSlip.net_salary / 1000).toFixed(0)}K` : '₹0'}
            icon={CreditCard}
            variant="purple"
          />
        </div>

        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="leaves">Leaves</TabsTrigger>
            <TabsTrigger value="payslips">Payslips</TabsTrigger>
            <TabsTrigger value="loans">Loans</TabsTrigger>
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
                          <Label htmlFor="leave_type">Leave Type</Label>
                          <Select value={newLeave.leave_type} onValueChange={(value) => setNewLeave({ ...newLeave, leave_type: value })}>
                            <SelectTrigger>
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
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="start_date">Start Date</Label>
                            <Input
                              id="start_date"
                              type="date"
                              value={newLeave.start_date}
                              onChange={(e) => setNewLeave({ ...newLeave, start_date: e.target.value })}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="end_date">End Date</Label>
                            <Input
                              id="end_date"
                              type="date"
                              value={newLeave.end_date}
                              onChange={(e) => setNewLeave({ ...newLeave, end_date: e.target.value })}
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="reason">Reason</Label>
                          <Textarea
                            id="reason"
                            value={newLeave.reason}
                            onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                            placeholder="Reason for leave..."
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full">Submit Leave Request</Button>
                      </form>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={newLoanOpen} onOpenChange={setNewLoanOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full justify-start" variant="outline">
                        <DollarSign className="mr-2 h-4 w-4" />
                        Request Loan/Advance
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Request Loan/Advance</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleLoanRequest} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="amount">Amount</Label>
                          <Input
                            id="amount"
                            type="number"
                            value={newLoan.amount}
                            onChange={(e) => setNewLoan({ ...newLoan, amount: e.target.value })}
                            placeholder="Enter amount"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="repayment_months">Repayment Period (Months)</Label>
                          <Select 
                            value={newLoan.repayment_months} 
                            onValueChange={(value) => setNewLoan({ ...newLoan, repayment_months: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select repayment period" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 Month</SelectItem>
                              <SelectItem value="3">3 Months</SelectItem>
                              <SelectItem value="6">6 Months</SelectItem>
                              <SelectItem value="12">12 Months</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="loan_reason">Reason</Label>
                          <Textarea
                            id="loan_reason"
                            value={newLoan.reason}
                            onChange={(e) => setNewLoan({ ...newLoan, reason: e.target.value })}
                            placeholder="Reason for loan/advance..."
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full">Submit Request</Button>
                      </form>
                    </DialogContent>
                  </Dialog>

                  <Button className="w-full justify-start" variant="outline">
                    <FileText className="mr-2 h-4 w-4" />
                    Submit Expense Claim
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
                      <p className="text-sm font-medium">Payslip generated</p>
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
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="payslips" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Salary Slips</h3>
            </div>

            <div className="grid gap-4">
              {paySlips.map((slip) => (
                <Card key={slip.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-lg">
                          {new Date(slip.year, parseInt(slip.month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </h4>
                        <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Basic Salary</p>
                            <p className="font-medium">₹{slip.basic_salary.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Allowances</p>
                            <p className="font-medium">₹{slip.allowances.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Deductions</p>
                            <p className="font-medium">₹{slip.deductions.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Net Salary</p>
                        <p className="text-2xl font-bold text-success">₹{slip.net_salary.toLocaleString()}</p>
                        <Button size="sm" variant="outline" className="mt-2">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="loans" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Loan & Advance Requests</h3>
              <Dialog open={newLoanOpen} onOpenChange={setNewLoanOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Request
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">No loan requests found. Click "New Request" to submit a loan or advance request.</p>
              </CardContent>
            </Card>
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
                    <Input value={profile?.full_name || ''} disabled />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input value={profile?.email || ''} disabled />
                  </div>
                  <div>
                    <Label>Employee ID</Label>
                    <Input value={profile?.employee_id || ''} disabled />
                  </div>
                  <div>
                    <Label>Department</Label>
                    <Input value={profile?.department || ''} disabled />
                  </div>
                  <div>
                    <Label>Designation</Label>
                    <Input value={profile?.designation || ''} disabled />
                  </div>
                  <div>
                    <Label>Joining Date</Label>
                    <Input value={profile?.joining_date || ''} disabled />
                  </div>
                </div>
                <div className="pt-4">
                  <Button variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Update Profile
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