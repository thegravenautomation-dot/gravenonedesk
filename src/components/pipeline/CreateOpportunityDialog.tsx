import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface PipelineStage {
  id: string;
  name: string;
  order_index: number;
  color: string;
}

interface Customer {
  id: string;
  name: string;
  company?: string;
}

interface CreateOpportunityDialogProps {
  stages: PipelineStage[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function CreateOpportunityDialog({ stages, onSuccess, onCancel }: CreateOpportunityDialogProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    value: '',
    probability: '50',
    stage_id: stages[0]?.id || '',
    expected_close_date: '',
    customer_id: '',
    priority: 'medium',
    source: '',
  });

  // Fetch customers
  useEffect(() => {
    const fetchCustomers = async () => {
      if (!profile?.branch_id) return;

      try {
        const { data, error } = await supabase
          .from('customers')
          .select('id, name, company')
          .eq('branch_id', profile.branch_id)
          .order('name');

        if (error) throw error;
        setCustomers(data || []);
      } catch (error) {
        console.error('Error fetching customers:', error);
      }
    };

    fetchCustomers();
  }, [profile?.branch_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a title for the opportunity',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('opportunities')
        .insert({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          value: parseFloat(formData.value) || 0,
          probability: parseInt(formData.probability) || 50,
          stage_id: formData.stage_id,
          expected_close_date: formData.expected_close_date || null,
          customer_id: formData.customer_id || null,
          priority: formData.priority,
          source: formData.source.trim() || null,
          branch_id: profile?.branch_id,
          assigned_to: profile?.id,
          created_by: profile?.id,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Opportunity created successfully',
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error creating opportunity:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create opportunity',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Title */}
        <div className="md:col-span-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="Enter opportunity title"
            required
          />
        </div>

        {/* Customer */}
        <div>
          <Label htmlFor="customer_id">Customer</Label>
          <Select value={formData.customer_id} onValueChange={(value) => handleChange('customer_id', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.map(customer => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name} {customer.company && `(${customer.company})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stage */}
        <div>
          <Label htmlFor="stage_id">Pipeline Stage *</Label>
          <Select value={formData.stage_id} onValueChange={(value) => handleChange('stage_id', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select stage" />
            </SelectTrigger>
            <SelectContent>
              {stages.map(stage => (
                <SelectItem key={stage.id} value={stage.id}>
                  {stage.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Value */}
        <div>
          <Label htmlFor="value">Deal Value (₹)</Label>
          <Input
            id="value"
            type="number"
            min="0"
            step="0.01"
            value={formData.value}
            onChange={(e) => handleChange('value', e.target.value)}
            placeholder="0.00"
          />
        </div>

        {/* Probability */}
        <div>
          <Label htmlFor="probability">Win Probability (%)</Label>
          <Input
            id="probability"
            type="number"
            min="0"
            max="100"
            value={formData.probability}
            onChange={(e) => handleChange('probability', e.target.value)}
          />
        </div>

        {/* Expected Close Date */}
        <div>
          <Label htmlFor="expected_close_date">Expected Close Date</Label>
          <Input
            id="expected_close_date"
            type="date"
            value={formData.expected_close_date}
            onChange={(e) => handleChange('expected_close_date', e.target.value)}
          />
        </div>

        {/* Priority */}
        <div>
          <Label htmlFor="priority">Priority</Label>
          <Select value={formData.priority} onValueChange={(value) => handleChange('priority', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Source */}
        <div className="md:col-span-2">
          <Label htmlFor="source">Source</Label>
          <Input
            id="source"
            value={formData.source}
            onChange={(e) => handleChange('source', e.target.value)}
            placeholder="e.g., Website, Referral, Trade Show"
          />
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Enter opportunity details..."
            rows={3}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Opportunity'}
        </Button>
      </div>
    </form>
  );
}