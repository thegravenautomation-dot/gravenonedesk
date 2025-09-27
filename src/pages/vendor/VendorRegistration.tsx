import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { vendorRegistrationSchema, type VendorRegistrationData } from '@/lib/validations';
import { Building2, Mail, Phone, MapPin, CreditCard, Banknote, AlertCircle, CheckCircle } from 'lucide-react';

export default function VendorRegistration() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<VendorRegistrationData>({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstin: '',
    pan: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    account_holder_name: '',
    business_type: '',
    annual_turnover: '',
    years_in_business: '',
    branch_id: ''
  })

  const [branches, setBranches] = useState<any[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'success' | 'error'>('idle')

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    const { data } = await supabase.from('branches').select('id, name, city').eq('is_active', true);
    setBranches(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})
    setSubmissionStatus('idle')

    try {
      // Validate form data
      const validatedData = vendorRegistrationSchema.parse(formData)
      
      // Prepare data for insertion - ensure branch_id is included
      const insertData = {
        company_name: validatedData.company_name,
        contact_person: validatedData.contact_person,
        email: validatedData.email,
        phone: validatedData.phone,
        address: validatedData.address || null,
        city: validatedData.city || null,
        state: validatedData.state || null,
        pincode: validatedData.pincode || null,
        gstin: validatedData.gstin || null,
        pan: validatedData.pan || null,
        bank_name: validatedData.bank_name || null,
        account_number: validatedData.account_number || null,
        ifsc_code: validatedData.ifsc_code || null,
        account_holder_name: validatedData.account_holder_name || null,
        business_type: validatedData.business_type || null,
        annual_turnover: validatedData.annual_turnover ? parseFloat(validatedData.annual_turnover) : null,
        years_in_business: validatedData.years_in_business ? parseInt(validatedData.years_in_business) : null,
        branch_id: validatedData.branch_id,
        status: 'pending'
      }

      const { error } = await supabase.from('vendor_applications').insert(insertData)

      if (error) throw error

      setSubmissionStatus('success')
      toast({
        title: 'Application Submitted Successfully!',
        description: 'Your vendor application has been submitted for review. You will be notified once approved.',
      })

      // Reset form
      setFormData({
        company_name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        gstin: '',
        pan: '',
        bank_name: '',
        account_number: '',
        ifsc_code: '',
        account_holder_name: '',
        business_type: '',
        annual_turnover: '',
        years_in_business: '',
        branch_id: ''
      })

      // Navigate after 3 seconds
      setTimeout(() => {
        navigate('/')
      }, 3000)

    } catch (error: any) {
      console.error('Submission error:', error)
      setSubmissionStatus('error')
      
      if (error.errors) {
        // Handle zod validation errors
        const validationErrors: Record<string, string> = {}
        error.errors.forEach((err: any) => {
          validationErrors[err.path[0]] = err.message
        })
        setErrors(validationErrors)
        
        toast({
          title: 'Validation Error',
          description: 'Please check the form for errors and try again.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Submission Failed',
          description: error.message || 'Failed to submit application. Please try again.',
          variant: 'destructive',
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof VendorRegistrationData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const getFieldError = (field: string) => errors[field] || ''

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Success Alert */}
        {submissionStatus === 'success' && (
          <Alert className="mb-6 border-green-500 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Your vendor application has been submitted successfully! Redirecting to homepage in 3 seconds...
            </AlertDescription>
          </Alert>
        )}

        {/* Error Alert */}
        {submissionStatus === 'error' && Object.keys(errors).length === 0 && (
          <Alert className="mb-6" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              There was an error submitting your application. Please try again.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
              <Building2 className="h-6 w-6" />
              Vendor Registration
            </CardTitle>
            <p className="text-muted-foreground">
              Register your company as a vendor to participate in our procurement process
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Company Information */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name *</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => handleChange('company_name', e.target.value)}
                    className={getFieldError('company_name') ? 'border-red-500' : ''}
                    required
                  />
                  {getFieldError('company_name') && (
                    <p className="text-sm text-red-600 mt-1">{getFieldError('company_name')}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_person">Contact Person *</Label>
                  <Input
                    id="contact_person"
                    value={formData.contact_person}
                    onChange={(e) => handleChange('contact_person', e.target.value)}
                    className={getFieldError('contact_person') ? 'border-red-500' : ''}
                    required
                  />
                  {getFieldError('contact_person') && (
                    <p className="text-sm text-red-600 mt-1">{getFieldError('contact_person')}</p>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    Email Address *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className={getFieldError('email') ? 'border-red-500' : ''}
                    required
                  />
                  {getFieldError('email') && (
                    <p className="text-sm text-red-600 mt-1">{getFieldError('email')}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    Phone Number *
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className={getFieldError('phone') ? 'border-red-500' : ''}
                    required
                  />
                  {getFieldError('phone') && (
                    <p className="text-sm text-red-600 mt-1">{getFieldError('phone')}</p>
                  )}
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <Label className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  Address Information
                </Label>
                <Textarea
                  placeholder="Complete Address"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                />
                <div className="grid md:grid-cols-3 gap-4">
                  <Input
                    placeholder="City"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                  />
                  <Input
                    placeholder="State"
                    value={formData.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                  />
                  <Input
                    placeholder="Pincode"
                    value={formData.pincode}
                    onChange={(e) => handleChange('pincode', e.target.value)}
                  />
                </div>
              </div>

              {/* Tax Information */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gstin" className="flex items-center gap-1">
                    <CreditCard className="h-4 w-4" />
                    GSTIN
                  </Label>
                  <Input
                    id="gstin"
                    value={formData.gstin}
                    onChange={(e) => handleChange('gstin', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pan">PAN Number</Label>
                  <Input
                    id="pan"
                    value={formData.pan}
                    onChange={(e) => handleChange('pan', e.target.value)}
                  />
                </div>
              </div>

              {/* Bank Information */}
              <div className="space-y-4">
                <Label className="flex items-center gap-1">
                  <Banknote className="h-4 w-4" />
                  Bank Information
                </Label>
                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Bank Name"
                    value={formData.bank_name}
                    onChange={(e) => handleChange('bank_name', e.target.value)}
                  />
                  <Input
                    placeholder="Account Holder Name"
                    value={formData.account_holder_name}
                    onChange={(e) => handleChange('account_holder_name', e.target.value)}
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Account Number"
                    value={formData.account_number}
                    onChange={(e) => handleChange('account_number', e.target.value)}
                  />
                  <Input
                    placeholder="IFSC Code"
                    value={formData.ifsc_code}
                    onChange={(e) => handleChange('ifsc_code', e.target.value)}
                  />
                </div>
              </div>

              {/* Business Information */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="business_type">Business Type</Label>
                  <Select value={formData.business_type} onValueChange={(value) => handleChange('business_type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manufacturer">Manufacturer</SelectItem>
                      <SelectItem value="distributor">Distributor</SelectItem>
                      <SelectItem value="trader">Trader</SelectItem>
                      <SelectItem value="service_provider">Service Provider</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="annual_turnover">Annual Turnover (₹)</Label>
                  <Input
                    id="annual_turnover"
                    type="number"
                    value={formData.annual_turnover}
                    onChange={(e) => handleChange('annual_turnover', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="years_in_business">Years in Business</Label>
                  <Input
                    id="years_in_business"
                    type="number"
                    value={formData.years_in_business}
                    onChange={(e) => handleChange('years_in_business', e.target.value)}
                  />
                </div>
              </div>

              {/* Branch Selection */}
              <div className="space-y-2">
                <Label htmlFor="branch_id">Preferred Branch *</Label>
                <Select value={formData.branch_id} onValueChange={(value) => handleChange('branch_id', value)}>
                  <SelectTrigger className={getFieldError('branch_id') ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name} - {branch.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {getFieldError('branch_id') && (
                  <p className="text-sm text-red-600 mt-1">{getFieldError('branch_id')}</p>
                )}
              </div>

              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" onClick={() => navigate('/')}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Application'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}