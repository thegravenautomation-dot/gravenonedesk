import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, ScatterChart, Scatter } from 'recharts';

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
    name: string;
    company?: string;
  };
}

interface CustomerInsightsDashboardProps {
  analytics: CustomerAnalytics[];
}

export function CustomerInsightsDashboard({ analytics }: CustomerInsightsDashboardProps) {
  // Loyalty tier distribution
  const loyaltyDistribution = ['new', 'bronze', 'silver', 'gold', 'platinum'].map(tier => {
    const count = analytics.filter(c => c.loyalty_tier === tier).length;
    const value = analytics.filter(c => c.loyalty_tier === tier).reduce((sum, c) => sum + c.lifetime_value, 0);
    
    return {
      tier,
      count,
      value,
      color: tier === 'platinum' ? '#8B5CF6' : 
             tier === 'gold' ? '#F59E0B' : 
             tier === 'silver' ? '#6B7280' : 
             tier === 'bronze' ? '#EA580C' : '#3B82F6'
    };
  });

  // Churn risk analysis
  const churnRiskData = ['low', 'medium', 'high'].map(risk => ({
    risk,
    count: analytics.filter(c => c.churn_risk === risk).length,
    avgValue: analytics.filter(c => c.churn_risk === risk).reduce((sum, c, _, arr) => 
      arr.length > 0 ? sum + c.lifetime_value / arr.length : 0, 0
    ),
    color: risk === 'high' ? '#EF4444' : risk === 'medium' ? '#F59E0B' : '#10B981'
  }));

  // Engagement vs Value scatter plot data
  const engagementValueData = analytics.map(c => ({
    name: c.customers?.name || 'Unknown',
    engagement: c.engagement_score,
    value: c.lifetime_value,
    tier: c.loyalty_tier,
    risk: c.churn_risk
  }));

  // Customer lifetime value buckets
  const clvBuckets = [
    { range: '0-10K', min: 0, max: 10000 },
    { range: '10K-50K', min: 10000, max: 50000 },
    { range: '50K-100K', min: 50000, max: 100000 },
    { range: '100K-500K', min: 100000, max: 500000 },
    { range: '500K+', min: 500000, max: Infinity }
  ].map(bucket => ({
    ...bucket,
    count: analytics.filter(c => c.lifetime_value >= bucket.min && c.lifetime_value < bucket.max).length,
    avgOrders: analytics.filter(c => c.lifetime_value >= bucket.min && c.lifetime_value < bucket.max)
      .reduce((sum, c, _, arr) => arr.length > 0 ? sum + c.total_orders / arr.length : 0, 0)
  }));

  // Order frequency analysis
  const frequencyData = analytics.map(c => ({
    frequency: c.order_frequency,
    value: c.lifetime_value,
    tier: c.loyalty_tier
  })).sort((a, b) => a.frequency - b.frequency);

  // Top customers by different metrics
  const topCustomersByValue = [...analytics]
    .sort((a, b) => b.lifetime_value - a.lifetime_value)
    .slice(0, 5);

  const topCustomersByEngagement = [...analytics]
    .sort((a, b) => b.engagement_score - a.engagement_score)
    .slice(0, 5);

  const atRiskHighValueCustomers = analytics
    .filter(c => c.churn_risk === 'high' && c.lifetime_value > 50000)
    .sort((a, b) => b.lifetime_value - a.lifetime_value);

  return (
    <div className="space-y-6">
      {/* Key Insights Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Revenue Concentration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((loyaltyDistribution.find(l => l.tier === 'platinum')?.value || 0) / 
                analytics.reduce((sum, c) => sum + c.lifetime_value, 0) * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">from Platinum customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Churn Risk Alert</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {churnRiskData.find(r => r.risk === 'high')?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground">customers at high risk</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Avg CLV Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {analytics.length > 0 ? Math.round(
                analytics.reduce((sum, c) => sum + c.predicted_clv, 0) / 
                analytics.reduce((sum, c) => sum + c.lifetime_value, 0) * 100 - 100
              ) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">predicted growth potential</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.length > 0 ? Math.round(
                analytics.reduce((sum, c) => sum + c.engagement_score, 0) / analytics.length
              ) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">average across all customers</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Loyalty Tier Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Distribution by Loyalty Tier</CardTitle>
            <CardDescription>Customer count and revenue by tier</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={loyaltyDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="tier" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'count' ? value : `₹${Number(value).toLocaleString()}`,
                    name === 'count' ? 'Customers' : 'Total Value'
                  ]}
                />
                <Bar yAxisId="left" dataKey="count" fill="#3b82f6" name="count" />
                <Bar yAxisId="right" dataKey="value" fill="#10b981" name="value" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Churn Risk Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Churn Risk Analysis</CardTitle>
            <CardDescription>Distribution of customers by churn risk level</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  dataKey="count"
                  data={churnRiskData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ risk, count }) => `${risk}: ${count}`}
                >
                  {churnRiskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* CLV Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Lifetime Value Distribution</CardTitle>
            <CardDescription>Number of customers in each value range</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={clvBuckets}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip formatter={(value) => [value, 'Customers']} />
                <Bar dataKey="count" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Engagement vs Value Scatter */}
        <Card>
          <CardHeader>
            <CardTitle>Engagement vs Lifetime Value</CardTitle>
            <CardDescription>Customer positioning by engagement and value</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart data={engagementValueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="engagement" name="Engagement Score" />
                <YAxis dataKey="value" name="Lifetime Value" />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'value' ? `₹${Number(value).toLocaleString()}` : `${value}%`,
                    name === 'value' ? 'Lifetime Value' : 'Engagement Score'
                  ]}
                  labelFormatter={(label) => `Customer: ${engagementValueData.find(d => d.engagement === label)?.name || 'Unknown'}`}
                />
                <Scatter dataKey="value" fill="#8b5cf6" />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Customers Lists */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Top by Value */}
        <Card>
          <CardHeader>
            <CardTitle>Top Customers by Value</CardTitle>
            <CardDescription>Highest lifetime value customers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topCustomersByValue.map((customer, index) => (
              <div key={customer.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{index + 1}</Badge>
                  <div>
                    <p className="font-medium text-sm">{customer.customers?.name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">
                      {customer.total_orders} orders
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-sm">₹{customer.lifetime_value.toLocaleString()}</p>
                  <Badge variant="outline" className="text-xs">
                    {customer.loyalty_tier}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top by Engagement */}
        <Card>
          <CardHeader>
            <CardTitle>Most Engaged Customers</CardTitle>
            <CardDescription>Highest engagement scores</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topCustomersByEngagement.map((customer, index) => (
              <div key={customer.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{index + 1}</Badge>
                  <div>
                    <p className="font-medium text-sm">{customer.customers?.name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">
                      ₹{customer.lifetime_value.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-sm">{customer.engagement_score}%</p>
                  <Progress value={customer.engagement_score} className="h-1 w-16" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* At Risk High Value */}
        <Card>
          <CardHeader>
            <CardTitle>At-Risk High-Value Customers</CardTitle>
            <CardDescription>Urgent attention required</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {atRiskHighValueCustomers.length > 0 ? (
              atRiskHighValueCustomers.slice(0, 5).map((customer, index) => (
                <div key={customer.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">!</Badge>
                    <div>
                      <p className="font-medium text-sm">{customer.customers?.name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">
                        {customer.days_since_last_order} days since last order
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">₹{customer.lifetime_value.toLocaleString()}</p>
                    <Badge variant="destructive" className="text-xs">
                      HIGH RISK
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground text-sm py-4">
                No high-value customers at risk
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}