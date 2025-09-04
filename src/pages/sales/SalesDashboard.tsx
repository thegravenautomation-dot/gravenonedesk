import { DashboardLayout } from '@/components/DashboardLayout';
import { LeadManagement } from '@/components/LeadManagement';

export default function SalesDashboard() {
  return (
    <DashboardLayout title="Sales & Leads" subtitle="Manage leads, sync portals, and pipeline">
      <LeadManagement />
    </DashboardLayout>
  );
}
