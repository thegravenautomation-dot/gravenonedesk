import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Plus, Edit, Trash2, MessageSquare, Mail, Eye } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

interface CommunicationTemplate {
  id: string
  name: string
  type: 'whatsapp' | 'email'
  category: string
  subject?: string
  template_body: string
  variables: string[]
  is_active: boolean
  created_at: string
}

export function CommunicationTemplateManager() {
  const { profile } = useAuth()
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<CommunicationTemplate | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    type: 'whatsapp' as 'whatsapp' | 'email',
    category: 'lead_followup',
    subject: '',
    template_body: '',
    variables: [] as string[],
    is_active: true
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    if (!profile?.branch_id) return

    setLoading(true)
    const { data, error } = await supabase
      .from('communication_templates')
      .select('*')
      .eq('branch_id', profile.branch_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching templates:', error)
      toast.error('Failed to fetch templates')
    } else {
      setTemplates(data as CommunicationTemplate[] || [])
    }
    setLoading(false)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'whatsapp',
      category: 'lead_followup',
      subject: '',
      template_body: '',
      variables: [],
      is_active: true
    })
  }

  const handleCreate = () => {
    resetForm()
    setIsCreateDialogOpen(true)
  }

  const handleEdit = (template: CommunicationTemplate) => {
    setSelectedTemplate(template)
    setFormData({
      name: template.name,
      type: template.type,
      category: template.category,
      subject: template.subject || '',
      template_body: template.template_body,
      variables: template.variables,
      is_active: template.is_active
    })
    setIsEditDialogOpen(true)
  }

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{\{(\w+)\}\}/g)
    if (!matches) return []
    return [...new Set(matches.map(match => match.replace(/[{}]/g, '')))]
  }

  const handleSubmit = async (isEdit = false) => {
    if (!profile?.branch_id) return

    const variables = extractVariables(formData.template_body + (formData.subject || ''))
    
    const templateData = {
      ...formData,
      variables,
      branch_id: profile.branch_id,
      created_by: profile.id
    }

    setLoading(true)
    let error

    if (isEdit && selectedTemplate) {
      const { error: updateError } = await supabase
        .from('communication_templates')
        .update(templateData)
        .eq('id', selectedTemplate.id)
      error = updateError
    } else {
      const { error: insertError } = await supabase
        .from('communication_templates')
        .insert([templateData])
      error = insertError
    }

    if (error) {
      console.error('Error saving template:', error)
      toast.error('Failed to save template')
    } else {
      toast.success(`Template ${isEdit ? 'updated' : 'created'} successfully`)
      fetchTemplates()
      setIsCreateDialogOpen(false)
      setIsEditDialogOpen(false)
      resetForm()
    }
    setLoading(false)
  }

  const handleToggleActive = async (template: CommunicationTemplate) => {
    const { error } = await supabase
      .from('communication_templates')
      .update({ is_active: !template.is_active })
      .eq('id', template.id)

    if (error) {
      console.error('Error updating template:', error)
      toast.error('Failed to update template')
    } else {
      toast.success('Template updated successfully')
      fetchTemplates()
    }
  }

  const handleDelete = async (template: CommunicationTemplate) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    const { error } = await supabase
      .from('communication_templates')
      .delete()
      .eq('id', template.id)

    if (error) {
      console.error('Error deleting template:', error)
      toast.error('Failed to delete template')
    } else {
      toast.success('Template deleted successfully')
      fetchTemplates()
    }
  }

  const categories = [
    { value: 'lead_followup', label: 'Lead Follow-up' },
    { value: 'invoice_reminder', label: 'Invoice Reminder' },
    { value: 'order_confirmation', label: 'Order Confirmation' },
    { value: 'employee_notification', label: 'Employee Notification' },
    { value: 'vendor_communication', label: 'Vendor Communication' }
  ]

  const getCategoryLabel = (category: string) => {
    return categories.find(c => c.value === category)?.label || category
  }

  const renderTemplateForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Template Name</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter template name"
          />
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select 
            value={formData.type} 
            onValueChange={(value: 'whatsapp' | 'email') => setFormData(prev => ({ ...prev, type: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="email">Email</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Category</Label>
        <Select 
          value={formData.category} 
          onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map(category => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {formData.type === 'email' && (
        <div className="space-y-2">
          <Label>Subject</Label>
          <Input
            value={formData.subject}
            onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
            placeholder="Email subject (use {{variable}} for dynamic content)"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>Template Body</Label>
        <Textarea
          value={formData.template_body}
          onChange={(e) => setFormData(prev => ({ ...prev, template_body: e.target.value }))}
          placeholder="Enter template content (use {{variable}} for dynamic content)"
          rows={6}
        />
        <p className="text-xs text-muted-foreground">
          Use {`{{variable_name}}`} to create dynamic variables. Example: {`{{customer_name}}, {{product_name}}`}
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
        />
        <Label>Active</Label>
      </div>

      {(formData.template_body || formData.subject) && (
        <div className="p-3 border rounded-lg bg-muted/50">
          <Label className="text-sm font-medium">Detected Variables:</Label>
          <div className="flex flex-wrap gap-1 mt-1">
            {extractVariables(formData.template_body + (formData.subject || '')).map(variable => (
              <Badge key={variable} variant="secondary" className="text-xs">
                {variable}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Communication Templates</CardTitle>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Variables</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell className="font-medium">{template.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {template.type === 'whatsapp' ? (
                      <MessageSquare className="h-4 w-4 text-green-600" />
                    ) : (
                      <Mail className="h-4 w-4 text-blue-600" />
                    )}
                    {template.type}
                  </div>
                </TableCell>
                <TableCell>{getCategoryLabel(template.category)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {template.variables.slice(0, 3).map(variable => (
                      <Badge key={variable} variant="outline" className="text-xs">
                        {variable}
                      </Badge>
                    ))}
                    {template.variables.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{template.variables.length - 3}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={template.is_active}
                      onCheckedChange={() => handleToggleActive(template)}
                    />
                    <span className="text-sm">
                      {template.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(template)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDelete(template)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Create Template Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Communication Template</DialogTitle>
            </DialogHeader>
            {renderTemplateForm()}
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => handleSubmit(false)} disabled={loading}>
                Create Template
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Template Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Communication Template</DialogTitle>
            </DialogHeader>
            {renderTemplateForm()}
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => handleSubmit(true)} disabled={loading}>
                Update Template
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}