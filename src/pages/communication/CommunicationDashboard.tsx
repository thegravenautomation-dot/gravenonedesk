import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CommunicationPanel } from "@/components/communication/CommunicationPanel";
import { CommunicationStatusMonitor } from "@/components/CommunicationStatusMonitor";
import { CommunicationTemplateManager } from "@/components/communication/CommunicationTemplateManager";
import { MessageSquare, Mail, Send, Users, Settings, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp_number?: string;
}

export function CommunicationDashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isQuickSendOpen, setIsQuickSendOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Quick send form
  const [quickForm, setQuickForm] = useState({
    type: 'whatsapp' as 'whatsapp' | 'email',
    recipient: '',
    subject: '',
    message: ''
  });

  useEffect(() => {
    fetchCustomers();
    setupRealtimeSubscription();
  }, [profile?.branch_id]);

  const fetchCustomers = async () => {
    if (!profile?.branch_id) return;

    const { data, error } = await supabase
      .from('customers')
      .select('id, name, email, phone, whatsapp_number')
      .eq('branch_id', profile.branch_id)
      .order('name');

    if (error) {
      console.error('Error fetching customers:', error);
    } else {
      setCustomers(data || []);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!profile?.branch_id) return;

    const channel = supabase
      .channel('communication-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'communications',
        filter: `branch_id=eq.${profile.branch_id}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newComm = payload.new as any;
          toast({
            title: "New Communication",
            description: `${newComm.contact_type} ${newComm.status === 'sent' ? 'sent successfully' : 'failed'} to ${newComm.to_contact}`,
            variant: newComm.status === 'sent' ? 'default' : 'destructive',
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleQuickSend = async () => {
    if (!quickForm.recipient || !quickForm.message) {
      toast({
        title: "Error", 
        description: "Recipient and message are required",
        variant: "destructive"
      });
      return;
    }

    if (quickForm.type === 'email' && !quickForm.subject) {
      toast({
        title: "Error", 
        description: "Subject is required for emails",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const endpoint = quickForm.type === 'whatsapp' ? 'send-whatsapp' : 'send-communication-email';
      const payload = quickForm.type === 'whatsapp' 
        ? {
            to: quickForm.recipient,
            message: quickForm.message
          }
        : {
            to: quickForm.recipient,
            subject: quickForm.subject,
            message: quickForm.message
          };

      const { error } = await supabase.functions.invoke(endpoint, {
        body: payload
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `${quickForm.type} message sent successfully`
      });

      setQuickForm({
        type: 'whatsapp',
        recipient: '',
        subject: '',
        message: ''
      });
      setIsQuickSendOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Failed to send message',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Communication Center</h1>
          <p className="text-muted-foreground">
            Manage WhatsApp and Email communications with real-time tracking
          </p>
        </div>
        <Dialog open={isQuickSendOpen} onOpenChange={setIsQuickSendOpen}>
          <DialogTrigger asChild>
            <Button>
              <Send className="h-4 w-4 mr-2" />
              Quick Send
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Quick Send Message</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select 
                  value={quickForm.type} 
                  onValueChange={(value: 'whatsapp' | 'email') => setQuickForm(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        WhatsApp
                      </div>
                    </SelectItem>
                    <SelectItem value="email">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {quickForm.type === 'whatsapp' ? 'Phone Number' : 'Email Address'}
                </label>
                <Input
                  value={quickForm.recipient}
                  onChange={(e) => setQuickForm(prev => ({ ...prev, recipient: e.target.value }))}
                  placeholder={quickForm.type === 'whatsapp' ? '+91XXXXXXXXXX' : 'email@example.com'}
                />
              </div>

              {quickForm.type === 'email' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subject</label>
                  <Input
                    value={quickForm.subject}
                    onChange={(e) => setQuickForm(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Email subject"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Message</label>
                <Textarea
                  value={quickForm.message}
                  onChange={(e) => setQuickForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Type your message..."
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsQuickSendOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleQuickSend} disabled={loading}>
                  <Send className="h-4 w-4 mr-2" />
                  Send {quickForm.type === 'whatsapp' ? 'WhatsApp' : 'Email'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="send" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="send" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Send Messages
          </TabsTrigger>
          <TabsTrigger value="monitor" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Monitor Status
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Customer Comm
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Select Customer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input
                    placeholder="Search customers..."
                    className="w-full"
                  />
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {customers.map((customer) => (
                      <div
                        key={customer.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedCustomer?.id === customer.id 
                            ? 'border-primary bg-primary/5' 
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          {customer.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {customer.email}
                            </div>
                          )}
                          {(customer.phone || customer.whatsapp_number) && (
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {customer.whatsapp_number || customer.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-2">
              {selectedCustomer ? (
                <CommunicationPanel
                  entityType="customer"
                  entityId={selectedCustomer.id}
                  contactEmail={selectedCustomer.email}
                  contactPhone={selectedCustomer.whatsapp_number || selectedCustomer.phone}
                  contactName={selectedCustomer.name}
                />
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center h-96">
                    <div className="text-center text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4" />
                      <p>Select a customer to start communication</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="monitor">
          <CommunicationStatusMonitor />
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Communication Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-sm font-medium">WhatsApp Messages</p>
                        <p className="text-2xl font-bold">245</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium">Email Messages</p>
                        <p className="text-2xl font-bold">189</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-600" />
                      <div>
                        <p className="text-sm font-medium">Active Contacts</p>
                        <p className="text-2xl font-bold">{customers.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                {customers.slice(0, 10).map((customer) => (
                  <div key={customer.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Last communication: 2 hours ago
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        5 messages
                      </Badge>
                      <Badge variant="outline">
                        <Mail className="h-3 w-3 mr-1" />
                        2 emails
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <CommunicationTemplateManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}