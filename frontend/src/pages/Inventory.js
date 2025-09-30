import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Search, Edit, Trash2, Upload, Image as ImageIcon, Gem } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8001';
const API = `${API_BASE}/api`;

const Inventory = () => {
  const { getAuthHeader, isManager } = useAuth();
  const navigate = useNavigate();
  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    metal_type: '',
    weight_grams: '',
    cost_price: '',
    description: '',
    photo_base64: ''
  });

  const [photoPreview, setPhotoPreview] = useState('');

  useEffect(() => {
    fetchInventory();
  }, []);

  useEffect(() => {
    const filtered = inventory.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.metal_type.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredInventory(filtered);
  }, [searchTerm, inventory]);

  const fetchInventory = async () => {
    try {
      const response = await axios.get(`${API}/inventory`, {
        headers: getAuthHeader()
      });
      setInventory(response.data);
      setFilteredInventory(response.data);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
      setError('Failed to load inventory');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setPhotoPreview(base64String);
        setFormData({ ...formData, photo_base64: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await axios.post(
        `${API}/inventory`,
        {
          ...formData,
          weight_grams: parseFloat(formData.weight_grams),
          cost_price: parseFloat(formData.cost_price)
        },
        { headers: getAuthHeader() }
      );

      setSuccess('Item added successfully!');
      setShowAddDialog(false);
      resetForm();
      fetchInventory();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      await axios.delete(`${API}/inventory/${itemId}`, {
        headers: getAuthHeader()
      });
      setSuccess('Item deleted successfully!');
      fetchInventory();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete item');
    }
  };

  const resetForm = () => {
    setFormData({
      sku: '',
      name: '',
      metal_type: '',
      weight_grams: '',
      cost_price: '',
      description: '',
      photo_base64: ''
    });
    setPhotoPreview('');
  };

  const getMetalBadgeColor = (metalType) => {
    switch (metalType) {
      case 'gold': return 'bg-yellow-100 text-yellow-800';
      case 'silver': return 'bg-gray-100 text-gray-800';
      case 'platinum': return 'bg-slate-100 text-slate-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-lg">
                  <Gem className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Inventory Management</h1>
                  <p className="text-xs text-gray-500">{inventory.length} items in stock</p>
                </div>
              </div>
            </div>
            {isManager && (
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-amber-500 to-yellow-600">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Inventory Item</DialogTitle>
                    <DialogDescription>
                      Fill in the details for the new jewellery item
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="sku">SKU *</Label>
                        <Input
                          id="sku"
                          placeholder="e.g., GN001"
                          value={formData.sku}
                          onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="name">Item Name *</Label>
                        <Input
                          id="name"
                          placeholder="e.g., Gold Necklace"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="metal_type">Metal Type *</Label>
                        <Select
                          value={formData.metal_type}
                          onValueChange={(value) => setFormData({ ...formData, metal_type: value })}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select metal" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gold">Gold</SelectItem>
                            <SelectItem value="silver">Silver</SelectItem>
                            <SelectItem value="platinum">Platinum</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="weight">Weight (grams) *</Label>
                        <Input
                          id="weight"
                          type="number"
                          step="0.01"
                          placeholder="e.g., 15.5"
                          value={formData.weight_grams}
                          onChange={(e) => setFormData({ ...formData, weight_grams: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cost">Cost Price (₹) *</Label>
                      <Input
                        id="cost"
                        type="number"
                        step="0.01"
                        placeholder="e.g., 95000"
                        value={formData.cost_price}
                        onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Enter item description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="photo">Photo</Label>
                      <div className="flex items-center space-x-4">
                        <Input
                          id="photo"
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="flex-1"
                        />
                        {photoPreview && (
                          <img
                            src={photoPreview}
                            alt="Preview"
                            className="w-16 h-16 object-cover rounded-lg border"
                          />
                        )}
                      </div>
                      <p className="text-xs text-gray-500">Max size: 5MB. Supported formats: JPG, PNG</p>
                    </div>

                    <div className="flex space-x-4">
                      <Button
                        type="submit"
                        className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-600"
                        disabled={loading}
                      >
                        {loading ? 'Adding...' : 'Add Item'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowAddDialog(false);
                          resetForm();
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {success && (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {error && !showAddDialog && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Search Bar */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by SKU, name, or metal type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Inventory Table */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory Items</CardTitle>
            <CardDescription>
              {filteredInventory.length} items displayed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Photo</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Metal</TableHead>
                    <TableHead>Weight (g)</TableHead>
                    <TableHead>Cost Price</TableHead>
                    <TableHead>Created By</TableHead>
                    {isManager && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isManager ? 8 : 7} className="text-center py-8 text-gray-500">
                        No items found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInventory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {item.photo_base64 ? (
                            <img
                              src={item.photo_base64}
                              alt={item.name}
                              className="w-12 h-12 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                              <ImageIcon className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          <Badge className={getMetalBadgeColor(item.metal_type)}>
                            {item.metal_type.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.weight_grams.toFixed(2)}</TableCell>
                        <TableCell>₹{item.cost_price.toLocaleString()}</TableCell>
                        <TableCell className="text-sm text-gray-600">{item.created_by}</TableCell>
                        {isManager && (
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(item.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Inventory;