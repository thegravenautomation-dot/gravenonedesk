import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Pages
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/NotFound";

// Dashboard Pages
import AdminDashboard from "@/pages/admin/AdminDashboard";
import SalesDashboard from "@/pages/sales/SalesDashboard";
import AccountsDashboard from "@/pages/accounts/AccountsDashboard";
import HRDashboard from "@/pages/hr/HRDashboard";
import ProcurementDashboard from "@/pages/procurement/ProcurementDashboard";
import DispatchDashboard from "@/pages/dispatch/DispatchDashboard";
import EmployeePortal from "@/pages/employee/EmployeePortal";

import { useAuth } from "@/contexts/AuthContext";

// Create a query client
const queryClient = new QueryClient();

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

// Role-based Route Component
function RoleRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile || !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <BrowserRouter>
            <div className="min-h-screen bg-background">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />

                {/* Protected Routes */}
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />

                {/* Role-specific Dashboard Routes */}
                <Route 
                  path="/admin" 
                  element={
                    <ProtectedRoute>
                      <RoleRoute allowedRoles={['admin', 'manager']}>
                        <AdminDashboard />
                      </RoleRoute>
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/sales" 
                  element={
                    <ProtectedRoute>
                      <RoleRoute allowedRoles={['admin', 'manager', 'executive']}>
                        <SalesDashboard />
                      </RoleRoute>
                    </ProtectedRoute>
                  } 
                />

                <Route 
                  path="/accounts" 
                  element={
                    <ProtectedRoute>
                      <RoleRoute allowedRoles={['admin', 'manager', 'accountant']}>
                        <AccountsDashboard />
                      </RoleRoute>
                    </ProtectedRoute>
                  } 
                />

                <Route 
                  path="/hr" 
                  element={
                    <ProtectedRoute>
                      <RoleRoute allowedRoles={['admin', 'manager', 'hr']}>
                        <HRDashboard />
                      </RoleRoute>
                    </ProtectedRoute>
                  } 
                />

                <Route 
                  path="/procurement" 
                  element={
                    <ProtectedRoute>
                      <RoleRoute allowedRoles={['admin', 'manager', 'procurement']}>
                        <ProcurementDashboard />
                      </RoleRoute>
                    </ProtectedRoute>
                  } 
                />

                <Route 
                  path="/dispatch" 
                  element={
                    <ProtectedRoute>
                      <RoleRoute allowedRoles={['admin', 'manager', 'dispatch']}>
                        <DispatchDashboard />
                      </RoleRoute>
                    </ProtectedRoute>
                  } 
                />

                <Route 
                  path="/employee" 
                  element={
                    <ProtectedRoute>
                      <EmployeePortal />
                    </ProtectedRoute>
                  } 
                />

                {/* Catch-all route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Toaster />
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;