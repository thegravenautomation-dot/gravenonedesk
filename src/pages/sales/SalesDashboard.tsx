import { DashboardLayout } from '@/components/DashboardLayout';
import { LeadManagement } from '@/components/LeadManagement';
import { FollowUpManager } from '@/components/FollowUpManager';
import { DashboardFollowUps } from '@/components/DashboardFollowUps';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SalesDashboard() {
  return (
    <DashboardLayout title="Sales & Leads" subtitle="Manage leads, sync portals, and pipeline">
      <Tabs defaultValue="leads" className="space-y-4">
        <TabsList>
          <TabsTrigger value="leads">Lead Management</TabsTrigger>
          <TabsTrigger value="followups">Follow-ups</TabsTrigger>
          <TabsTrigger value="dashboard">Today's Follow-ups</TabsTrigger>
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
      </Tabs>
    </DashboardLayout>
  );
}
