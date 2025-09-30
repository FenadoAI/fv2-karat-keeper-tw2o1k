import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Save, Gem } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8001';
const API = `${API_BASE}/api`;

const PriceManagement = () => {
  const { getAuthHeader, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [goldPrice, setGoldPrice] = useState('');
  const [silverPrice, setSilverPrice] = useState('');
  const [platinumPrice, setPlatinumPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [currentPrices, setCurrentPrices] = useState(null);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchCurrentPrices();
  }, [isAdmin]);

  const fetchCurrentPrices = async () => {
    try {
      const response = await axios.get(`${API}/metal-prices`);
      const prices = response.data;
      setCurrentPrices(prices);
      setGoldPrice(prices.gold_price.toString());
      setSilverPrice(prices.silver_price.toString());
      setPlatinumPrice(prices.platinum_price.toString());
    } catch (error) {
      console.error('Failed to fetch prices:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await axios.put(
        `${API}/metal-prices`,
        {
          gold_price: parseFloat(goldPrice),
          silver_price: parseFloat(silverPrice),
          platinum_price: parseFloat(platinumPrice)
        },
        { headers: getAuthHeader() }
      );

      setSuccess('Prices updated successfully!');
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update prices');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 space-x-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-lg">
                <Gem className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Price Management</h1>
                <p className="text-xs text-gray-500">Update daily metal prices</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentPrices && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg">Current Prices</CardTitle>
              <CardDescription>
                Last updated: {new Date(currentPrices.updated_at).toLocaleString()} by {currentPrices.updated_by}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Gold</p>
                  <p className="text-xl font-bold text-yellow-600">₹{currentPrices.gold_price.toLocaleString()}/g</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Silver</p>
                  <p className="text-xl font-bold text-gray-600">₹{currentPrices.silver_price.toLocaleString()}/g</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Platinum</p>
                  <p className="text-xl font-bold text-slate-600">₹{currentPrices.platinum_price.toLocaleString()}/g</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Update Metal Prices</CardTitle>
            <CardDescription>
              Enter new prices per gram in Indian Rupees (₹)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {success && (
                <Alert className="bg-green-50 border-green-200">
                  <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="goldPrice" className="flex items-center space-x-2">
                  <Gem className="h-4 w-4 text-yellow-600" />
                  <span>Gold Price (per gram)</span>
                </Label>
                <Input
                  id="goldPrice"
                  type="number"
                  step="0.01"
                  placeholder="Enter gold price"
                  value={goldPrice}
                  onChange={(e) => setGoldPrice(e.target.value)}
                  required
                  disabled={loading}
                  className="text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="silverPrice" className="flex items-center space-x-2">
                  <Gem className="h-4 w-4 text-gray-600" />
                  <span>Silver Price (per gram)</span>
                </Label>
                <Input
                  id="silverPrice"
                  type="number"
                  step="0.01"
                  placeholder="Enter silver price"
                  value={silverPrice}
                  onChange={(e) => setSilverPrice(e.target.value)}
                  required
                  disabled={loading}
                  className="text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="platinumPrice" className="flex items-center space-x-2">
                  <Gem className="h-4 w-4 text-slate-600" />
                  <span>Platinum Price (per gram)</span>
                </Label>
                <Input
                  id="platinumPrice"
                  type="number"
                  step="0.01"
                  placeholder="Enter platinum price"
                  value={platinumPrice}
                  onChange={(e) => setPlatinumPrice(e.target.value)}
                  required
                  disabled={loading}
                  className="text-lg"
                />
              </div>

              <div className="flex space-x-4">
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700"
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Updating...' : 'Update Prices'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PriceManagement;