import React from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { DashboardCard } from '@/components/DashboardCard'
import { RevenueChart } from '@/components/charts/RevenueChart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TrendingUp, Users, DollarSign, Package, BarChart3, PieChart, Target, Calendar } from 'lucide-react'

export default function AnalyticsDashboard() {
  // Sample analytics data
  const salesMetrics = {
    totalRevenue: 2450000,
    totalLeads: 156,
    conversionRate: 23.5,
    avgDealSize: 85000,
  }

  const leadSources = [
    { source: 'Website', count: 45, percentage: 28.8 },
    { source: 'IndiaMART', count: 38, percentage: 24.4 },
    { source: 'TradeIndia', count: 28, percentage: 17.9 },
    { source: 'Referral', count: 25, percentage: 16.0 },
    { source: 'Cold Call', count: 20, percentage: 12.8 },
  ]

  const topPerformers = [
    { name: 'Rajesh Kumar', deals: 12, revenue: 450000 },
    { name: 'Priya Sharma', deals: 10, revenue: 380000 },
    { name: 'Amit Singh', deals: 8, revenue: 290000 },
    { name: 'Sneha Patel', deals: 7, revenue: 245000 },
  ]

  const regionData = [
    { region: 'North India', revenue: 850000, deals: 32 },
    { region: 'West India', revenue: 680000, deals: 28 },
    { region: 'South India', revenue: 520000, deals: 24 },
    { region: 'East India', revenue: 400000, deals: 18 },
  ]

  return (
    <DashboardLayout title="Analytics Dashboard" subtitle="Business intelligence and performance metrics">
      <div className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <DashboardCard
            title="Total Revenue"
            value={`₹${(salesMetrics.totalRevenue / 100000).toFixed(1)}L`}
            icon={DollarSign}
            variant="green"
            change={{ value: '+12.5%', trend: 'up' }}
          />
          <DashboardCard
            title="Total Leads"
            value={salesMetrics.totalLeads.toString()}
            icon={Users}
            variant="blue"
            change={{ value: '+8.2%', trend: 'up' }}
          />
          <DashboardCard
            title="Conversion Rate"
            value={`${salesMetrics.conversionRate}%`}
            icon={Target}
            variant="purple"
            change={{ value: '+2.1%', trend: 'up' }}
          />
          <DashboardCard
            title="Avg Deal Size"
            value={`₹${(salesMetrics.avgDealSize / 1000).toFixed(0)}K`}
            icon={TrendingUp}
            variant="orange"
            change={{ value: '+5.7%', trend: 'up' }}
          />
        </div>

        {/* Charts Section */}
        <Tabs defaultValue="sales" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="sales">Sales Analytics</TabsTrigger>
            <TabsTrigger value="leads">Lead Analytics</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="regions">Regional</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Revenue Trend
                  </CardTitle>
                  <CardDescription>Monthly revenue vs target comparison</CardDescription>
                </CardHeader>
                <CardContent>
                  <RevenueChart />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Sales Pipeline
                  </CardTitle>
                  <CardDescription>Deals by stage</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Qualified</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-secondary rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                        </div>
                        <span className="text-sm text-muted-foreground">65%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Proposal</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-secondary rounded-full h-2">
                          <div className="bg-purple-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                        </div>
                        <span className="text-sm text-muted-foreground">45%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Negotiation</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-secondary rounded-full h-2">
                          <div className="bg-orange-500 h-2 rounded-full" style={{ width: '30%' }}></div>
                        </div>
                        <span className="text-sm text-muted-foreground">30%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Closed Won</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-secondary rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: '25%' }}></div>
                        </div>
                        <span className="text-sm text-muted-foreground">25%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="leads" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Lead Sources Performance</CardTitle>
                <CardDescription>Lead generation by source with conversion rates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {leadSources.map((source) => (
                    <div key={source.source} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-primary rounded-full"></div>
                        <span className="font-medium">{source.source}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">{source.count} leads</span>
                        <span className="text-sm font-medium">{source.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
                <CardDescription>Best performing sales executives this month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topPerformers.map((performer, index) => (
                    <div key={performer.name} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <span className="font-medium">{performer.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">{performer.deals} deals</span>
                        <span className="text-sm font-medium">₹{(performer.revenue / 100000).toFixed(1)}L</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="regions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Regional Performance</CardTitle>
                <CardDescription>Sales performance across different regions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {regionData.map((region) => (
                    <div key={region.region} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="font-medium">{region.region}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">{region.deals} deals</span>
                        <span className="text-sm font-medium">₹{(region.revenue / 100000).toFixed(1)}L</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}