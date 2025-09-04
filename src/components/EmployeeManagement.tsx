import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserPlus, Edit, UserX, Search, Filter } from "lucide-react";

interface Employee {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  phone?: string;
  department?: string;
  designation?: string;
  joining_date?: string;
  basic_salary?: number;
  status: string;
  branch_id: string;
}

interface Branch {
  id: string;
  name: string;
}

export function EmployeeManagement() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [isEditEmployeeOpen, setIsEditEmployeeOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const [newEmployee, setNewEmployee] = useState({
    full_name: "",
    email: "",
    phone: "",
    address: "",
    date_of_birth: "",
    joining_date: "",
    pan: "",
    aadhaar: "",
    bank_account: "",
    ifsc_code: "",
    basic_salary: 0,
    hra: 0,
    allowances: 0,
    department: "",
    designation: "",
    reporting_manager: "",
    branch_id: profile?.branch_id || "",
    role: "executive" as const,
    password: ""
  });

  useEffect(() => {
    fetchEmployees();
    fetchBranches();
  }, [profile?.branch_id]);

  const fetchEmployees = async () => {
    try {
      let query = supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      // If user is not admin, only show employees from their branch
      if (profile?.role !== 'admin') {
        query = query.eq('branch_id', profile?.branch_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({
        title: "Error",
        description: "Failed to fetch employees",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name')
        .eq('is_active', true);

      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const handleAddEmployee = async () => {
    try {
      if (!newEmployee.full_name || !newEmployee.email || !newEmployee.password) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);

      const { data, error } = await supabase.functions.invoke('employee-management', {
        body: {
          action: 'create',
          employeeData: newEmployee,
          password: newEmployee.password
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Employee added successfully",
      });

      setIsAddEmployeeOpen(false);
      setNewEmployee({
        full_name: "",
        email: "",
        phone: "",
        address: "",
        date_of_birth: "",
        joining_date: "",
        pan: "",
        aadhaar: "",
        bank_account: "",
        ifsc_code: "",
        basic_salary: 0,
        hra: 0,
        allowances: 0,
        department: "",
        designation: "",
        reporting_manager: "",
        branch_id: profile?.branch_id || "",
        role: "executive",
        password: ""
      });

      fetchEmployees();
    } catch (error: any) {
      console.error('Error adding employee:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add employee",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmployee = async () => {
    if (!selectedEmployee) return;

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('employee-management', {
        body: {
          action: 'update',
          employeeId: selectedEmployee.id,
          employeeData: selectedEmployee
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Employee updated successfully",
      });

      setIsEditEmployeeOpen(false);
      setSelectedEmployee(null);
      fetchEmployees();
    } catch (error: any) {
      console.error('Error updating employee:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update employee",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateEmployee = async (employeeId: string) => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('employee-management', {
        body: {
          action: 'deactivate',
          employeeId: employeeId
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Employee deactivated successfully",
      });

      fetchEmployees();
    } catch (error: any) {
      console.error('Error deactivating employee:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate employee",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.employee_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || employee.status === statusFilter;
    const matchesDepartment = departmentFilter === 'all' || employee.department === departmentFilter;
    return matchesSearch && matchesStatus && matchesDepartment;
  });

  const departments = [...new Set(employees.map(emp => emp.department).filter(Boolean))];

  if (loading && employees.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6" />
            Employee Management
          </h2>
          <p className="text-muted-foreground">
            Manage your organization's employees
          </p>
        </div>

        <Dialog open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
              <DialogDescription>
                Create a new employee account with login credentials
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={newEmployee.full_name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, full_name: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newEmployee.email}
                  onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={newEmployee.password}
                  onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
                  placeholder="Enter temporary password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={newEmployee.phone}
                  onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={newEmployee.department}
                  onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                  placeholder="Enter department"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="designation">Designation</Label>
                <Input
                  id="designation"
                  value={newEmployee.designation}
                  onChange={(e) => setNewEmployee({ ...newEmployee, designation: e.target.value })}
                  placeholder="Enter designation"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={newEmployee.role} onValueChange={(value: any) => setNewEmployee({ ...newEmployee, role: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="executive">Executive</SelectItem>
                    <SelectItem value="accountant">Accountant</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                    <SelectItem value="procurement">Procurement</SelectItem>
                    <SelectItem value="dispatch">Dispatch</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    {profile?.role === 'admin' && (
                      <SelectItem value="admin">Admin</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="joining_date">Joining Date</Label>
                <Input
                  id="joining_date"
                  type="date"
                  value={newEmployee.joining_date}
                  onChange={(e) => setNewEmployee({ ...newEmployee, joining_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="basic_salary">Basic Salary</Label>
                <Input
                  id="basic_salary"
                  type="number"
                  value={newEmployee.basic_salary}
                  onChange={(e) => setNewEmployee({ ...newEmployee, basic_salary: parseFloat(e.target.value) || 0 })}
                  placeholder="Enter basic salary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch">Branch</Label>
                <Select value={newEmployee.branch_id} onValueChange={(value) => setNewEmployee({ ...newEmployee, branch_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsAddEmployeeOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddEmployee} disabled={loading}>
                {loading ? "Creating..." : "Create Employee"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept!}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employees Table */}
      <Card>
        <CardHeader>
          <CardTitle>Employees ({filteredEmployees.length})</CardTitle>
        </CardHeader>
        <CardContent>
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
              {filteredEmployees.map((employee) => (
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
                          setIsEditEmployeeOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {employee.status === 'active' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeactivateEmployee(employee.id)}
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Employee Dialog */}
      <Dialog open={isEditEmployeeOpen} onOpenChange={setIsEditEmployeeOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee information
            </DialogDescription>
          </DialogHeader>

          {selectedEmployee && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_full_name">Full Name</Label>
                <Input
                  id="edit_full_name"
                  value={selectedEmployee.full_name}
                  onChange={(e) => setSelectedEmployee({ ...selectedEmployee, full_name: e.target.value })}
                />
              </div>

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
                <Input
                  id="edit_department"
                  value={selectedEmployee.department || ''}
                  onChange={(e) => setSelectedEmployee({ ...selectedEmployee, department: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_designation">Designation</Label>
                <Input
                  id="edit_designation"
                  value={selectedEmployee.designation || ''}
                  onChange={(e) => setSelectedEmployee({ ...selectedEmployee, designation: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_basic_salary">Basic Salary</Label>
                <Input
                  id="edit_basic_salary"
                  type="number"
                  value={selectedEmployee.basic_salary || 0}
                  onChange={(e) => setSelectedEmployee({ ...selectedEmployee, basic_salary: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsEditEmployeeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateEmployee} disabled={loading}>
              {loading ? "Updating..." : "Update Employee"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}