import React, { useState, useEffect } from 'react';
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  ShoppingCart, 
  CreditCard, 
  FileText, 
  TrendingUp, 
  Plus,
  Search,
  Wifi,
  WifiOff
} from "lucide-react";

// Import existing components
import { LeadManagement } from '@/components/LeadManagement';
import { OrdersWithPayments } from '@/components/OrdersWithPayments';
import { PaymentManager } from '@/components/PaymentManager';
import { CustomerLedger } from '@/components/CustomerLedger';
import { QuotationManager } from '@/components/QuotationManager';
import { RealTimeNotificationBell } from '@/components/RealTimeNotificationBell';
import { useRealTimeNotifications } from '@/hooks/useRealTimeNotifications';

interface SalesMetrics {
  totalLeads: number;
  activeOrders: number;
  pendingPayments: number;
  totalRevenue: number;
  todayFollowUps: number;
}

export default function IntegratedSalesDashboard() {
  const { profile } = useAuth();
  const roleAccess = useRoleAccess();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<SalesMetrics>({
    totalLeads: 0,
    activeOrders: 0,
    pendingPayments: 0,
    totalRevenue: 0,
    todayFollowUps: 0
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false);

  // Real-time hooks
  const notifications = useRealTimeNotifications();

  useEffect(() => {
    if (profile?.branch_id) {
      fetchMetrics();
      setupRealTimeConnection();
    }
  }, [profile?.branch_id]);

  const setupRealTimeConnection = () => {
    if (!profile?.branch_id) return;

    const channel = supabase
      .channel('sales-dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `branch_id=eq.${profile.branch_id}`,
        },
        () => {
          fetchMetrics();
          toast({
            title: "Real-time Update",
            description: "Sales data updated",
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `branch_id=eq.${profile.branch_id}`,
        },
        () => {
          fetchMetrics();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `branch_id=eq.${profile.branch_id}`,
        },
        () => {
          fetchMetrics();
        }
      )
      .subscribe((status) => {
        setIsRealTimeConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchMetrics = async () => {
    if (!profile?.branch_id) return;

    try {
      setLoading(true);

      // Fetch leads count
      const { count: leadsCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact' })
        .eq('branch_id', profile.branch_id)
        .neq('status', 'won');

      // Fetch active orders
      const { count: ordersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact' })
        .eq('branch_id', profile.branch_id)
        .in('status', ['pending', 'confirmed', 'processing']);

      // Fetch pending payments
      const { data: ordersWithPayments } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          payments (
            amount
          )
        `)
        .eq('branch_id', profile.branch_id)
        .neq('status', 'cancelled');

      let pendingCount = 0;
      let totalRevenue = 0;

      ordersWithPayments?.forEach(order => {
        const totalPaid = order.payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
        const remaining = (order.total_amount || 0) - totalPaid;
        
        if (remaining > 0) {
          pendingCount++;
        }
        
        totalRevenue += totalPaid;
      });

      // Fetch today's follow-ups
      const today = new Date().toISOString().split('T')[0];
      const { count: followUpsCount } = await supabase
        .from('follow_ups')
        .select('*', { count: 'exact' })
        .eq('branch_id', profile.branch_id)
        .eq('follow_up_date', today)
        .eq('status', 'scheduled');

      setMetrics({
        totalLeads: leadsCount || 0,
        activeOrders: ordersCount || 0,
        pendingPayments: pendingCount,
        totalRevenue,
        todayFollowUps: followUpsCount || 0
      });

    } catch (error) {
      console.error('Error fetching metrics:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard metrics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const MetricsCard = ({ title, value, icon: Icon, color, description }: {
    title: string;
    value: string | number;
    icon: React.ComponentType<any>;
    color: string;
    description: string;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );

  const getRoleBasedTitle = () => {
    const role = profile?.role as string;
    switch (role) {
      case 'admin':
        return 'Sales Management Center';
      case 'manager':
        return profile?.department === 'Sales' ? 'Sales Team Dashboard' : 'Sales Overview';
      case 'executive':
        return 'Sales Executive Dashboard';
      case 'accountant':
        return 'Sales & Finance Dashboard';
      default:
        return 'Sales Dashboard';
    }
  };

  return (
    <DashboardLayout 
      title={getRoleBasedTitle()}
      subtitle="Complete sales workflow management with real-time updates"
    >
      <div className="space-y-6">
        {/* Real-time Status & Search Bar */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search across all modules..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
            <Badge variant={isRealTimeConnected ? "default" : "secondary"} className="flex items-center gap-1">
              {isRealTimeConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isRealTimeConnected ? "Live" : "Offline"}
            </Badge>
          </div>
          <RealTimeNotificationBell />
        </div>

        {/* Metrics Dashboard */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <MetricsCard
            title="Active Leads"
            value={loading ? "..." : metrics.totalLeads}
            icon={Users}
            color="text-blue-600"
            description="Open opportunities"
          />
          <MetricsCard
            title="Active Orders"
            value={loading ? "..." : metrics.activeOrders}
            icon={ShoppingCart}
            color="text-green-600"
            description="In progress orders"
          />
          <MetricsCard
            title="Pending Payments"
            value={loading ? "..." : metrics.pendingPayments}
            icon={CreditCard}
            color="text-orange-600"
            description="Awaiting payment"
          />
          <MetricsCard
            title="Revenue"
            value={loading ? "..." : `₹${metrics.totalRevenue.toLocaleString()}`}
            icon={TrendingUp}
            color="text-purple-600"
            description="Total collected"
          />
          <MetricsCard
            title="Today's Follow-ups"
            value={loading ? "..." : metrics.todayFollowUps}
            icon={FileText}
            color="text-red-600"
            description="Scheduled for today"
          />
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="leads" className="space-y-4">
          <TabsList className="grid grid-cols-2 lg:grid-cols-5 w-full">
            <TabsTrigger value="leads" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Leads & Follow-ups
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Orders & Payments
            </TabsTrigger>
            <TabsTrigger value="quotations" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Quotations
            </TabsTrigger>
            {roleAccess.canViewLedger() && (
              <TabsTrigger value="ledger" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Customer Ledger
              </TabsTrigger>
            )}
            {roleAccess.canRecordPayments() && (
              <TabsTrigger value="payments" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Payment Center
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="leads" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Lead Management & Follow-ups</span>
                  <Badge>{metrics.totalLeads} Active</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LeadManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Orders with Payments & Attachments</span>
                  <Badge>{metrics.activeOrders} Active</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <OrdersWithPayments />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quotations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Quotation Management</CardTitle>
              </CardHeader>
              <CardContent>
                <QuotationManager />
              </CardContent>
            </Card>
          </TabsContent>

          {roleAccess.canViewLedger() && (
            <TabsContent value="ledger" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Customer Ledger & Account Summary</span>
                    <Badge>₹{metrics.totalRevenue.toLocaleString()} Total</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CustomerLedger />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {roleAccess.canRecordPayments() && (
            <TabsContent value="payments" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Payment Recording Center</span>
                    <Badge variant="outline">{metrics.pendingPayments} Pending</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PaymentManager />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}