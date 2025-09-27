import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Building2, Plus, Edit, Settings, Users, MapPin } from "lucide-react";

interface Branch {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  manager_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface BranchFormData {
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  is_active: boolean;
}

export function BranchSettings() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState<BranchFormData>({
    name: "",
    code: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    phone: "",
    email: "",
    is_active: true,
  });
  const { toast } = useToast();
  const { profile } = useAuth();

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching branches:', error);
        toast({
          title: "Error",
          description: "Failed to fetch branches",
          variant: "destructive",
        });
        return;
      }

      setBranches(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof BranchFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      phone: "",
      email: "",
      is_active: true,
    });
    setEditingBranch(null);
  };

  const handleEdit = (branch: Branch) => {
    setFormData({
      name: branch.name || "",
      code: branch.code || "",
      address: branch.address || "",
      city: branch.city || "",
      state: branch.state || "",
      pincode: branch.pincode || "",
      phone: branch.phone || "",
      email: branch.email || "",
      is_active: branch.is_active,
    });
    setEditingBranch(branch);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.code) {
      toast({
        title: "Validation Error",
        description: "Branch name and code are required",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingBranch) {
        // Update existing branch
        const { error } = await supabase
          .from('branches')
          .update({
            name: formData.name,
            code: formData.code,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            phone: formData.phone,
            email: formData.email,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingBranch.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Branch updated successfully",
        });
      } else {
        // Create new branch
        const { error } = await supabase
          .from('branches')
          .insert({
            name: formData.name,
            code: formData.code,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            phone: formData.phone,
            email: formData.email,
            is_active: formData.is_active,
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Branch created successfully",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchBranches();
    } catch (error: any) {
      console.error('Error saving branch:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save branch",
        variant: "destructive",
      });
    }
  };

  const toggleBranchStatus = async (branch: Branch) => {
    try {
      const { error } = await supabase
        .from('branches')
        .update({
          is_active: !branch.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', branch.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Branch ${!branch.is_active ? 'activated' : 'deactivated'} successfully`,
      });

      fetchBranches();
    } catch (error: any) {
      console.error('Error updating branch status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update branch status",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading branches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Branch Management
              </CardTitle>
              <CardDescription>
                Manage company branches, locations, and configurations
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Branch
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingBranch ? 'Edit Branch' : 'Add New Branch'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingBranch ? 'Update branch information' : 'Create a new branch location'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Branch Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Enter branch name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="code">Branch Code *</Label>
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                        placeholder="e.g., MUM01, DEL01"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="Enter complete address"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        placeholder="Enter city"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        placeholder="Enter state"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pincode">Pincode</Label>
                      <Input
                        id="pincode"
                        value={formData.pincode}
                        onChange={(e) => handleInputChange('pincode', e.target.value)}
                        placeholder="Enter pincode"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="Enter phone number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="Enter email address"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(value) => handleInputChange('is_active', value)}
                    />
                    <Label htmlFor="is_active">Active Branch</Label>
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { setIsDialogOpen(false); resetForm(); }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingBranch ? 'Update Branch' : 'Create Branch'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="branches" className="space-y-4">
            <TabsList>
              <TabsTrigger value="branches">All Branches</TabsTrigger>
              <TabsTrigger value="active">Active Branches</TabsTrigger>
              <TabsTrigger value="inactive">Inactive Branches</TabsTrigger>
            </TabsList>

            <TabsContent value="branches" className="space-y-4">
              <BranchTable 
                branches={branches} 
                onEdit={handleEdit}
                onToggleStatus={toggleBranchStatus}
              />
            </TabsContent>

            <TabsContent value="active" className="space-y-4">
              <BranchTable 
                branches={branches.filter(b => b.is_active)} 
                onEdit={handleEdit}
                onToggleStatus={toggleBranchStatus}
              />
            </TabsContent>

            <TabsContent value="inactive" className="space-y-4">
              <BranchTable 
                branches={branches.filter(b => !b.is_active)} 
                onEdit={handleEdit}
                onToggleStatus={toggleBranchStatus}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

interface BranchTableProps {
  branches: Branch[];
  onEdit: (branch: Branch) => void;
  onToggleStatus: (branch: Branch) => void;
}

function BranchTable({ branches, onEdit, onToggleStatus }: BranchTableProps) {
  if (branches.length === 0) {
    return (
      <div className="text-center py-8">
        <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No branches found</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Branch Name</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {branches.map((branch) => (
            <TableRow key={branch.id}>
              <TableCell className="font-medium">{branch.name}</TableCell>
              <TableCell>
                <Badge variant="outline">{branch.code}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm">
                    {[branch.city, branch.state].filter(Boolean).join(', ') || 'Not specified'}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm space-y-1">
                  {branch.phone && <div>{branch.phone}</div>}
                  {branch.email && <div className="text-muted-foreground">{branch.email}</div>}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={branch.is_active ? "default" : "secondary"}>
                  {branch.is_active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(branch)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant={branch.is_active ? "destructive" : "default"}
                    size="sm"
                    onClick={() => onToggleStatus(branch)}
                  >
                    {branch.is_active ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}