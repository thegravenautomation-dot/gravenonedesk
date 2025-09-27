import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Lead {
  id: string;
  lead_no: string;
  title: string;
  assigned_to?: string;
}

interface Employee {
  id: string;
  full_name: string;
  role: string;
  department: string;
}

interface AssignLeadDialogProps {
  lead: Lead | null;
  employees: Employee[];
  isOpen: boolean;
  onClose: () => void;
  onLeadAssigned: () => void;
}

export function AssignLeadDialog({ 
  lead, 
  employees, 
  isOpen, 
  onClose, 
  onLeadAssigned 
}: AssignLeadDialogProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);

  const handleAssign = async () => {
    if (!lead || !selectedEmployee) return;

    setIsAssigning(true);
    try {
      // Use the enhanced lead assignment edge function
      const { data, error } = await supabase.functions.invoke('lead-assignment', {
        body: { 
          leadId: lead.id, 
          branchId: profile?.branch_id,
          forceReassign: true
        }
      });

      if (error) {
        throw error;
      }

      // Also update the lead directly if the edge function doesn't handle it
      const { error: updateError } = await supabase
        .from('leads')
        .update({ 
          assigned_to: selectedEmployee,
          assignment_rule: 'manual_assignment',
          assigned_at: new Date().toISOString()
        })
        .eq('id', lead.id);

      if (updateError) {
        throw updateError;
      }

      const assignedEmployee = employees.find(emp => emp.id === selectedEmployee);
      
      toast({
        title: "Lead Assigned",
        description: `Lead "${lead.title}" has been assigned to ${assignedEmployee?.full_name}`,
      });

      onLeadAssigned();
      onClose();
      setSelectedEmployee("");
    } catch (error: any) {
      console.error('Error assigning lead:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign lead",
        variant: "destructive",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleClose = () => {
    setSelectedEmployee("");
    onClose();
  };

  if (!lead) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Lead</DialogTitle>
          <DialogDescription>
            Assign lead "{lead.title}" ({lead.lead_no}) to an employee.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="employee">Select Employee</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{employee.full_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {employee.role} - {employee.department}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {lead.assigned_to && (
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
              <strong>Note:</strong> This lead is currently assigned. Proceeding will reassign it to the selected employee.
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={!selectedEmployee || isAssigning}
          >
            {isAssigning ? "Assigning..." : "Assign Lead"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}