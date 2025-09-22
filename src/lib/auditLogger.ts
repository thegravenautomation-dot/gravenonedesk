// Audit logging utilities for tracking edit/delete operations

import { supabase } from '@/integrations/supabase/client';

interface AuditLogEntry {
  user_id: string;
  branch_id: string;
  action: 'create' | 'edit' | 'delete' | 'view';
  entity_type: 'quotation' | 'customer' | 'invoice' | 'proforma_invoice' | 'purchase_order';
  entity_id: string;
  changes?: Record<string, { old: any; new: any }>;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Log an audit entry to the database
 */
export async function logAuditEntry(entry: AuditLogEntry): Promise<void> {
  try {
    // Store audit log in a dedicated table
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: entry.user_id,
        branch_id: entry.branch_id,
        action: entry.action,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        changes: entry.changes || null,
        metadata: entry.metadata || null,
        ip_address: entry.ip_address || null,
        user_agent: entry.user_agent || navigator.userAgent,
        timestamp: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to log audit entry:', error);
    }
  } catch (error) {
    console.error('Error logging audit entry:', error);
  }
}

/**
 * Create changes object for audit logging
 */
export function createChangesObject(
  oldData: Record<string, any>,
  newData: Record<string, any>
): Record<string, { old: any; new: any }> {
  const changes: Record<string, { old: any; new: any }> = {};

  // Get all unique keys from both objects
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

  allKeys.forEach(key => {
    const oldValue = oldData[key];
    const newValue = newData[key];

    // Only log if values are different
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes[key] = {
        old: oldValue,
        new: newValue
      };
    }
  });

  return changes;
}

/**
 * Log edit operation
 */
export async function logEdit(
  userId: string,
  branchId: string,
  entityType: AuditLogEntry['entity_type'],
  entityId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>,
  metadata?: Record<string, any>
): Promise<void> {
  const changes = createChangesObject(oldData, newData);
  
  await logAuditEntry({
    user_id: userId,
    branch_id: branchId,
    action: 'edit',
    entity_type: entityType,
    entity_id: entityId,
    changes,
    metadata
  });
}

/**
 * Log delete operation
 */
export async function logDelete(
  userId: string,
  branchId: string,
  entityType: AuditLogEntry['entity_type'],
  entityId: string,
  deletedData: Record<string, any>,
  metadata?: Record<string, any>
): Promise<void> {
  await logAuditEntry({
    user_id: userId,
    branch_id: branchId,
    action: 'delete',
    entity_type: entityType,
    entity_id: entityId,
    changes: { deleted_record: { old: deletedData, new: null } },
    metadata
  });
}

/**
 * Get audit history for an entity
 */
export async function getAuditHistory(
  entityType: AuditLogEntry['entity_type'],
  entityId: string
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        profiles:user_id (full_name, email)
      `)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching audit history:', error);
    return [];
  }
}