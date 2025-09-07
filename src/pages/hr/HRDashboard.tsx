import React, { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { DashboardCard } from '@/components/DashboardCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Plus, Search, Users, UserPlus, Calendar, DollarSign, UserCheck, Shield, Edit, Key, Trash2 } from 'lucide-react'

interface Employee {
  id: string
  employee_id: string
  profile_id: string | null
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
  const [editEmployeeOpen, setEditEmployeeOpen] = useState(false)
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
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

  const roleOptions = [
    { value: 'executive', label: 'Executive' },
    { value: 'manager', label: 'Manager' },
    { value: 'sales_manager', label: 'Sales Manager' },
    { value: 'bdo', label: 'BDO (Business Development Officer)' },
    { value: 'fbdo', label: 'FBDO (Field Business Development Officer)' },
    { value: 'accountant', label: 'Accountant' },
    { value: 'hr', label: 'HR' },
    { value: 'procurement', label: 'Procurement' },
    { value: 'dispatch', label: 'Dispatch' },
    ...(profile?.role === 'admin' ? [{ value: 'admin', label: 'Admin' }] : [])
  ]

  const [resetPassword, setResetPassword] = useState({
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    fetchEmployees()
  }, [profile?.branch_id])

  const fetchEmployees = async () => {
    try {
      // Use secure function that includes audit logging and data masking
      const { data, error } = await supabase
        .rpc('get_employee_data_secure', {
          p_employee_id: null, // Get all employees user has access to
          p_include_sensitive: profile?.role === 'hr' || profile?.role === 'admin'
        });

      if (error) throw error;
      
      // Transform data to match expected Employee interface
      const transformedData = (data || []).map((emp: any) => ({
        id: emp.id,
        employee_id: emp.employee_id,
        profile_id: emp.profile_id || null,
        full_name: emp.full_name,
        email: emp.email,
        phone: emp.phone || '',
        department: emp.department || '',
        designation: emp.designation || '',
        joining_date: emp.joining_date,
        date_of_birth: emp.date_of_birth,
        basic_salary: emp.basic_salary || 0,
        status: emp.status,
        created_at: emp.created_at,
      }));

      setEmployees(transformedData);
    } catch (error) {
      console.error('Error fetching employees:', error);
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
          full_name: newEmployee.full_name,
          email: newEmployee.email,
          phone: newEmployee.phone,
          date_of_birth: newEmployee.date_of_birth || null,
          joining_date: newEmployee.joining_date || null,
          department: newEmployee.department || null,
          designation: newEmployee.designation || null,
          address: newEmployee.address || null,
          basic_salary: newEmployee.basic_salary || 0,
          hra: newEmployee.hra || 0,
          allowances: newEmployee.allowances || 0,
          employee_id: employeeId,
          branch_id: profile?.branch_id,
          status: 'active',
          pan: '',
          aadhaar: '',
          bank_account: '',
          ifsc_code: '',
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
      const { error, data } = await supabase.functions.invoke('employee-management', {
        body: {
          action: 'provision_user',
          employeeData: {
            email: newUser.email,
            full_name: newUser.full_name || newUser.email.split('@')[0],
            role: newUser.role,
            branch_id: newUser.branch_id,
            phone: newUser.phone || undefined,
            department: newUser.department || undefined,
            designation: newUser.designation || undefined,
            joining_date: undefined,
            employee_id: newUser.employee_id || undefined,
          },
          password: newUser.password,
        },
      })

      if (error) throw error

      const result = data?.data
      const defaultPassword = result?.defaultPassword

      toast({
        title: 'Success',
        description: defaultPassword
          ? `User account created and activated. Default password: ${defaultPassword}`
          : 'User account created and activated. They can log in now.',
      })

      setCreateUserOpen(false)
      setNewUser({
        email: '',
        password: '',
        full_name: '',
        role: 'executive',
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

  const handleEditEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEmployee) return

    try {
      const { data, error } = await supabase.functions.invoke('employee-management', {
        body: {
          action: 'update',
          employeeId: selectedEmployee.id,
          employeeData: selectedEmployee
        }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Employee updated successfully',
      });

      setEditEmployeeOpen(false);
      setSelectedEmployee(null);
      fetchEmployees();
    } catch (error: any) {
      console.error('Error updating employee:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update employee',
        variant: 'destructive',
      });
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEmployee) return

    if (resetPassword.newPassword !== resetPassword.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    try {
      // If no linked auth profile, provision user and set this password
      // This avoids the "Employee is not linked to an auth profile" error
      if (!('profile_id' in selectedEmployee) || !selectedEmployee.profile_id) {
        const { data: provisionRes, error: provisionErr } = await supabase.functions.invoke('employee-management', {
          body: {
            action: 'provision_user',
            employeeData: {
              email: selectedEmployee.email,
              full_name: selectedEmployee.full_name,
              role: 'executive',
              branch_id: profile?.branch_id,
              department: selectedEmployee.department || undefined,
              designation: selectedEmployee.designation || undefined,
              joining_date: selectedEmployee.joining_date || undefined,
              employee_id: selectedEmployee.employee_id,
              phone: selectedEmployee.phone || undefined,
            },
            password: resetPassword.newPassword,
          },
        });
        if (provisionErr) throw provisionErr;

        toast({
          title: 'User Provisioned',
          description: 'Account created and password set successfully.',
        });

        setResetPasswordOpen(false);
        setSelectedEmployee(null);
        setResetPassword({ newPassword: '', confirmPassword: '' });
        fetchEmployees();
        return;
      }

      // Otherwise, reset password via edge function
      const { data, error } = await supabase.functions.invoke('employee-management', {
        body: {
          action: 'reset_password',
          employeeId: selectedEmployee.id,
          newPassword: resetPassword.newPassword
        }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Password reset successfully',
      });

      setResetPasswordOpen(false);
      setSelectedEmployee(null);
      setResetPassword({ newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset password',
        variant: 'destructive',
      });
    }
  }

  const handleDeactivateEmployee = async (employeeId: string) => {
    if (!confirm('Are you sure you want to deactivate this employee?')) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('employee-management', {
        body: {
          action: 'deactivate',
          employeeId: employeeId
        }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Employee deactivated successfully',
      });

      fetchEmployees();
    } catch (error: any) {
      console.error('Error deactivating employee:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to deactivate employee',
        variant: 'destructive',
      });
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
    } as const
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
                        {roleOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
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

            {/* Security Audit Dashboard Access - Only for HR/Admin */}
            {(profile?.role === 'hr' || profile?.role === 'admin') && (
              <Button 
                variant="outline"
                className="border-red-200 text-red-700 hover:bg-red-50"
                onClick={() => window.open('/security', '_blank')}
              >
                <Shield className="h-4 w-4 mr-2" />
                Security Audit
              </Button>
            )}
          </div>
        </div>

        {/* Employees Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Salary</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No employees found
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.employee_id}</TableCell>
                    <TableCell>{employee.full_name}</TableCell>
                    <TableCell>{employee.email}</TableCell>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell>{employee.designation}</TableCell>
                    <TableCell>
                      <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                        {employee.status}
                      </Badge>
                    </TableCell>
                    <TableCell>₹{employee.basic_salary?.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setEditEmployeeOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setResetPasswordOpen(true);
                          }}
>
                          <Key className="h-4 w-4" />
                        </Button>
                        {employee.status === 'active' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeactivateEmployee(employee.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Edit Employee Dialog */}
        <Dialog open={editEmployeeOpen} onOpenChange={setEditEmployeeOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Employee</DialogTitle>
            </DialogHeader>
            {selectedEmployee && (
              <form onSubmit={handleEditEmployee} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_full_name">Full Name</Label>
                    <Input
                      id="edit_full_name"
                      value={selectedEmployee.full_name}
                      onChange={(e) => setSelectedEmployee({ ...selectedEmployee, full_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_email">Email</Label>
                    <Input
                      id="edit_email"
                      type="email"
                      value={selectedEmployee.email}
                      onChange={(e) => setSelectedEmployee({ ...selectedEmployee, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_phone">Phone</Label>
                    <Input
                      id="edit_phone"
                      value={selectedEmployee.phone || ''}
                      onChange={(e) => setSelectedEmployee({ ...selectedEmployee, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_department">Department</Label>
                    <Select value={selectedEmployee.department || ''} onValueChange={(value) => setSelectedEmployee({ ...selectedEmployee, department: value })}>
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
                    <Label htmlFor="edit_designation">Designation</Label>
                    <Input
                      id="edit_designation"
                      value={selectedEmployee.designation || ''}
                      onChange={(e) => setSelectedEmployee({ ...selectedEmployee, designation: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_basic_salary">Basic Salary (₹)</Label>
                    <Input
                      id="edit_basic_salary"
                      type="number"
                      value={selectedEmployee.basic_salary || 0}
                      onChange={(e) => setSelectedEmployee({ ...selectedEmployee, basic_salary: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setEditEmployeeOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Update Employee</Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>
                {selectedEmployee?.profile_id
                  ? 'Set a new password for this user.'
                  : 'This employee doesn’t have an account yet. We will create one and set this password.'}
              </DialogDescription>
            </DialogHeader>
            {selectedEmployee && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Reset password for: <strong>{selectedEmployee.full_name}</strong>
                </p>
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new_password">New Password</Label>
                    <Input
                      id="new_password"
                      type="password"
                      value={resetPassword.newPassword}
                      onChange={(e) => setResetPassword({ ...resetPassword, newPassword: e.target.value })}
                      required
                      minLength={8}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm_password">Confirm Password</Label>
                    <Input
                      id="confirm_password"
                      type="password"
                      value={resetPassword.confirmPassword}
                      onChange={(e) => setResetPassword({ ...resetPassword, confirmPassword: e.target.value })}
                      required
                      minLength={8}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setResetPasswordOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Reset Password</Button>
                  </div>
                </form>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}