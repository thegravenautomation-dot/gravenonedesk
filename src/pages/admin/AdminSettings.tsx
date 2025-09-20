import { DashboardLayout } from "@/components/DashboardLayout";
import { SystemSettings } from "@/components/SystemSettings";

export default function AdminSettings() {
  return (
    <DashboardLayout 
      title="System Settings"
      subtitle="Configure API keys, integrations, and system preferences"
    >
      <SystemSettings />
    </DashboardLayout>
  );
}