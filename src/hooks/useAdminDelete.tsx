import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DeleteConfirmationDialog } from '@/components/common/DeleteConfirmationDialog';

interface UseAdminDeleteProps {
  onSuccess?: () => void;
}

interface DeleteConfig {
  table: string;
  id: string;
  itemName: string;
  title?: string;
  description?: string;
  dependentRecords?: string[];
}

export function useAdminDelete({ onSuccess }: UseAdminDeleteProps = {}) {
  const { profile } = useAuth();
  const { isAdmin } = useRoleAccess();
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfig, setDeleteConfig] = useState<DeleteConfig | null>(null);

  const canDelete = isAdmin();

  const initiateDelete = (config: DeleteConfig) => {
    if (!canDelete) {
      toast({
        title: "Access Denied",
        description: "Only administrators can delete records",
        variant: "destructive",
      });
      return;
    }

    setDeleteConfig(config);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteConfig || !canDelete) return;

    try {
      setIsDeleting(true);

      const { error } = await supabase
        .from(deleteConfig.table as any)
        .delete()
        .eq('id', deleteConfig.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${deleteConfig.itemName} deleted successfully`,
      });

      setIsDeleteDialogOpen(false);
      setDeleteConfig(null);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error deleting record:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete record",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const DeleteDialog = () => {
    if (!deleteConfig) return null;

    return (
      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDelete}
        title={deleteConfig.title || `Delete ${deleteConfig.itemName}`}
        description={deleteConfig.description || `Are you sure you want to delete "${deleteConfig.itemName}"? This action cannot be undone.`}
        itemName={deleteConfig.itemName}
        dependentRecords={deleteConfig.dependentRecords}
        isLoading={isDeleting}
      />
    );
  };

  return {
    canDelete,
    initiateDelete,
    DeleteDialog,
    isDeleting
  };
}