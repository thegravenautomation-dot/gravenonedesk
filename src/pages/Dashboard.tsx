import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

// Dashboard components for each role
import AdminDashboard from "./admin/AdminDashboard";
import SalesDashboard from "./sales/SalesDashboard";
import AccountsDashboard from "./accounts/AccountsDashboard";
import HRDashboard from "./hr/HRDashboard";
import ProcurementDashboard from "./procurement/ProcurementDashboard";
import DispatchDashboard from "./dispatch/DispatchDashboard";
import EmployeePortal from "./employee/EmployeePortal";

export default function Dashboard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Determine role from profile or user metadata
  const role = (profile?.role as string) || (user?.user_metadata?.role as string);
  if (!user) {
    return null;
  }
  if (!role) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Setting up your profile… please try again in a moment or contact admin.</p>
        </div>
      </div>
    );
  }

  // Route to appropriate dashboard based on role
  switch (role) {
    case 'admin':
      return <AdminDashboard />;
    case 'manager':
      return <AdminDashboard />; // Managers get admin view with some restrictions
    case 'sales_manager':
      return <SalesDashboard />; // Sales managers get sales dashboard
    case 'executive':
    case 'bdo':
    case 'fbdo':
      return <SalesDashboard />;
    case 'accountant':
      return <AccountsDashboard />;
    case 'hr':
      return <HRDashboard />;
    case 'procurement':
      return <ProcurementDashboard />;
    case 'dispatch':
      return <DispatchDashboard />;
    default:
      return <EmployeePortal />;
  }
}