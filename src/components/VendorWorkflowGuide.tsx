import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  UserPlus, 
  FileText, 
  Send, 
  Eye, 
  CheckCircle, 
  ShoppingCart,
  ArrowRight 
} from 'lucide-react';

interface VendorWorkflowGuideProps {
  userType: 'procurement' | 'vendor';
}

export function VendorWorkflowGuide({ userType }: VendorWorkflowGuideProps) {
  const procurementSteps = [
    {
      step: 1,
      title: "Vendor Registration",
      description: "Vendors register through self-service portal. Review and approve applications.",
      icon: UserPlus,
      status: "ongoing"
    },
    {
      step: 2,
      title: "Create RFQ",
      description: "Create Request for Quotation with product details, quantities, and requirements.",
      icon: FileText,
      status: "active"
    },
    {
      step: 3,
      title: "Send to Vendors",
      description: "Select vendors and send RFQ via email and portal notifications.",
      icon: Send,
      status: "pending"
    },
    {
      step: 4,
      title: "Review Quotations",
      description: "Compare vendor responses and select the best quotation.",
      icon: Eye,
      status: "pending"
    },
    {
      step: 5,
      title: "Generate PO",
      description: "Convert selected quotation to Purchase Order automatically.",
      icon: ShoppingCart,
      status: "pending"
    }
  ];

  const vendorSteps = [
    {
      step: 1,
      title: "Self Registration",
      description: "Register your company with business details and documents.",
      icon: UserPlus,
      status: "completed"
    },
    {
      step: 2,
      title: "Account Approval",
      description: "Wait for procurement team to review and approve your application.",
      icon: CheckCircle,
      status: "active"
    },
    {
      step: 3,
      title: "Receive RFQs",
      description: "Get notified of new RFQs through email and vendor portal.",
      icon: FileText,
      status: "pending"
    },
    {
      step: 4,
      title: "Submit Quotations",
      description: "Login to portal and submit competitive quotations with pricing.",
      icon: Send,
      status: "pending"
    },
    {
      step: 5,
      title: "Receive Orders",
      description: "Get purchase orders for selected quotations.",
      icon: ShoppingCart,
      status: "pending"
    }
  ];

  const steps = userType === 'procurement' ? procurementSteps : vendorSteps;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'ongoing': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {userType === 'procurement' ? 'Procurement Workflow' : 'Vendor Workflow'}
        </CardTitle>
        <CardDescription>
          {userType === 'procurement' 
            ? 'Complete RFQ to Purchase Order process'
            : 'How to participate in the RFQ process'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.step} className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                  <step.icon className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-medium">
                    Step {step.step}: {step.title}
                  </h4>
                  <Badge className={getStatusColor(step.status)}>
                    {step.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {step.description}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div className="flex-shrink-0">
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>
        
        {userType === 'vendor' && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Quick Start</h4>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/vendor/register'}
              >
                Register as Vendor
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/vendor/portal'}
              >
                Access Vendor Portal
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}