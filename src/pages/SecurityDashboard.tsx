import { DashboardLayout } from "@/components/DashboardLayout";
import { SecurityAuditDashboard } from "@/components/SecurityAuditDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

export default function SecurityDashboard() {
  const { profile } = useAuth();

  // Only HR and Admin can access security dashboard
  if (profile?.role !== 'hr' && profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout 
      title="Security Dashboard"
      subtitle="Monitor employee data access and security compliance"
    >
      <SecurityAuditDashboard />
    </DashboardLayout>
  );
}