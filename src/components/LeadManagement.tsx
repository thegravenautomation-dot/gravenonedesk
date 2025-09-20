import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CommunicationPanel } from "@/components/communication/CommunicationPanel";
import { LeadProfile } from "@/components/LeadProfile";
import { Target, Plus, Settings, RefreshCw, ExternalLink, User, Calendar, DollarSign, Zap, Activity, MessageSquare, Eye, Edit, UserCheck } from "lucide-react";

interface Lead {
  id: string;
  lead_no: string;
  title: string;
  description?: string;
  source?: string;
  status: string;
  value?: number;
  probability?: number;
  assigned_to?: string;
  expected_close_date?: string;
  created_at: string;
  customer_id?: string;
  lead_source_id?: string;
  external_id?: string;
  customers?: {
    name: string;
    company?: string;
    email?: string;
    phone?: string;
  };
  profiles?: {
    full_name: string;
  };
  lead_sources?: {
    name: string;
    source_type: string;
  };
}

interface LeadAssignmentRule {
  id: string;
  name: string;
  conditions: any;
  assigned_to: string;
  priority: number;
  is_active: boolean;
  profiles?: {
    full_name: string;
  };
}

interface LeadSource {
  id: string;
  name: string;
  source_type: string;
  is_active: boolean;
}

