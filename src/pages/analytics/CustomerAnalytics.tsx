import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { CustomerSegmentManager } from '@/components/analytics/CustomerSegmentManager';
import { CustomerInsightsDashboard } from '@/components/analytics/CustomerInsightsDashboard';
import { 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  Star, 
  Target,
  Search,
  RefreshCw,
  Crown,
  Award,
  Shield
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CustomerAnalytics {
  id: string;
  customer_id: string;
  total_orders: number;
  total_spent: number;
  avg_order_value: number;
  last_order_date?: string;
  first_order_date?: string;
  days_since_last_order: number;
  order_frequency: number;
  lifetime_value: number;
  predicted_clv: number;
  engagement_score: number;
  loyalty_tier: string;
  churn_risk: string;
  last_calculated_at: string;
  customers?: {
    id: string;
    name: string;
    company?: string;
    email?: string;
  };
}

interface AnalyticsSummary {
  totalCustomers: number;
  avgLifetimeValue: number;
  avgEngagementScore: number;
  highValueCustomers: number;
  atRiskCustomers: number;
  newCustomers: number;
}

export function CustomerAnalytics() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<CustomerAnalytics[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary>({
    totalCustomers: 0,
    avgLifetimeValue: 0,
    avgEngagementScore: 0,
    highValueCustomers: 0,
    atRiskCustomers: 0,
    newCustomers: 0
  });
  const [loading, setLoading] = useState(true);
  const [calculatingAnalytics, setCalculatingAnalytics] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [selectedRisk, setSelectedRisk] = useState<string>('all');

  // Fetch customer analytics
  const fetchAnalytics = async () => {
    if (!profile?.branch_id) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('customer_analytics')
        .select(`
          *,
          customers(id, name, company, email)
        `)
        .eq('branch_id', profile.branch_id)
        .order('total_spent', { ascending: false });

      if (error) throw error;

      setAnalytics((data || []) as any);
      
      // Calculate summary
      const totalCustomers = data?.length || 0;
      const avgLifetimeValue = totalCustomers > 0 
        ? (data?.reduce((sum, item) => sum + (item.lifetime_value || 0), 0) || 0) / totalCustomers 
        : 0;
      const avgEngagementScore = totalCustomers > 0 
        ? (data?.reduce((sum, item) => sum + (item.engagement_score || 0), 0) || 0) / totalCustomers 
        : 0;
      const highValueCustomers = data?.filter(item => item.loyalty_tier === 'gold' || item.loyalty_tier === 'platinum').length || 0;
      const atRiskCustomers = data?.filter(item => item.churn_risk === 'high').length || 0;
      const newCustomers = data?.filter(item => item.loyalty_tier === 'new').length || 0;

      setSummary({
        totalCustomers,
        avgLifetimeValue,
        avgEngagementScore,
        highValueCustomers,
        atRiskCustomers,
        newCustomers
      });

    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load customer analytics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate analytics for all customers
  const calculateAllAnalytics = async () => {
    if (!profile?.branch_id) return;

    try {
      setCalculatingAnalytics(true);
      
      // Get all customers for the branch
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('id')
        .eq('branch_id', profile.branch_id);

      if (customersError) throw customersError;

      // Calculate analytics for each customer
      for (const customer of customers || []) {
        const { error } = await supabase.rpc('calculate_customer_analytics', {
          p_customer_id: customer.id,
          p_branch_id: profile.branch_id
        });

        if (error) {
          console.error('Error calculating analytics for customer:', customer.id, error);
        }
      }

      toast({
        title: 'Success',
        description: `Analytics calculated for ${customers?.length || 0} customers`,
      });

      // Refresh the data
      await fetchAnalytics();

    } catch (error: any) {
      console.error('Error calculating analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to calculate customer analytics',
        variant: 'destructive',
      });
    } finally {
      setCalculatingAnalytics(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [profile?.branch_id]);

  // Filter analytics based on search and filters
  const filteredAnalytics = analytics.filter(item => {
    const matchesSearch = !searchTerm || 
      item.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customers?.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customers?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTier = selectedTier === 'all' || item.loyalty_tier === selectedTier;
    const matchesRisk = selectedRisk === 'all' || item.churn_risk === selectedRisk;
    
    return matchesSearch && matchesTier && matchesRisk;
  });

  const getLoyaltyIcon = (tier: string) => {
    switch (tier) {
      case 'platinum': return <Crown className="h-4 w-4 text-purple-500" />;
      case 'gold': return <Award className="h-4 w-4 text-yellow-500" />;
      case 'silver': return <Shield className="h-4 w-4 text-gray-400" />;
      case 'bronze': return <Star className="h-4 w-4 text-orange-500" />;
      default: return <Users className="h-4 w-4 text-blue-500" />;
    }
  };

  const getLoyaltyColor = (tier: string) => {
    switch (tier) {
      case 'platinum': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'gold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'silver': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'bronze': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Customer Analytics" subtitle="Deep insights into customer behavior and segmentation">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading analytics...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Customer Analytics" subtitle="Deep insights into customer behavior and segmentation">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalCustomers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg LTV</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{Math.round(summary.avgLifetimeValue).toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(summary.avgEngagementScore)}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Value</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.highValueCustomers}</div>
              <p className="text-xs text-muted-foreground">Gold & Platinum</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">At Risk</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summary.atRiskCustomers}</div>
              <p className="text-xs text-muted-foreground">High churn risk</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{summary.newCustomers}</div>
              <p className="text-xs text-muted-foreground">Recently joined</p>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
            
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="all">All Tiers</option>
              <option value="platinum">Platinum</option>
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
              <option value="bronze">Bronze</option>
              <option value="new">New</option>
            </select>

            <select
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="all">All Risk Levels</option>
              <option value="high">High Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="low">Low Risk</option>
            </select>
          </div>

          <Button 
            onClick={calculateAllAnalytics} 
            disabled={calculatingAnalytics}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${calculatingAnalytics ? 'animate-spin' : ''}`} />
            {calculatingAnalytics ? 'Calculating...' : 'Refresh Analytics'}
          </Button>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="customers" className="w-full">
          <TabsList>
            <TabsTrigger value="customers">Customer List</TabsTrigger>
            <TabsTrigger value="insights">Insights Dashboard</TabsTrigger>
            <TabsTrigger value="segments">Segment Manager</TabsTrigger>
          </TabsList>

          <TabsContent value="customers" className="space-y-4">
            <div className="grid gap-4">
              {filteredAnalytics.map((customer) => (
                <Card key={customer.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{customer.customers?.name || 'Unknown Customer'}</h3>
                          {customer.customers?.company && (
                            <Badge variant="outline">{customer.customers.company}</Badge>
                          )}
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium ${getLoyaltyColor(customer.loyalty_tier)}`}>
                            {getLoyaltyIcon(customer.loyalty_tier)}
                            <span className="capitalize">{customer.loyalty_tier}</span>
                          </div>
                          <Badge variant={getRiskColor(customer.churn_risk)}>
                            {customer.churn_risk.toUpperCase()} RISK
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Lifetime Value</p>
                            <p className="font-medium">₹{customer.lifetime_value?.toLocaleString() || 0}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Total Orders</p>
                            <p className="font-medium">{customer.total_orders}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Avg Order Value</p>
                            <p className="font-medium">₹{Math.round(customer.avg_order_value || 0).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Days Since Last Order</p>
                            <p className="font-medium">{customer.days_since_last_order}</p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-muted-foreground">Engagement Score</span>
                            <span className="text-sm font-medium">{customer.engagement_score}%</span>
                          </div>
                          <Progress value={customer.engagement_score} className="h-2" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredAnalytics.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No customers found</h3>
                    <p className="text-muted-foreground">
                      {analytics.length === 0 
                        ? 'No customer analytics data available. Click "Refresh Analytics" to calculate customer metrics.'
                        : 'No customers match the current filters. Try adjusting your search criteria.'
                      }
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <CustomerInsightsDashboard analytics={analytics} />
          </TabsContent>

          <TabsContent value="segments" className="space-y-4">
            <CustomerSegmentManager onSegmentUpdate={fetchAnalytics} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}