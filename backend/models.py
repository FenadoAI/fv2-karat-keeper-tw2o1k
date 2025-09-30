"""Database models for jewellery inventory system."""

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class UserRole(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    SALESPERSON = "salesperson"


class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    hashed_password: str
    role: UserRole
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: UserRole


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    role: UserRole
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class MetalType(str, Enum):
    GOLD = "gold"
    SILVER = "silver"
    PLATINUM = "platinum"


class MetalPrice(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    gold_price: float
    silver_price: float
    platinum_price: float = 0.0
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_by: str  # username


class MetalPriceUpdate(BaseModel):
    gold_price: float
    silver_price: float
    platinum_price: Optional[float] = 0.0


class InventoryItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sku: str
    name: str
    metal_type: MetalType
    weight_grams: float
    cost_price: float
    photo_base64: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str  # username


class InventoryItemCreate(BaseModel):
    sku: str
    name: str
    metal_type: MetalType
    weight_grams: float
    cost_price: float
    photo_base64: Optional[str] = None
    description: Optional[str] = None


class InventoryItemUpdate(BaseModel):
    name: Optional[str] = None
    metal_type: Optional[MetalType] = None
    weight_grams: Optional[float] = None
    cost_price: Optional[float] = None
    photo_base64: Optional[str] = None
    description: Optional[str] = None