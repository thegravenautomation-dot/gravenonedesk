import React from 'react';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Edit, Trash2, Eye } from "lucide-react";

interface ActionButtonsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  showEdit?: boolean;
  showDelete?: boolean;
  showView?: boolean;
  editDisabled?: boolean;
  deleteDisabled?: boolean;
  viewDisabled?: boolean;
  editDisabledReason?: string;
  deleteDisabledReason?: string;
  viewDisabledReason?: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "ghost";
  isLoading?: boolean;
}

export function ActionButtons({
  onEdit,
  onDelete,
  onView,
  showEdit = true,
  showDelete = true,
  showView = true,
  editDisabled = false,
  deleteDisabled = false,
  viewDisabled = false,
  editDisabledReason,
  deleteDisabledReason,
  viewDisabledReason,
  size = "sm",
  variant = "outline",
  isLoading = false
}: ActionButtonsProps) {
  const TooltipWrapper = ({ children, content, disabled }: { 
    children: React.ReactNode; 
    content?: string; 
    disabled: boolean 
  }) => {
    if (!content || !disabled) {
      return <>{children}</>;
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {children}
          </TooltipTrigger>
          <TooltipContent>
            <p>{content}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className="flex items-center gap-1">
      {showView && onView && (
        <TooltipWrapper content={viewDisabledReason} disabled={viewDisabled}>
          <Button
            variant={variant}
            size={size}
            onClick={onView}
            disabled={viewDisabled || isLoading}
            className="h-8 w-8 p-0"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </TooltipWrapper>
      )}

      {showEdit && onEdit && (
        <TooltipWrapper content={editDisabledReason} disabled={editDisabled}>
          <Button
            variant={variant}
            size={size}
            onClick={onEdit}
            disabled={editDisabled || isLoading}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
          </Button>
        </TooltipWrapper>
      )}

      {showDelete && onDelete && (
        <TooltipWrapper content={deleteDisabledReason} disabled={deleteDisabled}>
          <Button
            variant={variant}
            size={size}
            onClick={onDelete}
            disabled={deleteDisabled || isLoading}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </TooltipWrapper>
      )}
    </div>
  );
}