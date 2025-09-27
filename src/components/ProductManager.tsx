import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Edit, Package, AlertTriangle } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description?: string;
  hsn_code?: string;
  category?: string;
  unit: string;
  price: number;
  current_stock: number;
  minimum_stock: number;
  status: string;
  created_at: string;
}

const categories = [
  "Electronics",
  "Raw Materials", 
  "Finished Goods",
  "Packaging Materials",
  "Office Supplies",
  "Tools & Equipment",
  "Safety Equipment",
  "Chemicals",
  "Textiles",
  "Food & Beverages",
  "Other"
];

const units = [
  "Nos", "Pcs", "Kg", "Grams", "Ltr", "Ml", "Mtr", "Cm", "Sq.Ft", 
  "Sq.Mtr", "Box", "Pack", "Dozen", "Set", "Pair", "Bundle"
];

export function ProductManager() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [newProductOpen, setNewProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    hsn_code: "",
    category: "",
    unit: "Nos",
    price: 0,
    current_stock: 0,
    minimum_stock: 0,
  });

  useEffect(() => {
    fetchProducts();
  }, [profile?.branch_id]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('branch_id', profile?.branch_id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch products',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNewProduct({
      name: "",
      description: "",
      hsn_code: "",
      category: "",
      unit: "Nos",
      price: 0,
      current_stock: 0,
      minimum_stock: 0,
    });
    setEditingProduct(null);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newProduct.name) {
      toast({
        title: 'Error',
        description: 'Product name is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const productData = {
        ...newProduct,
        branch_id: profile?.branch_id,
        added_by: profile?.id,
        status: 'active',
        source: 'manual'
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('items')
          .update(productData)
          .eq('id', editingProduct.id);
        
        if (error) throw error;
        
        toast({
          title: 'Success',
          description: 'Product updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('items')
          .insert([productData]);
        
        if (error) throw error;
        
        toast({
          title: 'Success',
          description: 'Product added successfully',
        });
      }

      setNewProductOpen(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      toast({
        title: 'Error',
        description: editingProduct ? 'Failed to update product' : 'Failed to add product',
        variant: 'destructive',
      });
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      description: product.description || "",
      hsn_code: product.hsn_code || "",
      category: product.category || "",
      unit: product.unit,
      price: product.price,
      current_stock: product.current_stock,
      minimum_stock: product.minimum_stock,
    });
    setNewProductOpen(true);
  };

  const getStockStatus = (current: number, minimum: number) => {
    if (current <= 0) return { label: 'Out of Stock', variant: 'destructive' as const };
    if (current <= minimum) return { label: 'Low Stock', variant: 'default' as const };
    return { label: 'In Stock', variant: 'secondary' as const };
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.hsn_code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockProducts = products.filter(p => p.current_stock <= p.minimum_stock);
  const outOfStockProducts = products.filter(p => p.current_stock <= 0);

  return (
    <div className="space-y-6">
      {/* Stock Alerts */}
      {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {outOfStockProducts.length > 0 && (
            <Card className="border-red-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-red-600 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Out of Stock ({outOfStockProducts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {outOfStockProducts.slice(0, 3).map(product => (
                    <div key={product.id} className="text-sm text-red-600">
                      {product.name}
                    </div>
                  ))}
                  {outOfStockProducts.length > 3 && (
                    <div className="text-sm text-muted-foreground">
                      +{outOfStockProducts.length - 3} more
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          
          {lowStockProducts.length > 0 && (
            <Card className="border-yellow-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-yellow-600 flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Low Stock ({lowStockProducts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {lowStockProducts.slice(0, 3).map(product => (
                    <div key={product.id} className="text-sm text-yellow-600">
                      {product.name} ({product.current_stock} left)
                    </div>
                  ))}
                  {lowStockProducts.length > 3 && (
                    <div className="text-sm text-muted-foreground">
                      +{lowStockProducts.length - 3} more
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <Dialog open={newProductOpen} onOpenChange={(open) => {
          setNewProductOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hsn_code">HSN Code</Label>
                  <Input
                    id="hsn_code"
                    value={newProduct.hsn_code}
                    onChange={(e) => setNewProduct({ ...newProduct, hsn_code: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={newProduct.category} 
                    onValueChange={(value) => setNewProduct({ ...newProduct, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Select 
                    value={newProduct.unit} 
                    onValueChange={(value) => setNewProduct({ ...newProduct, unit: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="price">Unit Price (₹)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="current_stock">Current Stock</Label>
                  <Input
                    id="current_stock"
                    type="number"
                    min="0"
                    value={newProduct.current_stock}
                    onChange={(e) => setNewProduct({ ...newProduct, current_stock: parseInt(e.target.value) || 0 })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="minimum_stock">Minimum Stock</Label>
                  <Input
                    id="minimum_stock"
                    type="number"
                    min="0"
                    value={newProduct.minimum_stock}
                    onChange={(e) => setNewProduct({ ...newProduct, minimum_stock: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full">
                {editingProduct ? 'Update Product' : 'Add Product'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Products Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>HSN Code</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Price (₹)</TableHead>
              <TableHead>Current Stock</TableHead>
              <TableHead>Min Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => {
                const stockStatus = getStockStatus(product.current_stock, product.minimum_stock);
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        {product.description && (
                          <div className="text-sm text-muted-foreground">
                            {product.description.substring(0, 50)}
                            {product.description.length > 50 && '...'}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{product.category || 'N/A'}</TableCell>
                    <TableCell>{product.hsn_code || 'N/A'}</TableCell>
                    <TableCell>{product.unit}</TableCell>
                    <TableCell>₹{product.price.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {product.current_stock}
                        {product.current_stock <= product.minimum_stock && (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{product.minimum_stock}</TableCell>
                    <TableCell>
                      <Badge variant={stockStatus.variant}>
                        {stockStatus.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditProduct(product)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}