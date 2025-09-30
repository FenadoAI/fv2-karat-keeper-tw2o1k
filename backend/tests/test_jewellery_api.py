"""Test jewellery inventory management APIs."""

import os
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

# Add backend to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

load_dotenv(backend_dir / ".env")

API_BASE = os.getenv("TEST_API_BASE", "http://localhost:8001/api")


def test_register_and_login():
    """Test user registration and login with role-based access."""
    print("\n1. Testing user registration...")

    # Register admin user
    admin_data = {
        "username": "admin_test",
        "email": "admin@test.com",
        "password": "admin123",
        "role": "admin"
    }

    response = requests.post(f"{API_BASE}/auth/register", json=admin_data)
    print(f"Admin registration status: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        assert "access_token" in data, "Missing access_token in response"
        assert data["user"]["role"] == "admin", "Wrong role assigned"
        admin_token = data["access_token"]
        print(f"✓ Admin registered successfully: {data['user']['username']}")
    elif response.status_code == 400 and "already exists" in response.text:
        print("Admin already exists, logging in...")
        login_response = requests.post(f"{API_BASE}/auth/login", json={
            "username": admin_data["username"],
            "password": admin_data["password"]
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        admin_token = login_response.json()["access_token"]
        print("✓ Admin login successful")
    else:
        raise AssertionError(f"Registration failed: {response.text}")

    # Register manager user
    manager_data = {
        "username": "manager_test",
        "email": "manager@test.com",
        "password": "manager123",
        "role": "manager"
    }

    response = requests.post(f"{API_BASE}/auth/register", json=manager_data)
    if response.status_code == 200:
        manager_token = response.json()["access_token"]
        print(f"✓ Manager registered: {manager_data['username']}")
    elif response.status_code == 400:
        login_response = requests.post(f"{API_BASE}/auth/login", json={
            "username": manager_data["username"],
            "password": manager_data["password"]
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        manager_token = login_response.json()["access_token"]
        print("✓ Manager login successful")

    # Register salesperson user
    salesperson_data = {
        "username": "salesperson_test",
        "email": "salesperson@test.com",
        "password": "sales123",
        "role": "salesperson"
    }

    response = requests.post(f"{API_BASE}/auth/register", json=salesperson_data)
    if response.status_code == 200:
        salesperson_token = response.json()["access_token"]
        print(f"✓ Salesperson registered: {salesperson_data['username']}")
    elif response.status_code == 400:
        login_response = requests.post(f"{API_BASE}/auth/login", json={
            "username": salesperson_data["username"],
            "password": salesperson_data["password"]
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        salesperson_token = login_response.json()["access_token"]
        print("✓ Salesperson login successful")

    return admin_token, manager_token, salesperson_token


def test_metal_prices(admin_token, manager_token):
    """Test metal price management (admin only)."""
    print("\n2. Testing metal price management...")

    # Admin updates prices
    price_data = {
        "gold_price": 6500.50,
        "silver_price": 85.25,
        "platinum_price": 1200.00
    }

    response = requests.put(
        f"{API_BASE}/metal-prices",
        json=price_data,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200, f"Admin price update failed: {response.text}"
    print(f"✓ Admin updated prices: Gold={price_data['gold_price']}, Silver={price_data['silver_price']}")

    # Get prices (no auth required)
    response = requests.get(f"{API_BASE}/metal-prices")
    assert response.status_code == 200, f"Get prices failed: {response.text}"
    data = response.json()
    assert data["gold_price"] == price_data["gold_price"], "Gold price mismatch"
    assert data["silver_price"] == price_data["silver_price"], "Silver price mismatch"
    print("✓ Price retrieval successful")

    # Manager tries to update prices (should fail)
    response = requests.put(
        f"{API_BASE}/metal-prices",
        json=price_data,
        headers={"Authorization": f"Bearer {manager_token}"}
    )
    assert response.status_code == 403, "Manager should not be able to update prices"
    print("✓ Manager correctly denied price update (403)")


def test_inventory_management(admin_token, manager_token, salesperson_token):
    """Test inventory CRUD operations with role-based access."""
    print("\n3. Testing inventory management...")

    # Manager adds items
    items_to_add = [
        {
            "sku": "GN001",
            "name": "Gold Necklace",
            "metal_type": "gold",
            "weight_grams": 15.5,
            "cost_price": 95000.00,
            "description": "22K gold necklace with intricate design"
        },
        {
            "sku": "GR001",
            "name": "Gold Ring",
            "metal_type": "gold",
            "weight_grams": 8.2,
            "cost_price": 52000.00,
            "description": "18K gold engagement ring"
        },
        {
            "sku": "SB001",
            "name": "Silver Bracelet",
            "metal_type": "silver",
            "weight_grams": 25.0,
            "cost_price": 2200.00,
            "description": "Sterling silver charm bracelet"
        },
    ]

    created_items = []
    for item_data in items_to_add:
        response = requests.post(
            f"{API_BASE}/inventory",
            json=item_data,
            headers={"Authorization": f"Bearer {manager_token}"}
        )

        if response.status_code == 200:
            created_item = response.json()
            created_items.append(created_item)
            print(f"✓ Manager added item: {item_data['sku']} - {item_data['name']}")
        elif response.status_code == 400 and "already exists" in response.text:
            print(f"  Item {item_data['sku']} already exists, skipping...")
        else:
            raise AssertionError(f"Failed to add item: {response.text}")

    # Salesperson views inventory
    response = requests.get(
        f"{API_BASE}/inventory",
        headers={"Authorization": f"Bearer {salesperson_token}"}
    )
    assert response.status_code == 200, f"Salesperson view failed: {response.text}"
    items = response.json()
    assert len(items) >= 3, "Not enough items in inventory"
    print(f"✓ Salesperson viewed {len(items)} items in inventory")

    # Salesperson tries to add item (should fail)
    response = requests.post(
        f"{API_BASE}/inventory",
        json=items_to_add[0],
        headers={"Authorization": f"Bearer {salesperson_token}"}
    )
    assert response.status_code == 403, "Salesperson should not be able to add items"
    print("✓ Salesperson correctly denied item creation (403)")

    # Manager updates an item
    if created_items:
        item_id = created_items[0]["id"]
        update_data = {
            "cost_price": 98000.00,
            "description": "Updated 22K gold necklace with premium design"
        }

        response = requests.put(
            f"{API_BASE}/inventory/{item_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        assert response.status_code == 200, f"Update failed: {response.text}"
        updated_item = response.json()
        assert updated_item["cost_price"] == update_data["cost_price"], "Price not updated"
        print(f"✓ Manager updated item {item_id}: new price={update_data['cost_price']}")

    # Salesperson tries to update (should fail)
    if created_items:
        item_id = created_items[0]["id"]
        response = requests.put(
            f"{API_BASE}/inventory/{item_id}",
            json={"cost_price": 50000.00},
            headers={"Authorization": f"Bearer {salesperson_token}"}
        )
        assert response.status_code == 403, "Salesperson should not be able to update items"
        print("✓ Salesperson correctly denied item update (403)")


def test_complete_workflow():
    """Test complete workflow: register users, manage prices, manage inventory."""
    print("\n=== Jewellery Inventory API Tests ===")

    try:
        # Test authentication
        admin_token, manager_token, salesperson_token = test_register_and_login()

        # Test metal prices
        test_metal_prices(admin_token, manager_token)

        # Test inventory management
        test_inventory_management(admin_token, manager_token, salesperson_token)

        print("\n=== ✓ All Tests Passed ===")
        return True

    except AssertionError as e:
        print(f"\n✗ Test Failed: {e}")
        return False
    except Exception as e:
        print(f"\n✗ Unexpected Error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_complete_workflow()
    sys.exit(0 if success else 1)