export function LeadManagement() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [assignmentRules, setAssignmentRules] = useState<LeadAssignmentRule[]>([]);
  const [leadSources, setLeadSources] = useState<LeadSource[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [isManualLeadOpen, setIsManualLeadOpen] = useState(false);
  const [isAssignmentRulesOpen, setIsAssignmentRulesOpen] = useState(false);
  const [isSyncingLeads, setIsSyncingLeads] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isLeadProfileOpen, setIsLeadProfileOpen] = useState(false);
  const [isCommunicationDialogOpen, setIsCommunicationDialogOpen] = useState(false);
  
  // Real-time sync configuration
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [syncInterval, setSyncInterval] = useState(1); // minutes
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [lastIndiaMartSync, setLastIndiaMartSync] = useState<Date | null>(null);
  const [lastTradeIndiaSync, setLastTradeIndiaSync] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'rate_limited'>('idle');
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const [syncStatuses, setSyncStatuses] = useState<any[]>([]);
  const syncStatusChannelRef = useRef<any>(null);

  const [newLead, setNewLead] = useState({
    title: "",
    description: "",
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    customer_company: "",
    value: 0,
    probability: 50,
    expected_close_date: "",
    source: "manual",
    region: "",
    city: "",
    state: "",
  });

  const [newRule, setNewRule] = useState({
    name: "",
    description: "",
    assigned_to: "",
    priority: 1,
    rule_type: "manual",
    conditions: {
      source: "any",
      value_min: 0,
      value_max: 0,
      region: "",
      city: "",
      state: ""
    }
  });

  useEffect(() => {
    if (profile?.branch_id) {
      fetchLeads();
      fetchAssignmentRules();
      fetchLeadSources();
      fetchEmployees();
      fetchSyncStatuses();
      setupRealtimeSubscription();
      setupSyncStatusSubscription();
      
      if (autoSyncEnabled) {
        startPeriodicSync();
      }
    }

    return () => {
      cleanup();
    };
  }, [profile?.branch_id]);

  useEffect(() => {
    if (autoSyncEnabled) {
      startPeriodicSync();
    } else {
      stopPeriodicSync();
    }
    
    return () => stopPeriodicSync();
  }, [autoSyncEnabled, syncInterval]);

  const setupSyncStatusSubscription = () => {
    if (syncStatusChannelRef.current) {
      supabase.removeChannel(syncStatusChannelRef.current);
    }

    syncStatusChannelRef.current = supabase
      .channel('sync-status-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sync_status',
        filter: `branch_id=eq.${profile?.branch_id}`
      }, (payload) => {
        console.log('Realtime sync status update:', payload);
        fetchSyncStatuses();
      })
      .subscribe();
  };

  const fetchSyncStatuses = async () => {
    try {
      const { data, error } = await supabase
        .from('sync_status')
        .select('*')
        .eq('branch_id', profile?.branch_id)
        .order('source_name', { ascending: true });

      if (error) throw error;
      setSyncStatuses(data || []);

      // Update individual status states for UI
      const indiamartStatus = data?.find(s => s.source_name === 'indiamart');
      const tradeindiStatus = data?.find(s => s.source_name === 'tradeindia');

      if (indiamartStatus?.last_sync_at) {
        setLastIndiaMartSync(new Date(indiamartStatus.last_sync_at));
      }
      if (tradeindiStatus?.last_sync_at) {
        setLastTradeIndiaSync(new Date(tradeindiStatus.last_sync_at));
      }

      // Update sync status based on any errors or rate limits
      const hasRateLimit = data?.some(s => s.rate_limit_until && new Date(s.rate_limit_until) > new Date());
      const hasError = data?.some(s => s.last_error);
      
      if (hasRateLimit) {
        setSyncStatus('rate_limited');
      } else if (hasError) {
        setSyncStatus('error');
      } else {
        setSyncStatus('idle');
      }
    } catch (error) {
      console.error('Error fetching sync statuses:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    channelRef.current = supabase
      .channel('leads-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'leads',
        filter: `branch_id=eq.${profile?.branch_id}`
      }, (payload) => {
        console.log('Realtime lead update:', payload);
        
        if (payload.eventType === 'INSERT') {
          toast({
            title: "New Lead",
            description: `New lead "${payload.new.title}" has been added`,
          });
        }
        
        // Refresh leads data
        fetchLeads();
      })
      .subscribe();
  };

  const startPeriodicSync = () => {
    stopPeriodicSync();
    
    const intervalMs = syncInterval * 60 * 1000; // Convert minutes to milliseconds
    
    syncIntervalRef.current = setInterval(() => {
      performIntelligentSync();
    }, intervalMs);
    
    // Start heartbeat for UI updates
    startHeartbeat();
    
    console.log(`Intelligent sync started: checking every ${syncInterval} minutes`);
  };

  const stopPeriodicSync = () => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
      console.log('Auto-sync stopped');
    }
    
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  };

  const startHeartbeat = () => {
    // Update UI status every second
    heartbeatRef.current = setInterval(() => {
      // This creates the illusion of constant monitoring
      // while respecting API rate limits
      if (syncStatus === 'idle') {
        // Refresh leads from database (no API calls)
        fetchLeads();
      }
    }, 1000);
  };

  const cleanup = () => {
    stopPeriodicSync();
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    if (syncStatusChannelRef.current) {
      supabase.removeChannel(syncStatusChannelRef.current);
    }
  };

  const performIntelligentSync = async () => {
    try {
      console.log('Performing intelligent sync check...');
      setSyncStatus('syncing');
      setLastSyncTime(new Date());
      
      const now = new Date();
      let totalNewLeads = 0;
      let hasRateLimit = false;
      
      // Check IndiaMART - respect 5-minute rate limit
      const indiaMartCanSync = !lastIndiaMartSync || 
        (now.getTime() - lastIndiaMartSync.getTime()) >= 5 * 60 * 1000;
      
      // Check TradeIndia - respect rate limits (assume 2-minute minimum)
      const tradeIndiaCanSync = !lastTradeIndiaSync || 
        (now.getTime() - lastTradeIndiaSync.getTime()) >= 2 * 60 * 1000;
      
      const syncPromises: Promise<any>[] = [];
      
      if (indiaMartCanSync) {
        console.log('Syncing IndiaMART...');
        syncPromises.push(
          supabase.functions.invoke('indiamart-sync', { body: {} })
            .then(result => ({ source: 'indiamart', result }))
        );
        setLastIndiaMartSync(now);
      }
      
      if (tradeIndiaCanSync) {
        console.log('Syncing TradeIndia...');
        syncPromises.push(
          supabase.functions.invoke('tradeindia-sync', { body: {} })
            .then(result => ({ source: 'tradeindia', result }))
        );
        setLastTradeIndiaSync(now);
      }
      
      if (syncPromises.length === 0) {
        console.log('All sources rate limited, skipping API calls');
        setSyncStatus('rate_limited');
        return;
      }
      
      const results = await Promise.allSettled(syncPromises);
      
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { source, result: syncResult } = result.value;
          
          if (syncResult.error) {
            console.error(`${source} sync error:`, syncResult.error);
            if (syncResult.error.message?.includes('429') || 
                syncResult.error.message?.includes('rate limit')) {
              hasRateLimit = true;
            }
          } else {
            const newLeads = syncResult.data?.new || 0;
            totalNewLeads += newLeads;
            console.log(`${source}: ${newLeads} new leads`);
          }
        }
      }
      
      if (hasRateLimit) {
        setSyncStatus('rate_limited');
        toast({
          title: "Rate Limited",
          description: "Some sources are rate limited. Sync will retry automatically.",
          variant: "destructive",
        });
      } else {
        setSyncStatus('idle');
      }
      
      if (totalNewLeads > 0) {
        toast({
          title: "New Leads Found",
          description: `${totalNewLeads} new leads synchronized`,
        });
        fetchLeads();
      }
      
    } catch (error) {
      console.error('Error in intelligent sync:', error);
      setSyncStatus('error');
      toast({
        title: "Sync Error",
        description: "There was an error syncing leads. Will retry automatically.",
        variant: "destructive",
      });
    }
  };

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          customers (name, company, email, phone),
          profiles (full_name),
          lead_sources (name, source_type)
        `)
        .eq('branch_id', profile?.branch_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast({
        title: "Error",
        description: "Failed to fetch leads",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignmentRules = async () => {
    try {
      const { data, error } = await supabase
        .from('lead_assignment_rules')
        .select('*')
        .eq('branch_id', profile?.branch_id)
        .order('priority', { ascending: true });

      if (error) throw error;
      
      // Get employee names separately
      const rulesWithNames = await Promise.all(
        (data || []).map(async (rule) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', rule.assigned_to)
            .single();
          
          return {
            ...rule,
            profiles: profile
          };
        })
      );
      
      setAssignmentRules(rulesWithNames);
    } catch (error) {
      console.error('Error fetching assignment rules:', error);
    }
  };

  const fetchLeadSources = async () => {
    try {
      const { data, error } = await supabase
        .from('lead_sources')
        .select('*')
        .eq('branch_id', profile?.branch_id)
        .order('name', { ascending: true });

      if (error) throw error;
      setLeadSources(data || []);
    } catch (error) {
      console.error('Error fetching lead sources:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('branch_id', profile?.branch_id)
        .eq('is_active', true)
        .in('role', ['admin', 'manager', 'executive']);

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleManualLeadSubmit = async () => {
    try {
      if (!newLead.title || !newLead.customer_name) {
        toast({
          title: "Error",
          description: "Please fill in required fields",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);

      // Create customer first if needed
      let customerId = null;
      if (newLead.customer_email) {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('email', newLead.customer_email)
          .eq('branch_id', profile?.branch_id)
          .maybeSingle();

        if (!existingCustomer) {
          const { data: newCustomer, error: customerError } = await supabase
            .from('customers')
            .insert({
              name: newLead.customer_name,
              company: newLead.customer_company,
              email: newLead.customer_email,
              phone: newLead.customer_phone,
              branch_id: profile?.branch_id
            })
            .select('id')
            .single();

          if (customerError) throw customerError;
          customerId = newCustomer.id;
        } else {
          customerId = existingCustomer.id;
        }
      }

      // Generate a collision-resistant lead number (timestamp + random)
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      const rand = Math.floor(100 + Math.random() * 900);
      const leadNumber = `LD-${y}${m}${d}${hh}${mm}${ss}-${rand}`;

      // Find manual lead source
      const manualSource = leadSources.find(s => s.source_type === 'manual');

      // Create lead
      const { error: leadError } = await supabase
        .from('leads')
        .insert({
          lead_no: leadNumber,
          title: newLead.title,
          description: newLead.description,
          source: 'Manual',
          status: 'new',
          value: newLead.value || null,
          probability: newLead.probability,
          expected_close_date: newLead.expected_close_date || null,
          customer_id: customerId,
          branch_id: profile?.branch_id,
          lead_source_id: manualSource?.id || null
        });

      if (leadError) throw leadError;

      toast({
        title: "Success",
        description: "Lead created successfully",
      });

      setIsManualLeadOpen(false);
        setNewLead({
          title: "",
          description: "",
          customer_name: "",
          customer_email: "",
          customer_phone: "",
          customer_company: "",
          value: 0,
          probability: 50,
          expected_close_date: "",
          source: "manual",
          region: "",
          city: "",
          state: "",
        });

      fetchLeads();
    } catch (error: any) {
      console.error('Error creating lead:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create lead",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncIndiaMART = async () => {
    try {
      setIsSyncingLeads(true);

      const { data, error } = await supabase.functions.invoke('indiamart-sync', {
        body: {}
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `IndiaMART sync completed. ${data?.new || 0} new leads captured.`,
      });

      fetchLeads();
    } catch (error: any) {
      console.error('Error syncing IndiaMART:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to sync IndiaMART leads",
        variant: "destructive",
      });
    } finally {
      setIsSyncingLeads(false);
    }
  };

  const handleSyncTradeIndia = async () => {
    try {
      setIsSyncingLeads(true);
      const { data, error } = await supabase.functions.invoke('tradeindia-sync', { body: {} });
      if (error) throw error;
      toast({ title: 'Success', description: `TradeIndia sync completed. ${data?.new || 0} new leads.` });
      fetchLeads();
    } catch (error: any) {
      console.error('Error syncing TradeIndia:', error);
      toast({ title: 'Error', description: error.message || 'Failed to sync TradeIndia leads', variant: 'destructive' });
    } finally {
      setIsSyncingLeads(false);
    }
  };

  const handleAddAssignmentRule = async () => {
    try {
      if (!newRule.name || !newRule.assigned_to) {
        toast({
          title: "Error",
          description: "Please fill in required fields",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('lead_assignment_rules')
        .insert({
          name: newRule.name,
          branch_id: profile?.branch_id,
          conditions: newRule.conditions,
          assigned_to: newRule.assigned_to,
          priority: newRule.priority,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Assignment rule created successfully",
      });

      setNewRule({
        name: "",
        description: "",
        assigned_to: "",
        priority: 1,
        rule_type: "manual",
        conditions: {
          source: "any",
          value_min: 0,
          value_max: 0,
          region: "",
          city: "",
          state: ""
        }
      });

      fetchAssignmentRules();
    } catch (error: any) {
      console.error('Error creating assignment rule:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create assignment rule",
        variant: "destructive",
      });
    }
  };

  const handleViewLead = (lead: Lead) => {
    setSelectedLead(lead);
    setIsLeadProfileOpen(true);
  };

  const handleCommunication = (lead: Lead) => {
    setSelectedLead(lead);
    setIsCommunicationDialogOpen(true);
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.lead_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (lead.customers?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesSource = sourceFilter === 'all' || lead.lead_sources?.source_type === sourceFilter;
    return matchesSearch && matchesStatus && matchesSource;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'qualified': return 'bg-green-100 text-green-800';
      case 'proposal': return 'bg-yellow-100 text-yellow-800';
      case 'won': return 'bg-emerald-100 text-emerald-800';
      case 'lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && leads.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Target className="h-6 w-6" />
            Lead Management
          </h2>
          <p className="text-muted-foreground">
            Manage leads from multiple sources with automated assignment
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Status indicator - only show for admin and manager */}
          {(profile?.role === 'admin' || profile?.role === 'manager') && (
            <div className="flex items-center space-x-2 border rounded-lg px-3 py-2 bg-muted/50">
              <Activity className={`h-4 w-4 ${
                syncStatus === 'syncing' ? 'text-blue-500 animate-pulse' :
                syncStatus === 'error' ? 'text-red-500' :
                syncStatus === 'rate_limited' ? 'text-yellow-500' :
                autoSyncEnabled ? 'text-green-500' : 'text-gray-400'
              }`} />
              <span className="text-sm text-muted-foreground">
                {syncStatus === 'syncing' ? 'Syncing...' :
                 syncStatus === 'error' ? 'Sync Error' :
                 syncStatus === 'rate_limited' ? 'Rate Limited' :
                 autoSyncEnabled ? 'Live Monitoring' : 'Offline'}
              </span>
              {lastSyncTime && (
                <span className="text-xs text-muted-foreground">
                  Last: {lastSyncTime.toLocaleTimeString()}
                </span>
              )}
              {(lastIndiaMartSync || lastTradeIndiaSync) && (
                <div className="text-xs text-muted-foreground border-l pl-2">
                  {lastIndiaMartSync && `IM: ${lastIndiaMartSync.toLocaleTimeString()}`}
                  {lastIndiaMartSync && lastTradeIndiaSync && ' | '}
                  {lastTradeIndiaSync && `TI: ${lastTradeIndiaSync.toLocaleTimeString()}`}
                </div>
              )}
            </div>
          )}

          {/* Sync and Settings buttons - only for admin and manager */}
          {(profile?.role === 'admin' || profile?.role === 'manager') && (
            <>
              <Button
                variant="outline"
                onClick={handleSyncIndiaMART}
                disabled={isSyncingLeads}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncingLeads ? 'animate-spin' : ''}`} />
                Sync IndiaMART
              </Button>

              <Button
                variant="outline"
                onClick={handleSyncTradeIndia}
                disabled={isSyncingLeads}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncingLeads ? 'animate-spin' : ''}`} />
                Sync TradeIndia
              </Button>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Zap className="h-4 w-4 mr-2" />
                    Real-time Settings
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Real-time Sync Settings</DialogTitle>
                    <DialogDescription>
                      Configure automatic synchronization from all lead sources
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Enable Auto-sync</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically sync leads from all sources at regular intervals
                        </p>
                      </div>
                      <Switch 
                        checked={autoSyncEnabled} 
                        onCheckedChange={setAutoSyncEnabled}
                      />
                    </div>

                    {autoSyncEnabled && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Check Interval (minutes)</Label>
                        <Select value={syncInterval.toString()} onValueChange={(value) => setSyncInterval(Number(value))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Every 1 minute (Recommended)</SelectItem>
                            <SelectItem value="2">Every 2 minutes</SelectItem>
                            <SelectItem value="5">Every 5 minutes</SelectItem>
                            <SelectItem value="15">Every 15 minutes</SelectItem>
                            <SelectItem value="30">Every 30 minutes</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          System intelligently respects API rate limits while checking frequently
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Sync Status</Label>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {syncStatuses.map(status => {
                            const isRateLimited = status.rate_limit_until && new Date(status.rate_limit_until) > new Date();
                            const nextSync = status.next_sync_at ? new Date(status.next_sync_at) : null;
                            const canSyncNow = !isRateLimited && (!nextSync || nextSync <= new Date());
                            
                            return (
                              <div key={status.source_name} className="p-2 border rounded bg-muted/30">
                                <div className="font-medium flex items-center gap-1">
                                  {status.source_name === 'indiamart' ? 'IndiaMART' : 'TradeIndia'}
                                  <div className={`w-2 h-2 rounded-full ${
                                    isRateLimited ? 'bg-red-500' :
                                    status.last_error ? 'bg-yellow-500' :
                                    canSyncNow ? 'bg-green-500' : 'bg-blue-500'
                                  }`} />
                                </div>
                                <div className="text-muted-foreground">
                                  {status.last_sync_at ? 
                                    `Last: ${new Date(status.last_sync_at).toLocaleTimeString()}` : 
                                    'Never synced'
                                  }
                                </div>
                                {isRateLimited && (
                                  <div className="text-red-500 text-xs">
                                    Rate limited until {new Date(status.rate_limit_until).toLocaleTimeString()}
                                  </div>
                                )}
                                {nextSync && !isRateLimited && (
                                  <div className="text-muted-foreground text-xs">
                                    Next: {nextSync.toLocaleTimeString()}
                                  </div>
                                )}
                                {status.last_error && (
                                  <div className="text-yellow-600 text-xs truncate" title={status.last_error}>
                                    Error: {status.last_error.substring(0, 20)}...
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    )}

                    <div className="pt-2 space-y-2">
                      <Button 
                        onClick={performIntelligentSync} 
                        className="w-full"
                        disabled={syncStatus === 'syncing'}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                        Force Sync Now
                      </Button>
                      <p className="text-xs text-center text-muted-foreground">
                        {syncStatus === 'syncing' ? 'Syncing in progress...' :
                         syncStatus === 'rate_limited' ? 'Some sources rate limited' :
                         'Manual sync ignores rate limits'}
                      </p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isAssignmentRulesOpen} onOpenChange={setIsAssignmentRulesOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Assignment Rules
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Lead Assignment Rules</DialogTitle>
                    <DialogDescription>
                      Configure automatic lead assignment based on conditions
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Add New Rule</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Rule Name</Label>
                            <Input
                              value={newRule.name}
                              onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                              placeholder="Enter rule name"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Assign To</Label>
                            <Select value={newRule.assigned_to} onValueChange={(value) => setNewRule({ ...newRule, assigned_to: value })}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select employee" />
                              </SelectTrigger>
                              <SelectContent>
                                {employees.map((emp) => (
                                  <SelectItem key={emp.id} value={emp.id}>
                                    {emp.full_name} ({emp.role})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Priority</Label>
                            <Input
                              type="number"
                              value={newRule.priority}
                              onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) })}
                              placeholder="Priority (1 = highest)"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Source Filter</Label>
                            <Select 
                              value={newRule.conditions.source} 
                              onValueChange={(value) => setNewRule({ 
                                ...newRule, 
                                conditions: { ...newRule.conditions, source: value }
                              })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select source" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="any">Any Source</SelectItem>
                                {leadSources.map((source) => (
                                  <SelectItem key={source.id} value={source.name}>
                                    {source.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Minimum Value</Label>
                            <Input
                              type="number"
                              value={newRule.conditions.value_min}
                              onChange={(e) => setNewRule({ 
                                ...newRule, 
                                conditions: { ...newRule.conditions, value_min: parseFloat(e.target.value) || 0 }
                              })}
                              placeholder="Minimum lead value"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Maximum Value</Label>
                            <Input
                              type="number"
                              value={newRule.conditions.value_max}
                              onChange={(e) => setNewRule({ 
                                ...newRule, 
                                conditions: { ...newRule.conditions, value_max: parseFloat(e.target.value) || 0 }
                              })}
                              placeholder="Maximum lead value"
                            />
                          </div>

                          <div className="col-span-2">
                            <Button onClick={handleAddAssignmentRule} className="w-full">
                              Add Rule
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Current Rules</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Priority</TableHead>
                              <TableHead>Rule Name</TableHead>
                              <TableHead>Assigned To</TableHead>
                              <TableHead>Conditions</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {assignmentRules.map((rule) => (
                              <TableRow key={rule.id}>
                                <TableCell>{rule.priority}</TableCell>
                                <TableCell>{rule.name}</TableCell>
                                <TableCell>{rule.profiles?.full_name}</TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    {rule.conditions.source && rule.conditions.source !== "any" && <div>Source: {rule.conditions.source}</div>}
                                    {rule.conditions.value_min > 0 && <div>Min: ₹{rule.conditions.value_min}</div>}
                                    {rule.conditions.value_max > 0 && <div>Max: ₹{rule.conditions.value_max}</div>}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                                    {rule.is_active ? 'Active' : 'Inactive'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}

          {/* Add Manual Lead button - available to all users */}
          <Dialog open={isManualLeadOpen} onOpenChange={setIsManualLeadOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Manual Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Manual Lead</DialogTitle>
                <DialogDescription>
                  Create a new lead manually
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Lead Title *</Label>
                  <Input
                    value={newLead.title}
                    onChange={(e) => setNewLead({ ...newLead, title: e.target.value })}
                    placeholder="Enter lead title"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Customer Name *</Label>
                  <Input
                    value={newLead.customer_name}
                    onChange={(e) => setNewLead({ ...newLead, customer_name: e.target.value })}
                    placeholder="Enter customer name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Customer Email</Label>
                  <Input
                    type="email"
                    value={newLead.customer_email}
                    onChange={(e) => setNewLead({ ...newLead, customer_email: e.target.value })}
                    placeholder="Enter customer email"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Customer Phone</Label>
                  <Input
                    value={newLead.customer_phone}
                    onChange={(e) => setNewLead({ ...newLead, customer_phone: e.target.value })}
                    placeholder="Enter customer phone"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input
                    value={newLead.customer_company}
                    onChange={(e) => setNewLead({ ...newLead, customer_company: e.target.value })}
                    placeholder="Enter company name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Expected Value</Label>
                  <Input
                    type="number"
                    value={newLead.value}
                    onChange={(e) => setNewLead({ ...newLead, value: parseFloat(e.target.value) || 0 })}
                    placeholder="Enter expected value"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Probability (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={newLead.probability}
                    onChange={(e) => setNewLead({ ...newLead, probability: parseInt(e.target.value) || 0 })}
                    placeholder="Enter probability"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Expected Close Date</Label>
                  <Input
                    type="date"
                    value={newLead.expected_close_date}
                    onChange={(e) => setNewLead({ ...newLead, expected_close_date: e.target.value })}
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newLead.description}
                    onChange={(e) => setNewLead({ ...newLead, description: e.target.value })}
                    placeholder="Enter lead description"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsManualLeadOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleManualLeadSubmit} disabled={loading}>
                  {loading ? "Creating..." : "Create Lead"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Leads</p>
                <p className="text-2xl font-bold">{leads.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <User className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Qualified</p>
                <p className="text-2xl font-bold">{leads.filter(l => l.status === 'qualified').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pipeline Value</p>
                <p className="text-2xl font-bold">
                  ₹{leads.reduce((sum, lead) => sum + (lead.value || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold">
                  {leads.filter(l => new Date(l.created_at).getMonth() === new Date().getMonth()).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="proposal">Proposal</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="indiamart">IndiaMART</SelectItem>
                <SelectItem value="tradeindia">TradeIndia</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Leads ({filteredLeads.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead #</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.lead_no}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{lead.title}</div>
                      {lead.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {lead.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{lead.customers?.name || 'Unknown'}</div>
                      {lead.customers?.company && (
                        <div className="text-sm text-gray-500">{lead.customers.company}</div>
                      )}
                      {lead.customers?.email && (
                        <div className="text-sm text-gray-500">{lead.customers.email}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">
                        {lead.lead_sources?.name || lead.source}
                      </Badge>
                      {lead.external_id && (
                        <ExternalLink className="h-3 w-3 text-gray-400" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(lead.status)}>
                      {lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {lead.value ? `₹${lead.value.toLocaleString()}` : '-'}
                    {lead.probability && (
                      <div className="text-sm text-gray-500">{lead.probability}%</div>
                    )}
                  </TableCell>
                  <TableCell>
                    {lead.profiles?.full_name || 'Unassigned'}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </div>
                    {lead.expected_close_date && (
                      <div className="text-xs text-gray-500">
                        Close: {new Date(lead.expected_close_date).toLocaleDateString()}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewLead(lead)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCommunication(lead)}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewLead(lead)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Lead Profile Component */}
      {isLeadProfileOpen && selectedLead && (
        <div className="fixed inset-0 z-50 bg-background">
          <LeadProfile
            leadId={selectedLead.id}
            onClose={() => {
              setIsLeadProfileOpen(false);
              setSelectedLead(null);
            }}
          />
        </div>
      )}

      {/* Communication Dialog */}
      <Dialog open={isCommunicationDialogOpen} onOpenChange={setIsCommunicationDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Communication - {selectedLead?.customers?.name}</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <CommunicationPanel
              entityType="lead"
              entityId={selectedLead.id}
              contactEmail={selectedLead.customers?.email}
              contactPhone={selectedLead.customers?.phone}
              contactName={selectedLead.customers?.name}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}