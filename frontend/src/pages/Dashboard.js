import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gem, TrendingUp, Package, LogOut, Settings, Plus } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8001';
const API = `${API_BASE}/api`;

const Dashboard = () => {
  const { user, logout, getAuthHeader, isAdmin, isManager } = useAuth();
  const navigate = useNavigate();
  const [prices, setPrices] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [stats, setStats] = useState({ total: 0, goldItems: 0, silverItems: 0, totalValue: 0 });

  useEffect(() => {
    fetchPrices();
    fetchInventory();
  }, []);

  const fetchPrices = async () => {
    try {
      const response = await axios.get(`${API}/metal-prices`);
      setPrices(response.data);
    } catch (error) {
      console.error('Failed to fetch prices:', error);
    }
  };

  const fetchInventory = async () => {
    try {
      const response = await axios.get(`${API}/inventory`, {
        headers: getAuthHeader()
      });
      setInventory(response.data);
      calculateStats(response.data);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    }
  };

  const calculateStats = (items) => {
    const goldItems = items.filter(i => i.metal_type === 'gold').length;
    const silverItems = items.filter(i => i.metal_type === 'silver').length;
    const totalValue = items.reduce((sum, item) => sum + item.cost_price, 0);
    setStats({
      total: items.length,
      goldItems,
      silverItems,
      totalValue
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'manager': return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'salesperson': return 'bg-green-100 text-green-800 hover:bg-green-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-lg">
                <Gem className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Jewellery Inventory</h1>
                <p className="text-xs text-gray-500">Management System</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right mr-3">
                <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                <Badge className={getRoleBadgeColor(user?.role)}>
                  {user?.role?.toUpperCase()}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardDescription>Total Items</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
            <CardContent>
              <Package className="h-4 w-4 text-blue-500" />
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="pb-2">
              <CardDescription>Gold Items</CardDescription>
              <CardTitle className="text-3xl">{stats.goldItems}</CardTitle>
            </CardHeader>
            <CardContent>
              <Gem className="h-4 w-4 text-yellow-500" />
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-gray-400">
            <CardHeader className="pb-2">
              <CardDescription>Silver Items</CardDescription>
              <CardTitle className="text-3xl">{stats.silverItems}</CardTitle>
            </CardHeader>
            <CardContent>
              <Gem className="h-4 w-4 text-gray-400" />
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardDescription>Total Value</CardDescription>
              <CardTitle className="text-3xl">₹{stats.totalValue.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardContent>
          </Card>
        </div>

        {/* Current Prices */}
        {prices && (
          <Card className="mb-8 bg-gradient-to-r from-amber-50 to-yellow-50">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Current Metal Prices</CardTitle>
                  <CardDescription>
                    Last updated: {new Date(prices.updated_at).toLocaleString()}
                  </CardDescription>
                </div>
                {isAdmin && (
                  <Button
                    onClick={() => navigate('/price-management')}
                    className="bg-gradient-to-r from-amber-500 to-yellow-600"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Update Prices
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3 p-4 bg-white rounded-lg">
                  <div className="p-2 bg-yellow-100 rounded-full">
                    <Gem className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Gold</p>
                    <p className="text-xl font-bold">₹{prices.gold_price.toLocaleString()}/g</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-white rounded-lg">
                  <div className="p-2 bg-gray-100 rounded-full">
                    <Gem className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Silver</p>
                    <p className="text-xl font-bold">₹{prices.silver_price.toLocaleString()}/g</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-white rounded-lg">
                  <div className="p-2 bg-slate-100 rounded-full">
                    <Gem className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Platinum</p>
                    <p className="text-xl font-bold">₹{prices.platinum_price.toLocaleString()}/g</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Quick Actions</CardTitle>
              {isManager && (
                <Button
                  onClick={() => navigate('/inventory')}
                  className="bg-gradient-to-r from-amber-500 to-yellow-600"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center"
                onClick={() => navigate('/inventory')}
              >
                <Package className="h-6 w-6 mb-2" />
                <span>View Inventory</span>
              </Button>

              {isAdmin && (
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center"
                  onClick={() => navigate('/price-management')}
                >
                  <TrendingUp className="h-6 w-6 mb-2" />
                  <span>Manage Prices</span>
                </Button>
              )}

              {isManager && (
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center"
                  onClick={() => navigate('/inventory')}
                >
                  <Plus className="h-6 w-6 mb-2" />
                  <span>Add New Item</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;