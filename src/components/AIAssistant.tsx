import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bot, Send, MessageSquare, Mail, Phone, Users, TrendingUp, Sparkles } from "lucide-react";

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  context?: string;
  timestamp: Date;
}

interface AIAssistantProps {
  className?: string;
}

interface Customer {
  id: string;
  name: string;
  company: string;
  city: string;
}

interface Lead {
  id: string;
  title: string;
  description: string;
  customers: {
    name: string;
    company: string;
    city: string;
  } | null;
}

export function AIAssistant({ className }: AIAssistantProps) {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [context, setContext] = useState("general");
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [selectedLead, setSelectedLead] = useState<string>("");

  const contexts = [
    { value: "general", label: "General", icon: MessageSquare },
    { value: "email", label: "Email Draft", icon: Mail },
    { value: "whatsapp", label: "WhatsApp", icon: Phone },
    { value: "leads", label: "Lead Management", icon: Users },
    { value: "sales", label: "Sales Strategy", icon: TrendingUp },
    { value: "customers", label: "Customer Service", icon: Users },
  ];

  // Fetch customers and leads when component mounts
  useEffect(() => {
    if (profile?.branch_id) {
      fetchCustomers();
      fetchLeads();
    }
  }, [profile?.branch_id]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, company, city')
        .eq('branch_id', profile?.branch_id)
        .order('name');
      
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          id, title, description,
          customers (name, company, city)
        `)
        .eq('branch_id', profile?.branch_id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: input,
      context,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          message: input,
          context,
          userId: user?.id,
          branchId: profile?.branch_id,
          selectedCustomer: selectedCustomer || null,
          selectedLead: selectedLead || null,
        }
      });

      if (error) throw error;

      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: data.response,
        context,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error: any) {
      console.error('Error getting AI response:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to get AI response",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getContextIcon = (contextValue: string) => {
    const contextObj = contexts.find(c => c.value === contextValue);
    const Icon = contextObj?.icon || MessageSquare;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
            <Bot className="h-5 w-5 text-white" />
          </div>
          AI Assistant
          <Badge variant="secondary" className="ml-auto">
            <Sparkles className="h-3 w-3 mr-1" />
            Smart
          </Badge>
        </CardTitle>
        <CardDescription>
          Get instant help with sales, customer service, emails, and business queries
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Context Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Context</label>
          <Select value={context} onValueChange={(value) => {
            setContext(value);
            setSelectedCustomer("");
            setSelectedLead("");
          }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {contexts.map((ctx) => {
                const Icon = ctx.icon;
                return (
                  <SelectItem key={ctx.value} value={ctx.value}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {ctx.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Customer Selector for Email Context */}
        {context === 'email' && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Customer (Optional)</label>
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a customer for personalized email..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No specific customer</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name} - {customer.company} ({customer.city || 'Unknown Location'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Lead Selector for Lead Management Context */}
        {context === 'leads' && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Lead (Optional)</label>
            <Select value={selectedLead} onValueChange={setSelectedLead}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a lead for targeted questions..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">General lead management</SelectItem>
                {leads.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.title} - {lead.customers?.company || 'Unknown Company'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="h-64 border rounded-lg p-3 space-y-2">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Ask me anything about your business!</p>
              <p className="text-xs mt-1">I can help with emails, WhatsApp messages, lead qualification, and more.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.type === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {message.context && message.type === 'ai' && (
                      <div className="flex items-center gap-1 text-xs opacity-70 mb-2">
                        {getContextIcon(message.context)}
                        {contexts.find(c => c.value === message.context)?.label}
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3 max-w-[80%]">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                      <span className="text-sm">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="flex gap-2">
          <Textarea
            placeholder={`Ask about ${contexts.find(c => c.value === context)?.label.toLowerCase() || 'anything'}...`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="resize-none"
            rows={2}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            size="sm"
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setInput("Help me draft a professional email to a potential customer");
              setContext("email");
            }}
          >
            <Mail className="h-3 w-3 mr-1" />
            Draft Email
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setInput("What questions should I ask to qualify this lead?");
              setContext("leads");
            }}
          >
            <Users className="h-3 w-3 mr-1" />
            Qualify Lead
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setInput("What products would suit a manufacturing company?");
              setContext("sales");
            }}
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            Product Suggest
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}