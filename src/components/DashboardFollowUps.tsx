import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Phone, Mail, Calendar, Clock, CheckCircle, User, Building2 } from "lucide-react";

export function DashboardFollowUps() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [todaysFollowUps, setTodaysFollowUps] = useState<any[]>([]);
  const [completingFollowUp, setCompletingFollowUp] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile?.branch_id) {
      fetchTodaysFollowUps();
    }
  }, [profile?.branch_id]);

  const fetchTodaysFollowUps = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('follow_ups')
        .select(`
          *,
          customers (name, company, phone),
          leads (title, lead_no),
          profiles!follow_ups_assigned_to_fkey (full_name)
        `)
        .eq('branch_id', profile?.branch_id)
        .eq('follow_up_date', today)
        .eq('status', 'scheduled')
        .order('follow_up_time', { ascending: true });

      if (error) throw error;
      setTodaysFollowUps(data || []);
    } catch (error) {
      console.error('Error fetching today\'s follow-ups:', error);
    }
  };

  const handleCompleteFollowUp = async () => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('follow_ups')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          notes: notes
        })
        .eq('id', completingFollowUp.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Follow-up completed successfully",
      });

      setCompletingFollowUp(null);
      setNotes("");
      fetchTodaysFollowUps();
    } catch (error) {
      console.error('Error completing follow-up:', error);
      toast({
        title: "Error",
        description: "Failed to complete follow-up",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'meeting': return <Calendar className="h-4 w-4" />;
      case 'visit': return <Calendar className="h-4 w-4" />;
      default: return <Phone className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'secondary';
      case 'low': return 'outline';
      default: return 'default';
    }
  };

  const getMyFollowUps = () => {
    return todaysFollowUps.filter(f => f.assigned_to === profile?.id);
  };

  const getTeamFollowUps = () => {
    return todaysFollowUps.filter(f => f.assigned_to !== profile?.id);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* My Follow-ups */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>My Follow-ups Today</span>
            </CardTitle>
            <CardDescription>
              Your scheduled follow-ups for today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getMyFollowUps().length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No follow-ups scheduled for today
                </p>
              ) : (
                getMyFollowUps().map((followUp) => (
                  <div key={followUp.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          {getTypeIcon(followUp.type)}
                          <span className="font-medium">{followUp.title}</span>
                          <Badge variant={getPriorityColor(followUp.priority)} className="text-xs">
                            {followUp.priority}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Building2 className="h-3 w-3" />
                            <span>{followUp.customers?.name}</span>
                            {followUp.customers?.company && (
                              <span>({followUp.customers.company})</span>
                            )}
                          </div>
                          {followUp.customers?.phone && (
                            <div className="flex items-center space-x-1 mt-1">
                              <Phone className="h-3 w-3" />
                              <span>{followUp.customers.phone}</span>
                            </div>
                          )}
                        </div>
                        {followUp.follow_up_time && (
                          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{followUp.follow_up_time}</span>
                          </div>
                        )}
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCompletingFollowUp(followUp);
                              setNotes("");
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Complete
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Complete Follow-up</DialogTitle>
                            <DialogDescription>
                              Record what happened during your interaction with {followUp.customers?.name}
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium">{followUp.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                {followUp.description}
                              </p>
                            </div>
                            
                            <div>
                              <Label htmlFor="notes">What did the customer say?</Label>
                              <Textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Record the conversation details, customer feedback, next steps, etc."
                                rows={4}
                              />
                            </div>
                          </div>

                          <div className="flex justify-end space-x-2 mt-6">
                            <Button variant="outline" onClick={() => setCompletingFollowUp(null)}>
                              Cancel
                            </Button>
                            <Button onClick={handleCompleteFollowUp} disabled={loading}>
                              {loading ? 'Saving...' : 'Complete Follow-up'}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    {followUp.description && (
                      <p className="text-sm text-muted-foreground">
                        {followUp.description}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Team Follow-ups */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>Team Follow-ups Today</span>
            </CardTitle>
            <CardDescription>
              Follow-ups assigned to your team members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getTeamFollowUps().length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No team follow-ups scheduled for today
                </p>
              ) : (
                getTeamFollowUps().map((followUp) => (
                  <div key={followUp.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          {getTypeIcon(followUp.type)}
                          <span className="font-medium">{followUp.title}</span>
                          <Badge variant={getPriorityColor(followUp.priority)} className="text-xs">
                            {followUp.priority}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Building2 className="h-3 w-3" />
                            <span>{followUp.customers?.name}</span>
                            {followUp.customers?.company && (
                              <span>({followUp.customers.company})</span>
                            )}
                          </div>
                          <div className="flex items-center space-x-1 mt-1">
                            <User className="h-3 w-3" />
                            <span>Assigned to: {followUp.profiles?.full_name}</span>
                          </div>
                        </div>
                        {followUp.follow_up_time && (
                          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{followUp.follow_up_time}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {followUp.description && (
                      <p className="text-sm text-muted-foreground">
                        {followUp.description}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Follow-up Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {todaysFollowUps.length}
              </div>
              <div className="text-sm text-muted-foreground">Total Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {getMyFollowUps().length}
              </div>
              <div className="text-sm text-muted-foreground">Mine</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {todaysFollowUps.filter(f => f.priority === 'urgent' || f.priority === 'high').length}
              </div>
              <div className="text-sm text-muted-foreground">High Priority</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {todaysFollowUps.filter(f => f.type === 'call').length}
              </div>
              <div className="text-sm text-muted-foreground">Calls</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}