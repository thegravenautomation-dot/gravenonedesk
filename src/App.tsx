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
import NotFound from "./pages/NotFound";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  return <>{children}</>;
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/dashboard" element={<Navigate to="/" />} />
            <Route path="/sales" element={<ProtectedRoute><SalesDashboard /></ProtectedRoute>} />
            <Route path="/accounts" element={<ProtectedRoute><AccountsDashboard /></ProtectedRoute>} />
            <Route path="/hr" element={<ProtectedRoute><HRDashboard /></ProtectedRoute>} />
            <Route path="/procurement" element={<ProtectedRoute><ProcurementDashboard /></ProtectedRoute>} />
            <Route path="/dispatch" element={<ProtectedRoute><DispatchDashboard /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><AnalyticsDashboard /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
