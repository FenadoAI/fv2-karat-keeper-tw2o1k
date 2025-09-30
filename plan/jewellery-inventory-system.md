# Jewellery Inventory Management System - Implementation Plan

## Requirement ID
b40461a6-03a3-4827-876e-7736c2afdaeb

## System Overview
A role-based jewellery inventory management system with:
- **Admin**: Manually update daily gold/silver prices
- **Inventory Manager**: Add/update items (SKU, metal type, weight, cost, photos)
- **Salesperson**: View inventory for sales

## Technical Implementation

### Backend (FastAPI)
1. **Database Collections**:
   - `users` (existing) - Add role field (admin, manager, salesperson)
   - `metal_prices` - Track daily gold/silver prices
   - `inventory_items` - Store jewellery items with all details

2. **API Endpoints**:
   - `POST /api/auth/register` - Register with role
   - `POST /api/auth/login` - Login and get JWT
   - `GET /api/metal-prices` - Get current prices (all roles)
   - `PUT /api/metal-prices` - Update prices (admin only)
   - `GET /api/inventory` - List all items (all roles)
   - `POST /api/inventory` - Add item (manager only)
   - `PUT /api/inventory/{id}` - Update item (manager only)
   - `DELETE /api/inventory/{id}` - Delete item (manager only)

3. **Models**:
   - User (with role enum)
   - MetalPrice (gold_price, silver_price, updated_at)
   - InventoryItem (sku, metal_type, weight, cost_price, photo_base64)

### Frontend (React)
1. **Pages**:
   - Login/Register (with role selection)
   - Dashboard (role-specific view)
   - Price Management (admin only)
   - Inventory Management (manager: full CRUD, salesperson: read-only)
   - Item Details

2. **Components**:
   - Navigation with role-based menus
   - Price display widget
   - Inventory table with search/filter
   - Item form with photo upload
   - Role-based guards

### Security
- JWT authentication with role claims
- Middleware to verify roles on protected endpoints
- Frontend route guards based on user role

## Success Criteria
✅ Admin can update gold/silver prices
✅ Inventory Manager can add 10+ items with photos
✅ Salesperson can view complete inventory
✅ Role-based access control enforced
✅ Photos stored as base64 in MongoDB
✅ Clean, modern UI with responsive design

## Implementation Steps
1. Create database models and schemas
2. Implement authentication with roles
3. Build price management APIs and UI
4. Build inventory management APIs
5. Create inventory UI with photo upload
6. Add search/filter functionality
7. Test all role-based access controls
8. Polish UI and add responsive design