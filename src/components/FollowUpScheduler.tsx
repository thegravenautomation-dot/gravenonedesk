import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "lucide-react";

interface FollowUpSchedulerProps {
  customerId: string;
  customerName: string;
  leadId?: string;
  trigger?: React.ReactNode;
  onFollowUpScheduled?: () => void;
}

interface FollowUpData {
  customer_id: string;
  lead_id?: string;
  follow_up_date: string;
  follow_up_time?: string;
  type: string;
  priority: string;
  status: string;
  title: string;
  description: string;
  assigned_to: string;
}

export function FollowUpScheduler({ 
  customerId, 
  customerName, 
  leadId, 
  trigger,
  onFollowUpScheduled 
}: FollowUpSchedulerProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  
  const [followUpData, setFollowUpData] = useState<FollowUpData>({
    customer_id: customerId,
    lead_id: leadId,
    follow_up_date: new Date().toISOString().split('T')[0],
    follow_up_time: "",
    type: "call",
    priority: "medium",
    status: "scheduled",
    title: "",
    description: "",
    assigned_to: profile?.id || "",
  });

  useEffect(() => {
    if (isOpen && profile?.branch_id) {
      fetchUsers();
    }
  }, [isOpen, profile?.branch_id]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('branch_id', profile?.branch_id)
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleScheduleFollowUp = async () => {
    try {
      if (!followUpData.title || !followUpData.assigned_to) {
        toast({
          title: "Error",
          description: "Please fill all required fields",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);

      const followUpPayload = {
        ...followUpData,
        branch_id: profile?.branch_id,
        created_by: profile?.id
      };

      const { error } = await supabase
        .from('follow_ups')
        .insert(followUpPayload);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Follow-up scheduled successfully",
      });

      setIsOpen(false);
      resetForm();
      onFollowUpScheduled?.();
    } catch (error) {
      console.error('Error scheduling follow-up:', error);
      toast({
        title: "Error",
        description: "Failed to schedule follow-up",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFollowUpData({
      customer_id: customerId,
      lead_id: leadId,
      follow_up_date: new Date().toISOString().split('T')[0],
      follow_up_time: "",
      type: "call",
      priority: "medium",
      status: "scheduled",
      title: "",
      description: "",
      assigned_to: profile?.id || "",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Follow-up
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="sticky top-0 bg-background pb-4 border-b z-10">
          <DialogTitle>Schedule Follow-up</DialogTitle>
          <DialogDescription>
            Schedule a follow-up for {customerName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={followUpData.title}
                onChange={(e) => setFollowUpData({...followUpData, title: e.target.value})}
                placeholder="Enter follow-up title"
              />
            </div>

            <div>
              <Label htmlFor="type">Type</Label>
              <Select value={followUpData.type} onValueChange={(value) => setFollowUpData({...followUpData, type: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="visit">Visit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="follow_up_date">Date *</Label>
              <Input
                id="follow_up_date"
                type="date"
                value={followUpData.follow_up_date}
                onChange={(e) => setFollowUpData({...followUpData, follow_up_date: e.target.value})}
              />
            </div>

            <div>
              <Label htmlFor="follow_up_time">Time</Label>
              <Input
                id="follow_up_time"
                type="time"
                value={followUpData.follow_up_time}
                onChange={(e) => setFollowUpData({...followUpData, follow_up_time: e.target.value})}
              />
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={followUpData.priority} onValueChange={(value) => setFollowUpData({...followUpData, priority: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="assigned_to">Assigned To *</Label>
              <Select value={followUpData.assigned_to} onValueChange={(value) => setFollowUpData({...followUpData, assigned_to: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={followUpData.description}
                onChange={(e) => setFollowUpData({...followUpData, description: e.target.value})}
                placeholder="Enter follow-up description"
                rows={4}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-6 pt-4 border-t sticky bottom-0 bg-background">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleScheduleFollowUp} disabled={loading}>
            {loading ? 'Scheduling...' : 'Schedule Follow-up'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}