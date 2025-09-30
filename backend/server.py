"""FastAPI server exposing AI agent endpoints."""

import logging
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

from ai_agents.agents import AgentConfig, ChatAgent, SearchAgent
from auth import (
    create_access_token,
    hash_password,
    require_role,
    security,
    verify_password,
)
from models import (
    InventoryItem,
    InventoryItemCreate,
    InventoryItemUpdate,
    MetalPrice,
    MetalPriceUpdate,
    Token,
    User,
    UserCreate,
    UserLogin,
    UserResponse,
    UserRole,
)


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent


class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


class ChatRequest(BaseModel):
    message: str
    agent_type: str = "chat"
    context: Optional[dict] = None


class ChatResponse(BaseModel):
    success: bool
    response: str
    agent_type: str
    capabilities: List[str]
    metadata: dict = Field(default_factory=dict)
    error: Optional[str] = None


class SearchRequest(BaseModel):
    query: str
    max_results: int = 5


class SearchResponse(BaseModel):
    success: bool
    query: str
    summary: str
    search_results: Optional[dict] = None
    sources_count: int
    error: Optional[str] = None


def _ensure_db(request: Request):
    try:
        return request.app.state.db
    except AttributeError as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=503, detail="Database not ready") from exc


def _get_agent_cache(request: Request) -> Dict[str, object]:
    if not hasattr(request.app.state, "agent_cache"):
        request.app.state.agent_cache = {}
    return request.app.state.agent_cache


async def _get_or_create_agent(request: Request, agent_type: str):
    cache = _get_agent_cache(request)
    if agent_type in cache:
        return cache[agent_type]

    config: AgentConfig = request.app.state.agent_config

    if agent_type == "search":
        cache[agent_type] = SearchAgent(config)
    elif agent_type == "chat":
        cache[agent_type] = ChatAgent(config)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown agent type '{agent_type}'")

    return cache[agent_type]


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_dotenv(ROOT_DIR / ".env")

    mongo_url = os.getenv("MONGO_URL")
    db_name = os.getenv("DB_NAME")

    if not mongo_url or not db_name:
        missing = [name for name, value in {"MONGO_URL": mongo_url, "DB_NAME": db_name}.items() if not value]
        raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")

    client = AsyncIOMotorClient(mongo_url)

    try:
        app.state.mongo_client = client
        app.state.db = client[db_name]
        app.state.agent_config = AgentConfig()
        app.state.agent_cache = {}
        logger.info("AI Agents API starting up")
        yield
    finally:
        client.close()
        logger.info("AI Agents API shutdown complete")


app = FastAPI(
    title="AI Agents API",
    description="Minimal AI Agents API with LangGraph and MCP support",
    lifespan=lifespan,
)

api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"message": "Hello World"}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate, request: Request):
    db = _ensure_db(request)
    status_obj = StatusCheck(**input.model_dump())
    await db.status_checks.insert_one(status_obj.model_dump())
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks(request: Request):
    db = _ensure_db(request)
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]


@api_router.post("/chat", response_model=ChatResponse)
async def chat_with_agent(chat_request: ChatRequest, request: Request):
    try:
        agent = await _get_or_create_agent(request, chat_request.agent_type)
        response = await agent.execute(chat_request.message)

        return ChatResponse(
            success=response.success,
            response=response.content,
            agent_type=chat_request.agent_type,
            capabilities=agent.get_capabilities(),
            metadata=response.metadata,
            error=response.error,
        )
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("Error in chat endpoint")
        return ChatResponse(
            success=False,
            response="",
            agent_type=chat_request.agent_type,
            capabilities=[],
            error=str(exc),
        )


@api_router.post("/search", response_model=SearchResponse)
async def search_and_summarize(search_request: SearchRequest, request: Request):
    try:
        search_agent = await _get_or_create_agent(request, "search")
        search_prompt = (
            f"Search for information about: {search_request.query}. "
            "Provide a comprehensive summary with key findings."
        )
        result = await search_agent.execute(search_prompt, use_tools=True)

        if result.success:
            metadata = result.metadata or {}
            return SearchResponse(
                success=True,
                query=search_request.query,
                summary=result.content,
                search_results=metadata,
                sources_count=int(metadata.get("tool_run_count", metadata.get("tools_used", 0)) or 0),
            )

        return SearchResponse(
            success=False,
            query=search_request.query,
            summary="",
            sources_count=0,
            error=result.error,
        )
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("Error in search endpoint")
        return SearchResponse(
            success=False,
            query=search_request.query,
            summary="",
            sources_count=0,
            error=str(exc),
        )


@api_router.get("/agents/capabilities")
async def get_agent_capabilities(request: Request):
    try:
        search_agent = await _get_or_create_agent(request, "search")
        chat_agent = await _get_or_create_agent(request, "chat")

        return {
            "success": True,
            "capabilities": {
                "search_agent": search_agent.get_capabilities(),
                "chat_agent": chat_agent.get_capabilities(),
            },
        }
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("Error getting capabilities")
        return {"success": False, "error": str(exc)}


