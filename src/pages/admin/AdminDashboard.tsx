import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Building2, 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Truck,
  FileText,
  UserCheck,
  Settings,
  BarChart3,
  Plus
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardStats {
  totalBranches: number;
  totalEmployees: number;
  totalLeads: number;
  totalRevenue: number;
  pendingOrders: number;
  activeCustomers: number;
}

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalBranches: 0,
    totalEmployees: 0,
    totalLeads: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    activeCustomers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const [branchesRes, employeesRes, leadsRes, ordersRes, customersRes, invoicesRes] = await Promise.all([
        supabase.from('branches').select('*', { count: 'exact' }),
        supabase.from('employees').select('*', { count: 'exact' }),
        supabase.from('leads').select('*', { count: 'exact' }),
        supabase.from('orders').select('*', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('customers').select('*', { count: 'exact' }),
        supabase.from('invoices').select('total_amount').eq('payment_status', 'paid'),
      ]);

      const totalRevenue = invoicesRes.data?.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0) || 0;

      setStats({
        totalBranches: branchesRes.count || 0,
        totalEmployees: employeesRes.count || 0,
        totalLeads: leadsRes.count || 0,
        totalRevenue,
        pendingOrders: ordersRes.count || 0,
        activeCustomers: customersRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout 
      title={`Welcome, ${profile?.full_name}`}
      subtitle="Admin Dashboard - Complete System Overview"
    >
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Branches</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '-' : stats.totalBranches}</div>
              <p className="text-xs text-muted-foreground">Active locations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '-' : stats.totalEmployees}</div>
              <p className="text-xs text-muted-foreground">Workforce</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Leads</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '-' : stats.totalLeads}</div>
              <p className="text-xs text-muted-foreground">Sales pipeline</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{loading ? '-' : (stats.totalRevenue / 100000).toFixed(1)}L</div>
              <p className="text-xs text-muted-foreground">Paid invoices</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '-' : stats.pendingOrders}</div>
              <p className="text-xs text-muted-foreground">Awaiting processing</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '-' : stats.activeCustomers}</div>
              <p className="text-xs text-muted-foreground">Customer base</p>
            </CardContent>
          </Card>
        </div>

        {/* Module Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.open('/sales', '_self')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Sales Management
              </CardTitle>
              <CardDescription>
                Lead management, quotations, and sales pipeline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Badge variant="secondary">{stats.totalLeads} Active Leads</Badge>
                <Button size="sm" onClick={(e) => { e.stopPropagation(); window.open('/sales', '_self'); }}>
                  <Plus className="h-4 w-4 mr-1" />
                  Open
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.open('/accounts', '_self')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Accounts & Finance
              </CardTitle>
              <CardDescription>
                Invoicing, payments, and financial reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Badge variant="secondary">₹{(stats.totalRevenue / 100000).toFixed(1)}L Revenue</Badge>
                <Button size="sm" onClick={(e) => { e.stopPropagation(); window.open('/accounts', '_self'); }}>
                  <Plus className="h-4 w-4 mr-1" />
                  Open
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.open('/hr', '_self')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Human Resources
              </CardTitle>
              <CardDescription>
                Employee management, payroll, and attendance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Badge variant="secondary">{stats.totalEmployees} Employees</Badge>
                <Button size="sm" onClick={(e) => { e.stopPropagation(); window.open('/hr', '_self'); }}>
                  <Plus className="h-4 w-4 mr-1" />
                  Open
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.open('/procurement', '_self')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-orange-600" />
                Procurement
              </CardTitle>
              <CardDescription>
                Vendor management and purchase orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Badge variant="secondary">2 Active POs</Badge>
                <Button size="sm" onClick={(e) => { e.stopPropagation(); window.open('/procurement', '_self'); }}>
                  <Plus className="h-4 w-4 mr-1" />
                  Open
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.open('/dispatch', '_self')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-purple-600" />
                Dispatch & Delivery
              </CardTitle>
              <CardDescription>
                Order fulfillment and logistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Badge variant="secondary">{stats.pendingOrders} Pending</Badge>
                <Button size="sm" onClick={(e) => { e.stopPropagation(); window.open('/dispatch', '_self'); }}>
                  <Plus className="h-4 w-4 mr-1" />
                  Open
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.open('/analytics', '_self')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-600" />
                Analytics & Reports
              </CardTitle>
              <CardDescription>
                Business intelligence and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Badge variant="secondary">Live Data</Badge>
                <Button size="sm" onClick={(e) => { e.stopPropagation(); window.open('/analytics', '_self'); }}>
                  <Plus className="h-4 w-4 mr-1" />
                  Open
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Administration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              System Administration
            </CardTitle>
            <CardDescription>
              Manage system settings, user roles, and branch configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="justify-start" onClick={() => window.open('/hr', '_self')}>
                <Users className="h-4 w-4 mr-2" />
                User Management
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => alert('Branch Settings - Coming Soon!')}>
                <Building2 className="h-4 w-4 mr-2" />
                Branch Settings
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => window.open('https://supabase.com/dashboard/project/xiqumuqtzejtiinezryu/functions', '_blank')}>
                <FileText className="h-4 w-4 mr-2" />
                System Logs
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}