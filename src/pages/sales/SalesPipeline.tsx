import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PipelineBoard } from '@/components/pipeline/PipelineBoard';
import { CreateOpportunityDialog } from '@/components/pipeline/CreateOpportunityDialog';
import { PipelineAnalytics } from '@/components/pipeline/PipelineAnalytics';
import { Plus, Search, Filter, TrendingUp, DollarSign, Users, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PipelineStage {
  id: string;
  name: string;
  order_index: number;
  color: string;
  branch_id: string;
  is_active: boolean;
}

interface Opportunity {
  id: string;
  title: string;
  description?: string;
  value: number;
  probability: number;
  stage_id: string;
  expected_close_date?: string;
  assigned_to?: string;
  customer_id?: string;
  priority: string;
  status: string;
  source?: string;
  created_at: string;
  customers?: {
    name: string;
    company?: string;
  };
  profiles?: {
    full_name: string;
  };
}

export function SalesPipeline() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Fetch pipeline data
  const fetchPipelineData = async () => {
    if (!profile?.branch_id) return;

    try {
      setLoading(true);
      
      // Fetch stages
      const { data: stagesData, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('branch_id', profile.branch_id)
        .eq('is_active', true)
        .order('order_index');

      if (stagesError) throw stagesError;
      setStages(stagesData || []);

      // Fetch opportunities with related data
      const { data: opportunitiesData, error: opportunitiesError } = await supabase
        .from('opportunities')
        .select(`
          *,
          customers(name, company),
          profiles(full_name)
        `)
        .eq('branch_id', profile.branch_id)
        .eq('status', 'active');

      if (opportunitiesError) throw opportunitiesError;
      setOpportunities((opportunitiesData || []) as any);

    } catch (error: any) {
      console.error('Error fetching pipeline data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pipeline data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelineData();
  }, [profile?.branch_id]);

  // Calculate pipeline metrics
  const totalOpportunities = opportunities.length;
  const totalValue = opportunities.reduce((sum, opp) => sum + (opp.value || 0), 0);
  const avgDealSize = totalOpportunities > 0 ? totalValue / totalOpportunities : 0;
  const weightedValue = opportunities.reduce((sum, opp) => sum + ((opp.value || 0) * (opp.probability || 0) / 100), 0);

  // Filter opportunities
  const filteredOpportunities = opportunities.filter(opp => {
    const matchesSearch = !searchTerm || 
      opp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.customers?.company?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStage = selectedStage === 'all' || opp.stage_id === selectedStage;
    
    return matchesSearch && matchesStage;
  });

  if (loading) {
    return (
      <DashboardLayout title="Sales Pipeline" subtitle="Visual opportunity management">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading pipeline...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Sales Pipeline" subtitle="Visual opportunity management">
      <div className="space-y-6">
        {/* Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Opportunities</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOpportunities}</div>
              <p className="text-xs text-muted-foreground">Active deals in pipeline</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalValue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Pipeline value</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Weighted Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{Math.round(weightedValue).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Expected revenue</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Deal Size</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{Math.round(avgDealSize).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Per opportunity</p>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-1 gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search opportunities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="all">All Stages</option>
              {stages.map(stage => (
                <option key={stage.id} value={stage.id}>{stage.name}</option>
              ))}
            </select>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Opportunity
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Opportunity</DialogTitle>
              </DialogHeader>
              <CreateOpportunityDialog
                stages={stages}
                onSuccess={() => {
                  setIsCreateDialogOpen(false);
                  fetchPipelineData();
                }}
                onCancel={() => setIsCreateDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="board" className="w-full">
          <TabsList>
            <TabsTrigger value="board">Pipeline Board</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="board" className="space-y-4">
            <PipelineBoard
              stages={stages}
              opportunities={filteredOpportunities}
              onOpportunityUpdate={fetchPipelineData}
            />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <PipelineAnalytics
              stages={stages}
              opportunities={opportunities}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}