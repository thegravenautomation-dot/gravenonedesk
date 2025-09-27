import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface PipelineStage {
  id: string;
  name: string;
  order_index: number;
  color: string;
}

interface Opportunity {
  id: string;
  title: string;
  value: number;
  probability: number;
  stage_id: string;
  expected_close_date?: string;
  priority: string;
  status: string;
  source?: string;
  created_at: string;
}

interface PipelineAnalyticsProps {
  stages: PipelineStage[];
  opportunities: Opportunity[];
}

export function PipelineAnalytics({ stages, opportunities }: PipelineAnalyticsProps) {
  // Calculate stage metrics
  const stageMetrics = stages.map(stage => {
    const stageOpportunities = opportunities.filter(opp => opp.stage_id === stage.id);
    const count = stageOpportunities.length;
    const value = stageOpportunities.reduce((sum, opp) => sum + (opp.value || 0), 0);
    const avgProbability = count > 0 
      ? stageOpportunities.reduce((sum, opp) => sum + (opp.probability || 0), 0) / count 
      : 0;
    
    return {
      id: stage.id,
      name: stage.name,
      color: stage.color,
      count,
      value,
      avgProbability: Math.round(avgProbability),
    };
  });

  // Calculate priority distribution
  const priorityData = ['low', 'medium', 'high', 'urgent'].map(priority => {
    const count = opportunities.filter(opp => opp.priority === priority).length;
    const value = opportunities
      .filter(opp => opp.priority === priority)
      .reduce((sum, opp) => sum + (opp.value || 0), 0);
    
    return {
      priority,
      count,
      value,
      color: priority === 'urgent' ? '#ef4444' : 
             priority === 'high' ? '#f97316' : 
             priority === 'medium' ? '#eab308' : '#22c55e'
    };
  });

  // Calculate source distribution
  const sourceData = opportunities.reduce((acc, opp) => {
    const source = opp.source || 'Unknown';
    if (!acc[source]) {
      acc[source] = { source, count: 0, value: 0 };
    }
    acc[source].count++;
    acc[source].value += opp.value || 0;
    return acc;
  }, {} as Record<string, { source: string; count: number; value: number }>);

  const sourceArray = Object.values(sourceData).sort((a, b) => b.value - a.value);

  // Calculate conversion rates between stages
  const conversionRates = stages.slice(0, -1).map((stage, index) => {
    const currentCount = stageMetrics[index].count;
    const nextCount = stageMetrics[index + 1]?.count || 0;
    const rate = currentCount > 0 ? (nextCount / currentCount) * 100 : 0;
    
    return {
      from: stage.name,
      to: stages[index + 1]?.name || '',
      rate: Math.round(rate),
      currentCount,
      nextCount,
    };
  });

  // Calculate time-based metrics
  const thisMonth = new Date();
  thisMonth.setDate(1);
  
  const thisMonthOpps = opportunities.filter(opp => 
    new Date(opp.created_at) >= thisMonth
  );

  const upcomingDeadlines = opportunities
    .filter(opp => opp.expected_close_date && new Date(opp.expected_close_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
    .sort((a, b) => new Date(a.expected_close_date!).getTime() - new Date(b.expected_close_date!).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stage Performance */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pipeline by Stage</CardTitle>
            <CardDescription>Opportunities and value distribution across stages</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stageMetrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'count' ? value : `₹${Number(value).toLocaleString()}`,
                    name === 'count' ? 'Opportunities' : 'Total Value'
                  ]}
                />
                <Bar yAxisId="left" dataKey="count" fill="#3b82f6" name="count" />
                <Bar yAxisId="right" dataKey="value" fill="#10b981" name="value" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Priority Distribution</CardTitle>
            <CardDescription>Opportunities by priority level</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  dataKey="count"
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ priority, count }) => `${priority}: ${count}`}
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Rates */}
      <Card>
        <CardHeader>
          <CardTitle>Stage Conversion Rates</CardTitle>
          <CardDescription>How opportunities flow through your pipeline</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {conversionRates.map((conversion, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {conversion.from} → {conversion.to}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {conversion.nextCount}/{conversion.currentCount} ({conversion.rate}%)
                    </span>
                  </div>
                  <Progress value={conversion.rate} className="h-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Additional Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* This Month */}
        <Card>
          <CardHeader>
            <CardTitle>This Month</CardTitle>
            <CardDescription>New opportunities created</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thisMonthOpps.length}</div>
            <p className="text-xs text-muted-foreground">
              ₹{thisMonthOpps.reduce((sum, opp) => sum + (opp.value || 0), 0).toLocaleString()} total value
            </p>
          </CardContent>
        </Card>

        {/* Lead Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Top Sources</CardTitle>
            <CardDescription>Best performing lead sources</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {sourceArray.slice(0, 3).map((source, index) => (
              <div key={source.source} className="flex items-center justify-between">
                <span className="text-sm font-medium">{source.source}</span>
                <div className="text-right">
                  <Badge variant="outline">{source.count}</Badge>
                  <div className="text-xs text-muted-foreground">
                    ₹{source.value.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Deadlines</CardTitle>
            <CardDescription>Closing this week</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingDeadlines.length > 0 ? (
              upcomingDeadlines.map(opp => (
                <div key={opp.id} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{opp.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(opp.expected_close_date!).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline">₹{opp.value?.toLocaleString()}</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}