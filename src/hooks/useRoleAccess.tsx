import { useAuth } from "@/contexts/AuthContext";

type UserRole = 'admin' | 'manager' | 'executive' | 'accountant' | 'hr' | 'procurement' | 'dispatch';

export function useRoleAccess() {
  const { profile } = useAuth();

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!profile?.role) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(profile.role as UserRole);
  };

  const canAccessSales = (): boolean => {
    return hasRole(['admin', 'manager', 'executive']);
  };

  const canAccessAccounts = (): boolean => {
    return hasRole(['admin', 'manager', 'accountant']);
  };

  const canAccessDispatch = (): boolean => {
    return hasRole(['admin', 'manager', 'dispatch']);
  };

  const canRecordPayments = (): boolean => {
    return hasRole(['admin', 'manager', 'executive', 'accountant']);
  };

  const canUploadPurchaseOrder = (): boolean => {
    return hasRole(['admin', 'manager', 'executive']);
  };

  const canViewLedger = (): boolean => {
    return hasRole(['admin', 'manager', 'accountant']);
  };

  const canViewFinancialSummary = (): boolean => {
    return hasRole(['admin', 'manager', 'accountant']);
  };

  const canSeeReadyForShipping = (): boolean => {
    return hasRole(['admin', 'manager', 'dispatch']);
  };

  const isAdmin = (): boolean => {
    return hasRole('admin');
  };

  const isManager = (): boolean => {
    return hasRole(['admin', 'manager']);
  };

  return {
    role: profile?.role as UserRole,
    hasRole,
    canAccessSales,
    canAccessAccounts,
    canAccessDispatch,
    canRecordPayments,
    canUploadPurchaseOrder,
    canViewLedger,
    canViewFinancialSummary,
    canSeeReadyForShipping,
    isAdmin,
    isManager
  };
}