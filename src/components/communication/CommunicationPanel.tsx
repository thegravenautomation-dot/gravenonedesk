import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageSquare, Mail, Send, Clock, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

interface Communication {
  id: string
  contact_type: 'whatsapp' | 'email'
  direction: 'inbound' | 'outbound'
  from_contact: string
  to_contact: string
  subject?: string
  message: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  created_at: string
  related_entity_type?: string
  related_entity_id?: string
}

interface CommunicationTemplate {
  id: string
  name: string
  type: 'whatsapp' | 'email'
  category: string
  subject?: string
  template_body: string
  variables: string[]
}

interface CommunicationPanelProps {
  entityType?: string
  entityId?: string
  contactEmail?: string
  contactPhone?: string
  contactName?: string
}

export function CommunicationPanel({ entityType, entityId, contactEmail, contactPhone, contactName }: CommunicationPanelProps) {
  const { user, profile } = useAuth()
  const [communications, setCommunications] = useState<Communication[]>([])
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('whatsapp')
  
  // Form states
  const [whatsappMessage, setWhatsappMessage] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({})

  useEffect(() => {
    if (entityId) {
      fetchCommunications()
      setupRealtimeSubscription()
    }
    fetchTemplates()
  }, [entityId])

  const setupRealtimeSubscription = () => {
    if (!profile?.branch_id || !entityId) return

    const channel = supabase
      .channel(`communication-${entityType}-${entityId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'communications',
        filter: `branch_id=eq.${profile.branch_id}`
      }, (payload) => {
        const newComm = payload.new as Communication;
        if (newComm.related_entity_id === entityId && newComm.related_entity_type === entityType) {
          setCommunications(prev => [newComm, ...prev]);
          
          // Show real-time notification
          if (newComm.status === 'sent') {
            toast.success(`${newComm.contact_type} message sent successfully`);
          } else if (newComm.status === 'failed') {
            toast.error(`${newComm.contact_type} message failed to send`);
          }
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const fetchCommunications = async () => {
    if (!profile?.branch_id || !entityId) return

    const { data, error } = await supabase
      .from('communications')
      .select('*')
      .eq('branch_id', profile.branch_id)
      .eq('related_entity_type', entityType)
      .eq('related_entity_id', entityId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching communications:', error)
      return
    }

    setCommunications(data as Communication[] || [])
  }

  const fetchTemplates = async () => {
    if (!profile?.branch_id) return

    const { data, error } = await supabase
      .from('communication_templates')
      .select('*')
      .eq('branch_id', profile.branch_id)
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error fetching templates:', error)
      return
    }

    setTemplates(data as CommunicationTemplate[] || [])
  }

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (!template) return

    setSelectedTemplate(templateId)
    
    if (template.type === 'whatsapp') {
      setWhatsappMessage(template.template_body)
      setActiveTab('whatsapp')
    } else {
      setEmailSubject(template.subject || '')
      setEmailMessage(template.template_body)
      setActiveTab('email')
    }

    // Initialize template variables
    const variables: Record<string, string> = {}
    template.variables.forEach(variable => {
      variables[variable] = templateVariables[variable] || ''
    })
    setTemplateVariables(variables)
  }

  const sendWhatsApp = async () => {
    if (!contactPhone || !whatsappMessage.trim()) {
      toast.error('Phone number and message are required')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          to: contactPhone,
          message: whatsappMessage,
          relatedEntityType: entityType,
          relatedEntityId: entityId,
          templateId: selectedTemplate || undefined,
          templateVariables: Object.keys(templateVariables).length > 0 ? templateVariables : undefined
        }
      })

      if (error) throw error

      toast.success('WhatsApp message sent successfully')
      setWhatsappMessage('')
      setSelectedTemplate('')
      setTemplateVariables({})
      fetchCommunications()
    } catch (error: any) {
      console.error('Error sending WhatsApp:', error)
      toast.error(error.message || 'Failed to send WhatsApp message')
    } finally {
      setLoading(false)
    }
  }

  const sendEmail = async () => {
    if (!contactEmail || !emailSubject.trim() || !emailMessage.trim()) {
      toast.error('Email address, subject, and message are required')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('send-communication-email', {
        body: {
          to: contactEmail,
          subject: emailSubject,
          message: emailMessage,
          relatedEntityType: entityType,
          relatedEntityId: entityId,
          templateId: selectedTemplate || undefined,
          templateVariables: Object.keys(templateVariables).length > 0 ? templateVariables : undefined
        }
      })

      if (error) throw error

      toast.success('Email sent successfully')
      setEmailSubject('')
      setEmailMessage('')
      setSelectedTemplate('')
      setTemplateVariables({})
      fetchCommunications()
    } catch (error: any) {
      console.error('Error sending email:', error)
      toast.error(error.message || 'Failed to send email')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Clock className="h-4 w-4" />
      case 'delivered':
      case 'read':
        return <CheckCircle className="h-4 w-4" />
      case 'failed':
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-secondary'
      case 'delivered':
      case 'read':
        return 'bg-success'
      case 'failed':
        return 'bg-destructive'
      default:
        return 'bg-muted'
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Communication Center
          {contactName && <span className="text-sm font-normal text-muted-foreground">- {contactName}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Quick Templates</label>
          <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a template..." />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  <div className="flex items-center gap-2">
                    {template.type === 'whatsapp' ? <MessageSquare className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                    {template.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Template Variables */}
        {selectedTemplate && Object.keys(templateVariables).length > 0 && (
          <div className="space-y-2 p-4 border rounded-lg">
            <label className="text-sm font-medium">Template Variables</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(templateVariables).map(([key, value]) => (
                <div key={key}>
                  <label className="text-xs text-muted-foreground capitalize">{key.replace('_', ' ')}</label>
                  <Input
                    value={value}
                    onChange={(e) => setTemplateVariables(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={`Enter ${key.replace('_', ' ')}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Communication Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="whatsapp" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
          </TabsList>

          <TabsContent value="whatsapp" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Number</label>
              <Input value={contactPhone || ''} disabled placeholder="Phone number not available" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={whatsappMessage}
                onChange={(e) => setWhatsappMessage(e.target.value)}
                placeholder="Type your WhatsApp message..."
                rows={4}
              />
            </div>
            <Button 
              onClick={sendWhatsApp} 
              disabled={loading || !contactPhone || !whatsappMessage.trim()}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              Send WhatsApp
            </Button>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <Input value={contactEmail || ''} disabled placeholder="Email address not available" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject</label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Email subject..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="Type your email message..."
                rows={6}
              />
            </div>
            <Button 
              onClick={sendEmail} 
              disabled={loading || !contactEmail || !emailSubject.trim() || !emailMessage.trim()}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              Send Email
            </Button>
          </TabsContent>
        </Tabs>

        {/* Communication History */}
        {communications.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Communication History</label>
            <ScrollArea className="h-64 border rounded-lg p-4">
              <div className="space-y-3">
                {communications.map((comm) => (
                  <div key={comm.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="mt-1">
                      {comm.contact_type === 'whatsapp' ? (
                        <MessageSquare className="h-4 w-4 text-green-600" />
                      ) : (
                        <Mail className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {comm.direction === 'outbound' ? 'Sent' : 'Received'} {comm.contact_type === 'whatsapp' ? 'WhatsApp' : 'Email'}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(comm.status)}>
                            {getStatusIcon(comm.status)}
                            {comm.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comm.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      {comm.subject && (
                        <p className="text-sm font-medium">{comm.subject}</p>
                      )}
                      <p className="text-sm text-muted-foreground">{comm.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {comm.direction === 'outbound' ? `To: ${comm.to_contact}` : `From: ${comm.from_contact}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  )
}