import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Users, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CustomerSegment {
  id: string;
  name: string;
  description?: string;
  criteria: any;
  color: string;
  is_automated: boolean;
  branch_id: string;
  created_at: string;
  customer_count?: number;
}

interface CustomerSegmentManagerProps {
  onSegmentUpdate: () => void;
}

export function CustomerSegmentManager({ onSegmentUpdate }: CustomerSegmentManagerProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState<CustomerSegment | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    criteria: {
      min_total_spent: '',
      min_orders: '',
      loyalty_tier: '',
      churn_risk: '',
      engagement_score_min: '',
      days_since_last_order_max: ''
    }
  });

  // Fetch segments
  const fetchSegments = async () => {
    if (!profile?.branch_id) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('customer_segments')
        .select('*')
        .eq('branch_id', profile.branch_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get customer count for each segment
      const segmentsWithCounts = await Promise.all(
        (data || []).map(async (segment) => {
          const { count } = await supabase
            .from('customer_analytics')
            .select('*', { count: 'exact', head: true })
            .eq('branch_id', profile.branch_id);
          
          return { ...segment, customer_count: count || 0 };
        })
      );

      setSegments(segmentsWithCounts);

    } catch (error: any) {
      console.error('Error fetching segments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load customer segments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSegments();
  }, [profile?.branch_id]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a segment name',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Build criteria object
      const criteria: any = {};
      
      if (formData.criteria.min_total_spent) {
        criteria.min_total_spent = parseFloat(formData.criteria.min_total_spent);
      }
      if (formData.criteria.min_orders) {
        criteria.min_orders = parseInt(formData.criteria.min_orders);
      }
      if (formData.criteria.loyalty_tier) {
        criteria.loyalty_tier = formData.criteria.loyalty_tier.split(',').map(t => t.trim());
      }
      if (formData.criteria.churn_risk) {
        criteria.churn_risk = formData.criteria.churn_risk;
      }
      if (formData.criteria.engagement_score_min) {
        criteria.engagement_score_min = parseInt(formData.criteria.engagement_score_min);
      }
      if (formData.criteria.days_since_last_order_max) {
        criteria.days_since_last_order_max = parseInt(formData.criteria.days_since_last_order_max);
      }

      const segmentData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        criteria: JSON.stringify(criteria),
        color: formData.color,
        branch_id: profile?.branch_id,
        created_by: profile?.id,
      };

      let error;
      
      if (editingSegment) {
        const { error: updateError } = await supabase
          .from('customer_segments')
          .update(segmentData)
          .eq('id', editingSegment.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('customer_segments')
          .insert(segmentData);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Segment ${editingSegment ? 'updated' : 'created'} successfully`,
      });

      setIsCreateDialogOpen(false);
      setEditingSegment(null);
      resetForm();
      await fetchSegments();
      onSegmentUpdate();

    } catch (error: any) {
      console.error('Error saving segment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save segment',
        variant: 'destructive',
      });
    }
  };

  // Delete segment
  const handleDelete = async (segmentId: string) => {
    try {
      const { error } = await supabase
        .from('customer_segments')
        .delete()
        .eq('id', segmentId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Segment deleted successfully',
      });

      await fetchSegments();
      onSegmentUpdate();

    } catch (error: any) {
      console.error('Error deleting segment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete segment',
        variant: 'destructive',
      });
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#3B82F6',
      criteria: {
        min_total_spent: '',
        min_orders: '',
        loyalty_tier: '',
        churn_risk: '',
        engagement_score_min: '',
        days_since_last_order_max: ''
      }
    });
  };

  // Handle edit
  const handleEdit = (segment: CustomerSegment) => {
    const criteria = segment.criteria || {};
    setFormData({
      name: segment.name,
      description: segment.description || '',
      color: segment.color,
      criteria: {
        min_total_spent: criteria.min_total_spent?.toString() || '',
        min_orders: criteria.min_orders?.toString() || '',
        loyalty_tier: Array.isArray(criteria.loyalty_tier) ? criteria.loyalty_tier.join(', ') : criteria.loyalty_tier || '',
        churn_risk: criteria.churn_risk || '',
        engagement_score_min: criteria.engagement_score_min?.toString() || '',
        days_since_last_order_max: criteria.days_since_last_order_max?.toString() || ''
      }
    });
    setEditingSegment(segment);
    setIsCreateDialogOpen(true);
  };

  // Handle create new
  const handleCreateNew = () => {
    resetForm();
    setEditingSegment(null);
    setIsCreateDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-muted-foreground">Loading segments...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Customer Segments</h3>
          <p className="text-sm text-muted-foreground">
            Create and manage customer segments based on behavior and characteristics
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              Create Segment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingSegment ? 'Edit Segment' : 'Create New Segment'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Segment Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., High Value Customers"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the characteristics of this segment"
                  rows={3}
                />
              </div>

              <div>
                <Label className="text-base font-medium">Segment Criteria</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Define the conditions that customers must meet to be included in this segment
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="min_total_spent">Minimum Total Spent (₹)</Label>
                    <Input
                      id="min_total_spent"
                      type="number"
                      value={formData.criteria.min_total_spent}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        criteria: { ...formData.criteria, min_total_spent: e.target.value } 
                      })}
                      placeholder="e.g., 50000"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="min_orders">Minimum Orders</Label>
                    <Input
                      id="min_orders"
                      type="number"
                      value={formData.criteria.min_orders}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        criteria: { ...formData.criteria, min_orders: e.target.value } 
                      })}
                      placeholder="e.g., 3"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="loyalty_tier">Loyalty Tiers (comma-separated)</Label>
                    <Input
                      id="loyalty_tier"
                      value={formData.criteria.loyalty_tier}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        criteria: { ...formData.criteria, loyalty_tier: e.target.value } 
                      })}
                      placeholder="e.g., gold, platinum"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="churn_risk">Churn Risk Level</Label>
                    <select
                      id="churn_risk"
                      value={formData.criteria.churn_risk}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        criteria: { ...formData.criteria, churn_risk: e.target.value } 
                      })}
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    >
                      <option value="">Any</option>
                      <option value="low">Low Risk</option>
                      <option value="medium">Medium Risk</option>
                      <option value="high">High Risk</option>
                    </select>
                  </div>
                  
                  <div>
                    <Label htmlFor="engagement_score_min">Min Engagement Score (%)</Label>
                    <Input
                      id="engagement_score_min"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.criteria.engagement_score_min}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        criteria: { ...formData.criteria, engagement_score_min: e.target.value } 
                      })}
                      placeholder="e.g., 70"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="days_since_last_order_max">Max Days Since Last Order</Label>
                    <Input
                      id="days_since_last_order_max"
                      type="number"
                      value={formData.criteria.days_since_last_order_max}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        criteria: { ...formData.criteria, days_since_last_order_max: e.target.value } 
                      })}
                      placeholder="e.g., 30"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingSegment ? 'Update Segment' : 'Create Segment'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Segments List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {segments.map((segment) => (
          <Card key={segment.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: segment.color }}
                  />
                  <div>
                    <CardTitle className="text-base">{segment.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {segment.customer_count || 0} customers
                    </CardDescription>
                  </div>
                </div>
                
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(segment)}>
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDelete(segment.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              {segment.description && (
                <p className="text-sm text-muted-foreground mb-3">
                  {segment.description}
                </p>
              )}
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {segment.customer_count || 0} customers match
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Target className="h-3 w-3 text-muted-foreground" />
                  <Badge variant={segment.is_automated ? "default" : "secondary"} className="text-xs">
                    {segment.is_automated ? "Automated" : "Manual"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {segments.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No segments created</h3>
              <p className="text-muted-foreground mb-4">
                Create your first customer segment to start organizing your customers by behavior and characteristics.
              </p>
              <Button onClick={handleCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Segment
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}