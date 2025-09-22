// Role-based permission utilities for Edit & Delete operations

import { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['user_role'];

interface PermissionCheck {
  canEdit: boolean;
  canDelete: boolean;
  reason?: string;
}

/**
 * Check permissions based on user role and module
 */
export function checkPermissions(
  userRole: UserRole,
  module: 'quotation' | 'customer' | 'invoice' | 'proforma_invoice' | 'purchase_order',
  isOwner: boolean = false
): PermissionCheck {
  // Admin can edit/delete everything
  if (userRole === 'admin') {
    return { canEdit: true, canDelete: true };
  }

  // Sales roles can edit/delete Quotation & Customer
  if ((userRole === 'sales_manager' || userRole === 'bdo' || userRole === 'executive') && 
      (module === 'quotation' || module === 'customer')) {
    return { canEdit: true, canDelete: true };
  }

  // Accounts role can edit/delete Invoice & Purchase Order
  if (userRole === 'accountant' && 
      (module === 'invoice' || module === 'proforma_invoice' || module === 'purchase_order')) {
    return { canEdit: true, canDelete: true };
  }

  // Manager can edit/delete in their branch
  if (userRole === 'manager') {
    return { canEdit: true, canDelete: true };
  }

  // Users can edit their own records (limited)
  if (isOwner) {
    return { 
      canEdit: true, 
      canDelete: false, 
      reason: 'You can only edit your own records, not delete them' 
    };
  }

  return { 
    canEdit: false, 
    canDelete: false, 
    reason: 'Insufficient permissions for this operation' 
  };
}

/**
 * Check if document can be edited based on status
 */
export function canEditDocument(
  status: string,
  documentType: 'quotation' | 'invoice' | 'purchase_order' | 'order'
): { canEdit: boolean; reason?: string } {
  const finalizedStatuses = {
    quotation: ['accepted', 'rejected', 'expired'],
    invoice: ['paid', 'cancelled'],
    purchase_order: ['completed', 'cancelled'],
    order: ['completed', 'cancelled', 'shipped']
  };

  const finalized = finalizedStatuses[documentType]?.includes(status.toLowerCase());
  
  if (finalized) {
    return {
      canEdit: false,
      reason: `Cannot edit ${documentType} with status: ${status}`
    };
  }

  return { canEdit: true };
}

/**
 * Check if document can be deleted based on dependencies
 */
export async function checkDependencies(
  id: string,
  documentType: 'quotation' | 'customer' | 'invoice' | 'purchase_order'
): Promise<{ canDelete: boolean; reason?: string; dependentRecords?: string[] }> {
  // This would normally check the database for dependent records
  // For now, returning a basic implementation
  // In a real implementation, you'd query Supabase to check for dependencies
  
  const dependencies: { [key: string]: string[] } = {
    quotation: ['orders', 'invoices'],
    customer: ['leads', 'quotations', 'orders', 'invoices', 'payments'],
    invoice: ['payments'],
    purchase_order: ['receipts', 'payments']
  };

  // This is a placeholder - in real implementation, you'd check actual database records
  return {
    canDelete: true,
    dependentRecords: []
  };
}

/**
 * Get action buttons based on permissions
 */
export function getActionButtons(
  userRole: UserRole,
  module: 'quotation' | 'customer' | 'invoice' | 'proforma_invoice' | 'purchase_order',
  status?: string,
  isOwner: boolean = false
) {
  const permissions = checkPermissions(userRole, module, isOwner);
  const documentEditCheck = status ? canEditDocument(status, module as any) : { canEdit: true };

  return {
    showEdit: permissions.canEdit && documentEditCheck.canEdit,
    showDelete: permissions.canDelete,
    editDisabledReason: !permissions.canEdit ? permissions.reason : !documentEditCheck.canEdit ? documentEditCheck.reason : undefined,
    deleteDisabledReason: !permissions.canDelete ? permissions.reason : undefined
  };
}