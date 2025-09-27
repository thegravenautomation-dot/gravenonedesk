import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Users, 
  FileText, 
  ShoppingCart, 
  CreditCard, 
  ArrowRight, 
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react";
import { OrderManager } from '@/components/OrderManager';
import { PaymentManager } from '@/components/PaymentManager';
import { QuotationManager } from '@/components/QuotationManager';

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  status: 'completed' | 'active' | 'pending';
  component?: React.ComponentType<any>;
}

interface SalesWorkflowProps {
  leadId?: string;
  customerId?: string;
}

export function SalesWorkflow({ leadId, customerId }: SalesWorkflowProps) {
  const [activeStep, setActiveStep] = useState<string>('quotation');
  const [dialogOpen, setDialogOpen] = useState(false);

  const workflowSteps: WorkflowStep[] = [
    {
      id: 'quotation',
      title: 'Create Quotation',
      description: 'Generate and send quotation to customer',
      icon: FileText,
      status: 'active',
      component: QuotationManager
    },
    {
      id: 'order',
      title: 'Convert to Order',
      description: 'Convert approved quotation to order with attachments',
      icon: ShoppingCart,
      status: 'pending',
      component: OrderManager
    },
    {
      id: 'payment',
      title: 'Record Payment',
      description: 'Record payments and upload receipts',
      icon: CreditCard,
      status: 'pending',
      component: PaymentManager
    },
    {
      id: 'complete',
      title: 'Complete Sale',
      description: 'Order fulfilled and payment complete',
      icon: CheckCircle,
      status: 'pending'
    }
  ];

  const getStatusIcon = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'active':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 border-green-300';
      case 'active':
        return 'bg-blue-100 border-blue-300';
      case 'pending':
        return 'bg-gray-50 border-gray-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const ActiveComponent = workflowSteps.find(step => step.id === activeStep)?.component;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Sales Workflow Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Workflow Steps */}
          <div className="flex items-center justify-between">
            {workflowSteps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center space-y-2">
                  <div 
                    className={`
                      w-12 h-12 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all
                      ${getStatusColor(step.status)}
                      ${activeStep === step.id ? 'ring-2 ring-blue-500' : ''}
                    `}
                    onClick={() => setActiveStep(step.id)}
                  >
                    <step.icon className="h-5 w-5" />
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-sm">{step.title}</div>
                    <div className="text-xs text-muted-foreground max-w-24">
                      {step.description}
                    </div>
                    <div className="mt-1">
                      {getStatusIcon(step.status)}
                    </div>
                  </div>
                </div>
                {index < workflowSteps.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-gray-400 mx-2" />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Current Step Actions */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Current Step: {workflowSteps.find(s => s.id === activeStep)?.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {workflowSteps.find(s => s.id === activeStep)?.description}
                </p>
              </div>
              {ActiveComponent && (
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      Open {workflowSteps.find(s => s.id === activeStep)?.title}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {workflowSteps.find(s => s.id === activeStep)?.title}
                      </DialogTitle>
                    </DialogHeader>
                    <ActiveComponent 
                      leadId={leadId}
                      customerId={customerId}
                      onSuccess={() => setDialogOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 pt-4 border-t">
            {workflowSteps.map((step) => (
              <div key={step.id} className="text-center">
                <Badge 
                  variant={step.status === 'completed' ? 'default' : step.status === 'active' ? 'secondary' : 'outline'}
                  className="w-full justify-center"
                >
                  {step.status === 'completed' ? 'Done' : step.status === 'active' ? 'In Progress' : 'Pending'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}