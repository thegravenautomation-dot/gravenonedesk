import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, MessageSquare, Mail, Phone, AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Communication {
  id: string;
  contact_type: string;
  direction: string;
  from_contact: string;
  to_contact: string;
  subject?: string;
  message: string;
  status: string;
  created_at: string;
  metadata?: any;
  related_entity_type?: string;
  related_entity_id?: string;
}

export function CommunicationStatusMonitor() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    failed: 0,
    pending: 0
  });

  useEffect(() => {
    if (profile?.branch_id) {
      fetchCommunications();
      setupRealtimeSubscription();
    }
  }, [profile?.branch_id]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('communications-monitor')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'communications',
        filter: `branch_id=eq.${profile?.branch_id}`
      }, (payload) => {
        console.log('Communication status update:', payload);
        
        if (payload.eventType === 'INSERT') {
          const newCommunication = payload.new as Communication;
          setCommunications(prev => [newCommunication, ...prev.slice(0, 49)]); // Keep latest 50
          
          if (newCommunication.status === 'failed') {
            toast({
              title: "Communication Failed",
              description: `${newCommunication.contact_type} to ${newCommunication.to_contact} failed`,
              variant: "destructive",
            });
          }
        }
        
        // Refresh stats
        calculateStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchCommunications = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('communications')
        .select('*')
        .eq('branch_id', profile?.branch_id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setCommunications(data || []);
      calculateStats(data || []);
      
    } catch (error) {
      console.error('Error fetching communications:', error);
      toast({
        title: "Error",
        description: "Failed to fetch communication logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data?: Communication[]) => {
    const comms = data || communications;
    setStats({
      total: comms.length,
      sent: comms.filter(c => c.status === 'sent').length,
      failed: comms.filter(c => c.status === 'failed').length,
      pending: comms.filter(c => c.status === 'pending').length
    });
  };

  const retryFailedCommunication = async (communication: Communication) => {
    try {
      const endpoint = communication.contact_type === 'whatsapp' 
        ? 'send-whatsapp' 
        : 'send-communication-email';
      
      const payload = communication.contact_type === 'whatsapp' 
        ? {
            to: communication.to_contact,
            message: communication.message,
            relatedEntityType: communication.related_entity_type,
            relatedEntityId: communication.related_entity_id
          }
        : {
            to: communication.to_contact,
            subject: communication.subject || '',
            message: communication.message,
            relatedEntityType: communication.related_entity_type,
            relatedEntityId: communication.related_entity_id
          };

      const { data, error } = await supabase.functions.invoke(endpoint, {
        body: payload
      });

      if (error) throw error;

      toast({
        title: "Retry Successful",
        description: `${communication.contact_type} message sent successfully`,
      });

      fetchCommunications(); // Refresh the list

    } catch (error: any) {
      toast({
        title: "Retry Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getContactIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'whatsapp':
        return <Phone className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'sent':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Communication Monitor</h2>
          <p className="text-muted-foreground">
            Track WhatsApp and email communication status with retry capabilities
          </p>
        </div>
        <Button onClick={fetchCommunications} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Sent</p>
                <p className="text-2xl font-bold">{stats.sent}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm font-medium">Failed</p>
                <p className="text-2xl font-bold">{stats.failed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-sm font-medium">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Communications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Communications</CardTitle>
          <CardDescription>
            Latest 50 communication attempts with status and retry options
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Subject/Preview</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {communications.map((communication) => (
                <TableRow key={communication.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getContactIcon(communication.contact_type)}
                      <span className="capitalize">{communication.contact_type}</span>
                    </div>
                  </TableCell>
                  <TableCell>{communication.to_contact}</TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <div className="font-medium truncate">
                        {communication.subject || communication.message.substring(0, 30)}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {communication.contact_type === 'email' 
                          ? communication.message.substring(0, 50)
                          : communication.message.substring(0, 50)
                        }...
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(communication.status)}
                      <Badge variant={getStatusBadgeVariant(communication.status)}>
                        {communication.status}
                      </Badge>
                    </div>
                    {communication.status === 'failed' && communication.metadata?.error_message && (
                      <div className="text-xs text-red-600 mt-1 truncate max-w-xs">
                        {communication.metadata.error_message}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDistanceToNow(new Date(communication.created_at), { addSuffix: true })}
                    </div>
                  </TableCell>
                  <TableCell>
                    {communication.status === 'failed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => retryFailedCommunication(communication)}
                        className="text-xs"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Retry
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}