# Authentication endpoints
@api_router.post("/auth/register", response_model=Token)
async def register(user_create: UserCreate, request: Request):
    db = _ensure_db(request)

    # Check if username exists
    existing_user = await db.users.find_one({"username": user_create.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")

    # Check if email exists
    existing_email = await db.users.find_one({"email": user_create.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists")

    # Create user
    user = User(
        username=user_create.username,
        email=user_create.email,
        hashed_password=hash_password(user_create.password),
        role=user_create.role,
    )

    await db.users.insert_one(user.model_dump())

    # Create token
    access_token = create_access_token(data={"sub": user.username, "role": user.role.value})

    return Token(
        access_token=access_token,
        user=UserResponse(**user.model_dump()),
    )


@api_router.post("/auth/login", response_model=Token)
async def login(user_login: UserLogin, request: Request):
    db = _ensure_db(request)

    # Find user
    user_data = await db.users.find_one({"username": user_login.username})
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    user = User(**user_data)

    # Verify password
    if not verify_password(user_login.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    # Create token
    access_token = create_access_token(data={"sub": user.username, "role": user.role.value})

    return Token(
        access_token=access_token,
        user=UserResponse(**user.model_dump()),
    )


@api_router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    from auth import get_current_user
    user = await get_current_user(request, credentials)
    return UserResponse(**user.model_dump())


# Metal price endpoints
@api_router.get("/metal-prices", response_model=MetalPrice)
async def get_metal_prices(request: Request):
    db = _ensure_db(request)

    # Get latest price
    price_data = await db.metal_prices.find_one(sort=[("updated_at", -1)])

    if not price_data:
        # Return default prices if none exist
        return MetalPrice(
            gold_price=0.0,
            silver_price=0.0,
            platinum_price=0.0,
            updated_by="system",
        )

    return MetalPrice(**price_data)


@api_router.put("/metal-prices", response_model=MetalPrice)
async def update_metal_prices(
    price_update: MetalPriceUpdate,
    request: Request,
    user: User = Depends(require_role(UserRole.ADMIN)),
):
    db = _ensure_db(request)

    # Create new price record
    metal_price = MetalPrice(
        gold_price=price_update.gold_price,
        silver_price=price_update.silver_price,
        platinum_price=price_update.platinum_price or 0.0,
        updated_by=user.username,
    )

    await db.metal_prices.insert_one(metal_price.model_dump())

    return metal_price


# Inventory endpoints
@api_router.get("/inventory", response_model=List[InventoryItem])
async def get_inventory(
    request: Request,
    user: User = Depends(require_role(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALESPERSON)),
):
    db = _ensure_db(request)

    items = await db.inventory_items.find().sort("created_at", -1).to_list(1000)
    return [InventoryItem(**item) for item in items]


@api_router.post("/inventory", response_model=InventoryItem)
async def create_inventory_item(
    item_create: InventoryItemCreate,
    request: Request,
    user: User = Depends(require_role(UserRole.ADMIN, UserRole.MANAGER)),
):
    db = _ensure_db(request)

    # Check if SKU exists
    existing_item = await db.inventory_items.find_one({"sku": item_create.sku})
    if existing_item:
        raise HTTPException(status_code=400, detail="SKU already exists")

    # Create item
    item = InventoryItem(
        **item_create.model_dump(),
        created_by=user.username,
    )

    await db.inventory_items.insert_one(item.model_dump())

    return item


@api_router.get("/inventory/{item_id}", response_model=InventoryItem)
async def get_inventory_item(
    item_id: str,
    request: Request,
    user: User = Depends(require_role(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALESPERSON)),
):
    db = _ensure_db(request)

    item_data = await db.inventory_items.find_one({"id": item_id})
    if not item_data:
        raise HTTPException(status_code=404, detail="Item not found")

    return InventoryItem(**item_data)


@api_router.put("/inventory/{item_id}", response_model=InventoryItem)
async def update_inventory_item(
    item_id: str,
    item_update: InventoryItemUpdate,
    request: Request,
    user: User = Depends(require_role(UserRole.ADMIN, UserRole.MANAGER)),
):
    db = _ensure_db(request)

    item_data = await db.inventory_items.find_one({"id": item_id})
    if not item_data:
        raise HTTPException(status_code=404, detail="Item not found")

    # Update fields
    update_data = {k: v for k, v in item_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)

    await db.inventory_items.update_one({"id": item_id}, {"$set": update_data})

    # Get updated item
    updated_item = await db.inventory_items.find_one({"id": item_id})
    return InventoryItem(**updated_item)


@api_router.delete("/inventory/{item_id}")
async def delete_inventory_item(
    item_id: str,
    request: Request,
    user: User = Depends(require_role(UserRole.ADMIN, UserRole.MANAGER)),
):
    db = _ensure_db(request)

    result = await db.inventory_items.delete_one({"id": item_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")

    return {"success": True, "message": "Item deleted successfully"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
