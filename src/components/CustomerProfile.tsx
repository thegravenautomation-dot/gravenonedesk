import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { User, Building2, Mail, Phone, MapPin, Edit, Calendar } from "lucide-react";
import { FollowUpScheduler } from "./FollowUpScheduler";

interface CustomerProfileProps {
  customerId: string;
  customerData?: any;
  onCustomerUpdate?: () => void;
  compact?: boolean;
  showScheduleButton?: boolean;
}

export function CustomerProfile({ 
  customerId, 
  customerData: initialCustomerData, 
  onCustomerUpdate,
  compact = false,
  showScheduleButton = true 
}: CustomerProfileProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [customerData, setCustomerData] = useState(initialCustomerData);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
  const [loading, setLoading] = useState(!initialCustomerData);
  
  const [editForm, setEditForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    gstin: "",
    whatsapp_number: "",
    designation: "",
    billing_address: "",
    shipping_address: "",
  });

  useEffect(() => {
    if (!initialCustomerData && customerId) {
      fetchCustomerData();
    } else if (initialCustomerData) {
      setCustomerData(initialCustomerData);
      populateEditForm(initialCustomerData);
    }
  }, [customerId, initialCustomerData]);

  const fetchCustomerData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .eq('branch_id', profile?.branch_id)
        .single();

      if (error) throw error;
      
      setCustomerData(data);
      populateEditForm(data);
    } catch (error) {
      console.error('Error fetching customer data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch customer data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const populateEditForm = (data: any) => {
    setEditForm({
      name: data.name || "",
      company: data.company || "",
      email: data.email || "",
      phone: data.phone || "",
      gstin: data.gstin || "",
      whatsapp_number: data.whatsapp_number || "",
      designation: data.designation || "",
      billing_address: data.billing_address || data.address || "",
      shipping_address: data.shipping_address || data.address || "",
    });
  };

  const handleUpdateCustomer = async () => {
    try {
      if (!customerData) return;

      const { error } = await supabase
        .from('customers')
        .update({
          name: editForm.name,
          company: editForm.company,
          email: editForm.email,
          phone: editForm.phone,
          gstin: editForm.gstin,
          whatsapp_number: editForm.whatsapp_number,
          designation: editForm.designation,
          billing_address: editForm.billing_address,
          shipping_address: editForm.shipping_address,
        })
        .eq('id', customerData.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Customer details updated successfully",
      });
      
      setIsEditingCustomer(false);
      fetchCustomerData();
      onCustomerUpdate?.();
    } catch (error) {
      console.error('Error updating customer:', error);
      toast({
        title: "Error",
        description: "Failed to update customer details",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-4">Loading...</div>;
  }

  if (!customerData) {
    return <div className="flex items-center justify-center p-4">Customer not found</div>;
  }

  if (compact) {
    return (
      <div className="p-4 border rounded-lg bg-background hover:bg-accent/50 transition-colors">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h4 className="font-semibold">{customerData.name}</h4>
            {customerData.company && (
              <p className="text-sm text-muted-foreground">{customerData.company}</p>
            )}
          </div>
          <div className="flex gap-1">
            <Dialog open={isEditingCustomer} onOpenChange={setIsEditingCustomer}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Edit className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit Customer Details</DialogTitle>
                  <DialogDescription>
                    Update customer information
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={editForm.name}
                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={editForm.company}
                      onChange={(e) => setEditForm({...editForm, company: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="whatsapp_number">WhatsApp</Label>
                    <Input
                      id="whatsapp_number"
                      value={editForm.whatsapp_number}
                      onChange={(e) => setEditForm({...editForm, whatsapp_number: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="designation">Designation</Label>
                    <Input
                      id="designation"
                      value={editForm.designation}
                      onChange={(e) => setEditForm({...editForm, designation: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="gstin">GST Number</Label>
                    <Input
                      id="gstin"
                      value={editForm.gstin}
                      onChange={(e) => setEditForm({...editForm, gstin: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="billing_address">Billing Address</Label>
                    <Input
                      id="billing_address"
                      value={editForm.billing_address}
                      onChange={(e) => setEditForm({...editForm, billing_address: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="shipping_address">Shipping Address</Label>
                    <Input
                      id="shipping_address"
                      value={editForm.shipping_address}
                      onChange={(e) => setEditForm({...editForm, shipping_address: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 mt-6">
                  <Button variant="outline" onClick={() => setIsEditingCustomer(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateCustomer}>
                    Update Customer
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            {showScheduleButton && (
              <FollowUpScheduler
                customerId={customerId}
                customerName={customerData.name}
                trigger={
                  <Button variant="ghost" size="sm">
                    <Calendar className="h-3 w-3" />
                  </Button>
                }
              />
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          {customerData.phone && (
            <div className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              <span>{customerData.phone}</span>
            </div>
          )}
          {customerData.email && (
            <div className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              <span>{customerData.email}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer Information
          </div>
          <div className="flex gap-2">
            <Dialog open={isEditingCustomer} onOpenChange={setIsEditingCustomer}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit Customer Details</DialogTitle>
                  <DialogDescription>
                    Update customer information
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={editForm.name}
                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={editForm.company}
                      onChange={(e) => setEditForm({...editForm, company: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="whatsapp_number">WhatsApp</Label>
                    <Input
                      id="whatsapp_number"
                      value={editForm.whatsapp_number}
                      onChange={(e) => setEditForm({...editForm, whatsapp_number: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="designation">Designation</Label>
                    <Input
                      id="designation"
                      value={editForm.designation}
                      onChange={(e) => setEditForm({...editForm, designation: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="gstin">GST Number</Label>
                    <Input
                      id="gstin"
                      value={editForm.gstin}
                      onChange={(e) => setEditForm({...editForm, gstin: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="billing_address">Billing Address</Label>
                    <Input
                      id="billing_address"
                      value={editForm.billing_address}
                      onChange={(e) => setEditForm({...editForm, billing_address: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="shipping_address">Shipping Address</Label>
                    <Input
                      id="shipping_address"
                      value={editForm.shipping_address}
                      onChange={(e) => setEditForm({...editForm, shipping_address: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 mt-6">
                  <Button variant="outline" onClick={() => setIsEditingCustomer(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateCustomer}>
                    Update Customer
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            {showScheduleButton && (
              <FollowUpScheduler
                customerId={customerId}
                customerName={customerData.name}
                trigger={
                  <Button variant="outline" size="sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Follow-up
                  </Button>
                }
              />
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Name</Label>
            <p className="font-medium">{customerData.name}</p>
          </div>
          <div>
            <Label>Company</Label>
            <p className="text-sm">{customerData.company || "N/A"}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Email</Label>
            <p className="text-sm flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {customerData.email || "N/A"}
            </p>
          </div>
          <div>
            <Label>Phone</Label>
            <p className="text-sm flex items-center gap-2">
              <Phone className="h-4 w-4" />
              {customerData.phone || "N/A"}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>WhatsApp</Label>
            <p className="text-sm">{customerData.whatsapp_number || "N/A"}</p>
          </div>
          <div>
            <Label>Designation</Label>
            <p className="text-sm">{customerData.designation || "N/A"}</p>
          </div>
        </div>
        <div>
          <Label>GST Number</Label>
          <p className="text-sm">{customerData.gstin || "N/A"}</p>
        </div>
        <div>
          <Label>Billing Address</Label>
          <p className="text-sm">{customerData.billing_address || customerData.address || "N/A"}</p>
        </div>
        <div>
          <Label>Shipping Address</Label>
          <p className="text-sm">{customerData.shipping_address || customerData.address || "N/A"}</p>
        </div>
      </CardContent>
    </Card>
  );
}