import { DashboardLayout } from '@/components/DashboardLayout';
import { LeadManagement } from '@/components/LeadManagement';
import { FollowUpManager } from '@/components/FollowUpManager';
import { DashboardFollowUps } from '@/components/DashboardFollowUps';
import { PersonalAnalytics } from '@/components/analytics/PersonalAnalytics';
import { AIAssistant } from '@/components/AIAssistant';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Target, TrendingUp, Bot } from 'lucide-react';

export default function SalesDashboard() {
  const { profile } = useAuth();

  // Sales hierarchy access control - using string comparison for role checking
  const userRole = profile?.role as any;
  const canManageTeam = userRole === 'admin' || userRole === 'sales_manager';
  const isSalesRole = ['sales_manager', 'bdo', 'fbdo', 'manager'].includes(userRole || '');

  const getRoleHierarchy = () => {
    const role = profile?.role as string;
    switch (role) {
      case 'admin':
        return 'Full System Access';
      case 'sales_manager':
        return 'Sales Team Manager - Full Sales Control';
      case 'bdo':
        return 'Business Development Officer';
      case 'fbdo':
        return 'Field Business Development Officer';
      case 'manager':
        return profile?.department === 'Sales' ? 'Department Manager' : 'Manager';
      default:
        return 'Team Member';
    }
  };

  return (
    <DashboardLayout 
      title="Sales & Leads" 
      subtitle={`${getRoleHierarchy()} - Manage leads, sync portals, and pipeline`}
    >
      {/* Role-based access info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Your Access Level
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge variant={canManageTeam ? 'default' : 'secondary'}>
              {getRoleHierarchy()}
            </Badge>
            <div className="text-sm text-muted-foreground">
              {canManageTeam 
                ? 'You have full control over sales operations and team management'
                : isSalesRole 
                  ? 'You can manage your leads and follow-ups'
                  : 'Limited sales access'
              }
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="leads" className="space-y-4">
        <TabsList>
          <TabsTrigger value="leads">Lead Management</TabsTrigger>
          <TabsTrigger value="followups">Follow-ups</TabsTrigger>
          <TabsTrigger value="dashboard">Today's Follow-ups</TabsTrigger>
          <TabsTrigger value="analytics">My Analytics</TabsTrigger>
          <TabsTrigger value="ai-assistant">
            <Bot className="h-4 w-4 mr-1" />
            AI Assistant
          </TabsTrigger>
          {canManageTeam && (
            <TabsTrigger value="team">Team Overview</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="leads" className="space-y-4">
          <LeadManagement />
        </TabsContent>
        
        <TabsContent value="followups" className="space-y-4">
          <FollowUpManager />
        </TabsContent>
        
        <TabsContent value="dashboard" className="space-y-4">
          <DashboardFollowUps />
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-4">
          <PersonalAnalytics />
        </TabsContent>

        <TabsContent value="ai-assistant" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AIAssistant className="lg:col-span-2" />
          </div>
        </TabsContent>

        {canManageTeam && (
          <TabsContent value="team" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Sales Team Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">BDO Team</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Business Development Officers under your management
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-green-600" />
                        <span className="font-medium">FBDO Team</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Field Business Development Officers
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                        <span className="font-medium">Performance</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Team performance metrics and targets
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </DashboardLayout>
  );
}
