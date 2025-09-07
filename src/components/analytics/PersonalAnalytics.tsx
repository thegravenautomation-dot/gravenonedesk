import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  TrendingUp, 
  Target, 
  Users, 
  DollarSign, 
  Calendar,
  Trophy,
  BarChart3,
  PieChart,
  Activity
} from "lucide-react";
import { RevenueChart } from "../charts/RevenueChart";

interface AnalyticsData {
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  totalOrders: number;
  totalRevenue: number;
  avgOrderSize: number;
  monthlyTarget: number;
  quarterlyTarget: number;
  yearlyTarget: number;
  monthlyAchieved: number;
  quarterlyAchieved: number;
  yearlyAchieved: number;
  assignedLeads: number;
  manualLeads: number;
  assignedConversionRate: number;
  manualConversionRate: number;
  leadsByProduct: { product: string; count: number; revenue: number }[];
  monthlyPerformance: { month: string; leads: number; orders: number; revenue: number }[];
}

export function PersonalAnalytics() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalLeads: 0,
    convertedLeads: 0,
    conversionRate: 0,
    totalOrders: 0,
    totalRevenue: 0,
    avgOrderSize: 0,
    monthlyTarget: 0,
    quarterlyTarget: 0,
    yearlyTarget: 0,
    monthlyAchieved: 0,
    quarterlyAchieved: 0,
    yearlyAchieved: 0,
    assignedLeads: 0,
    manualLeads: 0,
    assignedConversionRate: 0,
    manualConversionRate: 0,
    leadsByProduct: [],
    monthlyPerformance: []
  });

  useEffect(() => {
    if (profile?.id) {
      fetchAnalytics();
    }
  }, [profile?.id]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch leads data
      const { data: leadsData } = await supabase
        .from('leads')
        .select('*')
        .eq('assigned_to', profile?.id);

      // Fetch orders data for converted leads (via quotations since orders don't directly link to leads)
      const { data: ordersData } = await supabase
        .from('orders')
        .select(`
          *,
          quotations!inner(lead_id),
          order_items(item_name, total_amount)
        `)
        .eq('quotations.leads.assigned_to', profile?.id);

      // Calculate metrics
      const totalLeads = leadsData?.length || 0;
      const convertedLeads = ordersData?.length || 0;
      const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
      const totalRevenue = ordersData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
      const avgOrderSize = convertedLeads > 0 ? totalRevenue / convertedLeads : 0;

      // Calculate assigned vs manual leads
      const assignedLeads = leadsData?.filter(lead => lead.lead_source_id).length || 0;
      const manualLeads = totalLeads - assignedLeads;
      
      // Calculate conversion rates for assigned vs manual
      const assignedConverted = ordersData?.filter(order => {
        const leadId = order.quotations?.lead_id;
        return leadId && leadsData?.find(lead => lead.id === leadId && lead.lead_source_id);
      }).length || 0;
      const manualConverted = convertedLeads - assignedConverted;
      
      const assignedConversionRate = assignedLeads > 0 ? (assignedConverted / assignedLeads) * 100 : 0;
      const manualConversionRate = manualLeads > 0 ? (manualConverted / manualLeads) * 100 : 0;

      // Calculate monthly performance
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const monthlyOrders = ordersData?.filter(order => {
        const orderDate = new Date(order.order_date);
        return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
      }) || [];
      
      const quarterlyOrders = ordersData?.filter(order => {
        const orderDate = new Date(order.order_date);
        const quarter = Math.floor(currentMonth / 3);
        const orderQuarter = Math.floor(orderDate.getMonth() / 3);
        return orderQuarter === quarter && orderDate.getFullYear() === currentYear;
      }) || [];

      const yearlyOrders = ordersData?.filter(order => {
        const orderDate = new Date(order.order_date);
        return orderDate.getFullYear() === currentYear;
      }) || [];

      const monthlyAchieved = monthlyOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
      const quarterlyAchieved = quarterlyOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
      const yearlyAchieved = yearlyOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);

      // Group by product (using order items)
      const productMap = new Map();
      ordersData?.forEach(order => {
        order.order_items?.forEach((item: any) => {
          const existing = productMap.get(item.item_name) || { count: 0, revenue: 0 };
          productMap.set(item.item_name, {
            count: existing.count + 1,
            revenue: existing.revenue + (item.total_amount || 0)
          });
        });
      });

      const leadsByProduct = Array.from(productMap.entries()).map(([product, data]) => ({
        product,
        count: data.count,
        revenue: data.revenue
      }));

      setAnalytics({
        totalLeads,
        convertedLeads,
        conversionRate,
        totalOrders: convertedLeads,
        totalRevenue,
        avgOrderSize,
        monthlyTarget: 100000, // These should come from targets table
        quarterlyTarget: 300000,
        yearlyTarget: 1200000,
        monthlyAchieved,
        quarterlyAchieved,
        yearlyAchieved,
        assignedLeads,
        manualLeads,
        assignedConversionRate,
        manualConversionRate,
        leadsByProduct,
        monthlyPerformance: [] // Will implement later
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading analytics...</div>;
  }

  const monthlyProgress = analytics.monthlyTarget > 0 ? (analytics.monthlyAchieved / analytics.monthlyTarget) * 100 : 0;
  const quarterlyProgress = analytics.quarterlyTarget > 0 ? (analytics.quarterlyAchieved / analytics.quarterlyTarget) * 100 : 0;
  const yearlyProgress = analytics.yearlyTarget > 0 ? (analytics.yearlyAchieved / analytics.yearlyTarget) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalLeads}</div>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">Assigned: {analytics.assignedLeads}</Badge>
              <Badge variant="outline">Manual: {analytics.manualLeads}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.conversionRate.toFixed(1)}%</div>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary">Assigned: {analytics.assignedConversionRate.toFixed(1)}%</Badge>
              <Badge variant="secondary">Manual: {analytics.manualConversionRate.toFixed(1)}%</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{analytics.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Avg Order: ₹{analytics.avgOrderSize.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              From {analytics.totalLeads} leads
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="targets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="targets">Targets & Performance</TabsTrigger>
          <TabsTrigger value="products">Product Analysis</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="targets" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Monthly Target</CardTitle>
                <CardDescription>Current month performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Achieved</span>
                    <span>₹{analytics.monthlyAchieved.toLocaleString()} / ₹{analytics.monthlyTarget.toLocaleString()}</span>
                  </div>
                  <Progress value={monthlyProgress} className="h-2" />
                  <Badge variant={monthlyProgress >= 100 ? "default" : monthlyProgress >= 75 ? "secondary" : "destructive"}>
                    {monthlyProgress.toFixed(1)}%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quarterly Target</CardTitle>
                <CardDescription>Current quarter performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Achieved</span>
                    <span>₹{analytics.quarterlyAchieved.toLocaleString()} / ₹{analytics.quarterlyTarget.toLocaleString()}</span>
                  </div>
                  <Progress value={quarterlyProgress} className="h-2" />
                  <Badge variant={quarterlyProgress >= 100 ? "default" : quarterlyProgress >= 75 ? "secondary" : "destructive"}>
                    {quarterlyProgress.toFixed(1)}%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Yearly Target</CardTitle>
                <CardDescription>Current year performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Achieved</span>
                    <span>₹{analytics.yearlyAchieved.toLocaleString()} / ₹{analytics.yearlyTarget.toLocaleString()}</span>
                  </div>
                  <Progress value={yearlyProgress} className="h-2" />
                  <Badge variant={yearlyProgress >= 100 ? "default" : yearlyProgress >= 75 ? "secondary" : "destructive"}>
                    {yearlyProgress.toFixed(1)}%
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Product Performance</CardTitle>
              <CardDescription>Revenue and orders by product category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.leadsByProduct.slice(0, 5).map((product, index) => (
                  <div key={product.product} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{product.product}</p>
                      <p className="text-sm text-muted-foreground">{product.count} orders</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">₹{product.revenue.toLocaleString()}</p>
                      <Badge variant="outline">
                        {((product.revenue / analytics.totalRevenue) * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>Revenue performance over time</CardDescription>
            </CardHeader>
            <CardContent>
              <RevenueChart />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}