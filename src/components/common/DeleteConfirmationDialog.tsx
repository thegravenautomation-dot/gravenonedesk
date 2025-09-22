import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, AlertTriangle } from "lucide-react";

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  itemName?: string;
  dependentRecords?: string[];
  isLoading?: boolean;
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  itemName,
  dependentRecords = [],
  isLoading = false
}: DeleteConfirmationDialogProps) {
  const hasDependencies = dependentRecords.length > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>{description}</p>
            
            {itemName && (
              <div className="bg-muted p-3 rounded-md">
                <p className="font-medium">Item to be deleted:</p>
                <p className="text-sm">{itemName}</p>
              </div>
            )}

            {hasDependencies && (
              <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <p className="font-medium text-destructive">Warning: Dependent Records Found</p>
                </div>
                <p className="text-sm text-destructive/80 mb-2">
                  Deleting this record will also affect the following related records:
                </p>
                <ul className="list-disc list-inside text-sm text-destructive/80">
                  {dependentRecords.map((record, index) => (
                    <li key={index}>{record}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-destructive/5 border border-destructive/20 p-3 rounded-md">
              <p className="text-sm font-medium text-destructive">⚠️ This action cannot be undone</p>
              <p className="text-xs text-destructive/80 mt-1">
                The record will be permanently deleted from the system.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}