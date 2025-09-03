import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import SalesDashboard from "./pages/sales/SalesDashboard";
import AccountsDashboard from "./pages/accounts/AccountsDashboard";
import HRDashboard from "./pages/hr/HRDashboard";
import ProcurementDashboard from "./pages/procurement/ProcurementDashboard";
import DispatchDashboard from "./pages/dispatch/DispatchDashboard";
import AnalyticsDashboard from "./pages/analytics/AnalyticsDashboard";
import EmployeePortal from "./pages/employee/EmployeePortal";
import NotFound from "./pages/NotFound";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const isDemo = typeof window !== 'undefined' && (
    (window as any).__ENV?.DEMO_MODE === '1' ||
    (window as any).ENV?.DEMO_MODE === '1' ||
    localStorage.getItem('DEMO_MODE') === '1'
  );
  
  if (loading && !isDemo) return <div>Loading...</div>;
  if (!user && !isDemo) return <Navigate to="/login" />;
  
  return <>{children}</>;
}

const queryClient = new QueryClient();

function AllowedRoute({ roles, children }: { roles: Array<'admin'|'manager'|'executive'|'accountant'|'hr'|'procurement'|'dispatch'>; children: React.ReactNode }) {
  const { profile } = useAuth();
  const isDemo = typeof window !== 'undefined' && (
    (window as any).__ENV?.DEMO_MODE === '1' ||
    (window as any).ENV?.DEMO_MODE === '1' ||
    localStorage.getItem('DEMO_MODE') === '1'
  );
  const role = profile?.role || (isDemo ? 'admin' : undefined);
  if (!role || !roles.includes(role)) return <Navigate to="/login" />;
  return <>{children}</>;
}

function RoleRedirect() {
  const { profile } = useAuth();
  const isDemo = typeof window !== 'undefined' && (
    (window as any).__ENV?.DEMO_MODE === '1' ||
    (window as any).ENV?.DEMO_MODE === '1' ||
    localStorage.getItem('DEMO_MODE') === '1'
  );
  const role = profile?.role || (isDemo ? 'admin' : undefined);

  const roleToPath: Record<string, string> = {
    admin: '/',
    manager: '/',
    executive: '/sales',
    accountant: '/accounts',
    hr: '/hr',
    procurement: '/procurement',
    dispatch: '/dispatch',
  };

  const target = role ? (roleToPath[role] || '/employee') : '/login';
  return <Navigate to={target} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<ProtectedRoute><RoleRedirect /></ProtectedRoute>} />
            <Route path="/" element={<ProtectedRoute><AllowedRoute roles={['admin','manager']}><Index /></AllowedRoute></ProtectedRoute>} />
            <Route path="/sales" element={<ProtectedRoute><AllowedRoute roles={['admin','manager','executive']}><SalesDashboard /></AllowedRoute></ProtectedRoute>} />
            <Route path="/accounts" element={<ProtectedRoute><AllowedRoute roles={['admin','accountant','manager']}><AccountsDashboard /></AllowedRoute></ProtectedRoute>} />
            <Route path="/hr" element={<ProtectedRoute><AllowedRoute roles={['admin','hr','manager']}><HRDashboard /></AllowedRoute></ProtectedRoute>} />
            <Route path="/procurement" element={<ProtectedRoute><AllowedRoute roles={['admin','procurement','manager']}><ProcurementDashboard /></AllowedRoute></ProtectedRoute>} />
            <Route path="/dispatch" element={<ProtectedRoute><AllowedRoute roles={['admin','dispatch','manager']}><DispatchDashboard /></AllowedRoute></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><AllowedRoute roles={['admin','manager']}><AnalyticsDashboard /></AllowedRoute></ProtectedRoute>} />
            <Route path="/employee" element={<ProtectedRoute><AllowedRoute roles={['admin','manager','executive','accountant','hr','procurement','dispatch']}><EmployeePortal /></AllowedRoute></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;