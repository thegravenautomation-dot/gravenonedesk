import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MoreHorizontal, User, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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

interface PipelineBoardProps {
  stages: PipelineStage[];
  opportunities: Opportunity[];
  onOpportunityUpdate: () => void;
}

export function PipelineBoard({ stages, opportunities, onOpportunityUpdate }: PipelineBoardProps) {
  const { toast } = useToast();
  const [draggedOpportunity, setDraggedOpportunity] = useState<string | null>(null);

  // Group opportunities by stage
  const opportunitiesByStage = stages.reduce((acc, stage) => {
    acc[stage.id] = opportunities.filter(opp => opp.stage_id === stage.id);
    return acc;
  }, {} as Record<string, Opportunity[]>);

  const handleDragStart = (e: React.DragEvent, opportunityId: string) => {
    setDraggedOpportunity(opportunityId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    
    if (!draggedOpportunity) return;

    try {
      const { error } = await supabase
        .from('opportunities')
        .update({ stage_id: stageId })
        .eq('id', draggedOpportunity);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Opportunity moved successfully',
      });

      onOpportunityUpdate();
    } catch (error: any) {
      console.error('Error moving opportunity:', error);
      toast({
        title: 'Error',
        description: 'Failed to move opportunity',
        variant: 'destructive',
      });
    } finally {
      setDraggedOpportunity(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="flex gap-6 overflow-x-auto pb-4">
      {stages.map((stage) => {
        const stageOpportunities = opportunitiesByStage[stage.id] || [];
        const stageValue = stageOpportunities.reduce((sum, opp) => sum + (opp.value || 0), 0);

        return (
          <div
            key={stage.id}
            className="min-w-80 flex-shrink-0"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            {/* Stage Header */}
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  <h3 className="font-medium">{stage.name}</h3>
                  <Badge variant="outline">{stageOpportunities.length}</Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                ₹{stageValue.toLocaleString()}
              </p>
            </div>

            {/* Opportunities */}
            <div className="space-y-3">
              {stageOpportunities.map((opportunity) => (
                <Card
                  key={opportunity.id}
                  className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                  draggable
                  onDragStart={(e) => handleDragStart(e, opportunity.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm font-medium line-clamp-2">
                        {opportunity.title}
                      </CardTitle>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0 space-y-3">
                    {/* Customer */}
                    {opportunity.customers && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span className="truncate">
                          {opportunity.customers.name}
                          {opportunity.customers.company && ` (${opportunity.customers.company})`}
                        </span>
                      </div>
                    )}

                    {/* Value and Probability */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm font-medium">
                        <DollarSign className="h-3 w-3" />
                        ₹{opportunity.value?.toLocaleString() || 0}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {opportunity.probability}% win
                      </Badge>
                    </div>

                    {/* Expected Close Date */}
                    {opportunity.expected_close_date && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(opportunity.expected_close_date).toLocaleDateString()}</span>
                      </div>
                    )}

                    {/* Priority and Assigned User */}
                    <div className="flex items-center justify-between">
                      <Badge variant={getPriorityColor(opportunity.priority)} className="text-xs">
                        {opportunity.priority}
                      </Badge>
                      
                      {opportunity.profiles && (
                        <div className="flex items-center gap-1">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-xs">
                              {opportunity.profiles.full_name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground truncate max-w-20">
                            {opportunity.profiles.full_name}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Empty State */}
              {stageOpportunities.length === 0 && (
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <p className="text-sm text-muted-foreground">No opportunities</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}