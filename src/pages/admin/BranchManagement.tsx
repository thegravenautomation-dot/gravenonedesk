import { DashboardLayout } from "@/components/DashboardLayout";
import { BranchSettings } from "@/components/BranchSettings";

export default function BranchManagement() {
  return (
    <DashboardLayout 
      title="Branch Management"
      subtitle="Manage company branches, locations, and configurations"
    >
      <BranchSettings />
    </DashboardLayout>
  );
}