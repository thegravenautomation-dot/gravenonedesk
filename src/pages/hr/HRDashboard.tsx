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
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Plus, Search, Users, UserPlus, Calendar, DollarSign, UserCheck } from 'lucide-react'

interface Employee {
  id: string
  employee_id: string
  full_name: string
  email: string
  phone: string
  date_of_birth: string
  joining_date: string
  department: string
  designation: string
  basic_salary: number
  status: string
  created_at: string
}

export default function HRDashboard() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [newEmployeeOpen, setNewEmployeeOpen] = useState(false)
  const [createUserOpen, setCreateUserOpen] = useState(false)
  const { profile } = useAuth()
  const { toast } = useToast()

  const [newEmployee, setNewEmployee] = useState({
    full_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    joining_date: '',
    department: '',
    designation: '',
    address: '',
    emergency_contact: '',
    basic_salary: 0,
    hra: 0,
    allowances: 0,
  })

  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'executive' as const,
    branch_id: profile?.branch_id || '',
    phone: '',
    department: '',
    designation: '',
    employee_id: '',
  })

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setEmployees(data || [])
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch employees',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const employeeId = `EMP${Date.now().toString().slice(-6)}`

      const { error } = await supabase.from('employees').insert([
        {
          ...newEmployee,
          employee_id: employeeId,
          branch_id: profile?.branch_id,
          status: 'active',
          pan_number: '',
          aadhaar_number: '',
          bank_account: '',
          bank_ifsc: '',
        },
      ])

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Employee added successfully',
      })

      setNewEmployeeOpen(false)
      setNewEmployee({
        full_name: '',
        email: '',
        phone: '',
        date_of_birth: '',
        joining_date: '',
        department: '',
        designation: '',
        address: '',
        emergency_contact: '',
        basic_salary: 0,
        hra: 0,
        allowances: 0,
      })
      fetchEmployees()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add employee',
        variant: 'destructive',
      })
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const { error } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: newUser.full_name,
            role: newUser.role,
            branch_id: newUser.branch_id,
            phone: newUser.phone,
            department: newUser.department,
            designation: newUser.designation,
            employee_id: newUser.employee_id,
          }
        }
      })

      if (error) throw error

      toast({
        title: 'Success',
        description: 'User account created successfully. They can now login with their credentials.',
      })

      setCreateUserOpen(false)
      setNewUser({
        email: '',
        password: '',
        full_name: '',
        role: 'executive' as const,
        branch_id: profile?.branch_id || '',
        phone: '',
        department: '',
        designation: '',
        employee_id: '',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create user account',
        variant: 'destructive',
      })
    }
  }

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDepartment = departmentFilter === 'all' || employee.department === departmentFilter
    return matchesSearch && matchesDepartment
  })

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-yellow-100 text-yellow-800',
      terminated: 'bg-red-100 text-red-800',
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const departments = [...new Set(employees.map(emp => emp.department))]

  const stats = {
    totalEmployees: employees.length,
    activeEmployees: employees.filter(emp => emp.status === 'active').length,
    newJoinees: employees.filter(emp => {
      const joinDate = new Date(emp.joining_date)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return joinDate >= thirtyDaysAgo
    }).length,
    totalSalary: employees
      .filter(emp => emp.status === 'active')
      .reduce((sum, emp) => sum + emp.basic_salary, 0),
  }

  return (
    <DashboardLayout title="HR Dashboard" subtitle="Manage employees, attendance, and payroll">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <DashboardCard
            title="Total Employees"
            value={stats.totalEmployees.toString()}
            icon={Users}
            variant="blue"
          />
          <DashboardCard
            title="Active Employees"
            value={stats.activeEmployees.toString()}
            icon={UserPlus}
            variant="green"
          />
          <DashboardCard
            title="New Joinees"
            value={stats.newJoinees.toString()}
            icon={Calendar}
            variant="purple"
          />
          <DashboardCard
            title="Monthly Salary"
            value={`₹${(stats.totalSalary / 100000).toFixed(1)}L`}
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
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Dialog open={newEmployeeOpen} onOpenChange={setNewEmployeeOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Employee
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Employee</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateEmployee} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        value={newEmployee.full_name}
                        onChange={(e) => setNewEmployee({ ...newEmployee, full_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newEmployee.email}
                        onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={newEmployee.phone}
                        onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date_of_birth">Date of Birth</Label>
                      <Input
                        id="date_of_birth"
                        type="date"
                        value={newEmployee.date_of_birth}
                        onChange={(e) => setNewEmployee({ ...newEmployee, date_of_birth: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="joining_date">Joining Date</Label>
                      <Input
                        id="joining_date"
                        type="date"
                        value={newEmployee.joining_date}
                        onChange={(e) => setNewEmployee({ ...newEmployee, joining_date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Select value={newEmployee.department} onValueChange={(value) => setNewEmployee({ ...newEmployee, department: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sales">Sales</SelectItem>
                          <SelectItem value="Accounts">Accounts</SelectItem>
                          <SelectItem value="HR">Human Resources</SelectItem>
                          <SelectItem value="Procurement">Procurement</SelectItem>
                          <SelectItem value="Dispatch">Dispatch</SelectItem>
                          <SelectItem value="IT">Information Technology</SelectItem>
                          <SelectItem value="Admin">Administration</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="designation">Designation</Label>
                      <Input
                        id="designation"
                        value={newEmployee.designation}
                        onChange={(e) => setNewEmployee({ ...newEmployee, designation: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergency_contact">Emergency Contact</Label>
                      <Input
                        id="emergency_contact"
                        value={newEmployee.emergency_contact}
                        onChange={(e) => setNewEmployee({ ...newEmployee, emergency_contact: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={newEmployee.address}
                      onChange={(e) => setNewEmployee({ ...newEmployee, address: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="basic_salary">Basic Salary (₹)</Label>
                      <Input
                        id="basic_salary"
                        type="number"
                        value={newEmployee.basic_salary}
                        onChange={(e) => setNewEmployee({ ...newEmployee, basic_salary: Number(e.target.value) })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hra">HRA (₹)</Label>
                      <Input
                        id="hra"
                        type="number"
                        value={newEmployee.hra}
                        onChange={(e) => setNewEmployee({ ...newEmployee, hra: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="allowances">Allowances (₹)</Label>
                      <Input
                        id="allowances"
                        type="number"
                        value={newEmployee.allowances}
                        onChange={(e) => setNewEmployee({ ...newEmployee, allowances: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full">Add Employee</Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <UserCheck className="h-4 w-4 mr-2" />
                  Create User Account
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create User Account</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="user_email">Email</Label>
                    <Input
                      id="user_email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user_password">Password</Label>
                    <Input
                      id="user_password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="user_name">Full Name</Label>
                      <Input
                        id="user_name"
                        value={newUser.full_name}
                        onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="user_phone">Phone</Label>
                      <Input
                        id="user_phone"
                        value={newUser.phone}
                        onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user_role">Role</Label>
                    <Select value={newUser.role} onValueChange={(value: any) => setNewUser({ ...newUser, role: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="executive">Executive</SelectItem>
                        <SelectItem value="accountant">Accountant</SelectItem>
                        <SelectItem value="hr">HR</SelectItem>
                        <SelectItem value="procurement">Procurement</SelectItem>
                        <SelectItem value="dispatch">Dispatch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="user_department">Department</Label>
                      <Input
                        id="user_department"
                        value={newUser.department}
                        onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="user_designation">Designation</Label>
                      <Input
                        id="user_designation"
                        value={newUser.designation}
                        onChange={(e) => setNewUser({ ...newUser, designation: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full">Create User Account</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Employees Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joining Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No employees found
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.employee_id}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{employee.full_name}</div>
                        <div className="text-sm text-muted-foreground">{employee.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell>{employee.designation}</TableCell>
                    <TableCell>₹{employee.basic_salary.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(employee.status)}>
                        {employee.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(employee.joining_date).toLocaleDateString()}
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