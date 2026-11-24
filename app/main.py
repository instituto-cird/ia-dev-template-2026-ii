# app/main.py
import os
import time
from typing import Any, Literal

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app import repository
from app.llm_client import HttpLLMClient, LLMUnavailableError

# Carga variables de entorno desde .env (no falla si .env no existe)
load_dotenv()

# Metadatos para la documentación automática (OpenAPI)
app = FastAPI(
    title="AI Diplomado API",
    description="API Backend para el Diplomado de IA Aplicada a Ingeniería de Software",
    version="0.1.0",
)

# Configuración de CORS — orígenes explícitos para no romper el spec de browsers.
# El spec CORS prohíbe `allow_origins=["*"]` cuando `allow_credentials=True`.
# Si necesitás agregar otro frontend, sumalo a esta lista o usá CORS_ORIGINS en .env.
_default_origins = [
    "http://localhost:8501",   # Streamlit frontend
    "http://localhost:3000",   # React/Vite dev server (si lo usás)
    "http://localhost:5173",   # Vite default
    "http://127.0.0.1:8501",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]
_env_origins = os.getenv("CORS_ORIGINS", "")
_origins = [o.strip() for o in _env_origins.split(",") if o.strip()] or _default_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# --- Modelos (Pydantic) ---
class HealthResponse(BaseModel):
    """
    Esquema de respuesta del health check.

    Nota pedagógica: usamos `min_length=1` para mostrar el patrón de
    validación con Pydantic Field. Un string vacío en un health check
    es señal de que algo se rompió en la serialización — preferimos
    fallar fuerte que reportar "status OK" con valor vacío.
    """

    status: str = Field(min_length=1)
    version: str = Field(min_length=1, pattern=r"^\d+\.\d+\.\d+$")
    module: str = Field(min_length=1)


# --- Endpoints ---
@app.get("/", tags=["General"])
async def root() -> dict[str, str]:
    """Endpoint raíz para verificar que la API respira."""
    return {"message": "Bienvenido a la API del Diplomado AI"}


@app.get("/health", response_model=HealthResponse, tags=["Ops"])
async def health_check() -> HealthResponse:
    """Health check estándar para monitoreo."""
    return HealthResponse(
        status="ok",
        version="0.1.0",
        module="System",
    )


# --- API para el frontend React (web/) ---
api = APIRouter(prefix="/api")


class Merchant(BaseModel):
    merchant_id: str
    name: str
    category: str
    status: str
    daily_limit_usd: float
    monthly_volume_usd: float
    risk_level: Literal["low", "medium", "high"]
    pci_compliant: bool
    onboarded_at: str
    avg_transaction_7d_usd: float
    suspension_reason: str | None = None


class Transaction(BaseModel):
    transaction_id: str
    merchant_id: str
    amount_usd: float
    timestamp: str
    status: str
    flag_reason: str | None = None
    incident_ref: str | None = None


class MerchantDetail(Merchant):
    transactions: list[Transaction]


class LLMStatus(BaseModel):
    mode: Literal["mock", "real"]
    base_url: str
    reachable: bool


class StatusResponse(BaseModel):
    backend: Literal["ok"] = "ok"
    version: str
    llm: LLMStatus


class ToolInfo(BaseModel):
    name: str
    description: str
    requires_approval: bool = False


class AgentRequest(BaseModel):
    goal: str = Field(min_length=1, max_length=500)


class AgentStepOut(BaseModel):
    step: int
    thought: str
    action: str
    action_input: dict[str, Any]
    observation: str


class AgentRunResponse(BaseModel):
    goal: str
    answer: str
    steps: list[AgentStepOut]
    approved: bool
    total_steps: int
    duration_ms: int


@api.get("/status", response_model=StatusResponse, tags=["Ops"])
def status() -> StatusResponse:
    """Estado del backend y del servicio LLM que usa el agente."""
    client = HttpLLMClient()
    try:
        reachable = client.ping()
    finally:
        client.close()
    mock = os.getenv("MOCK_MODE", "true").lower() == "true"
    return StatusResponse(
        version="0.1.0",
        llm=LLMStatus(mode="mock" if mock else "real", base_url=client.base_url, reachable=reachable),
    )


@api.get("/merchants", response_model=list[Merchant], tags=["Merchants"])
def merchants() -> list[dict[str, Any]]:
    """Lista de comercios de LegacyPay."""
    return repository.list_merchants()


@api.get("/merchants/{merchant_id}", response_model=MerchantDetail, tags=["Merchants"])
def merchant_detail(merchant_id: str) -> dict[str, Any]:
    """Un comercio con sus transacciones."""
    merchant = repository.get_merchant(merchant_id)
    if merchant is None:
        raise HTTPException(status_code=404, detail=f"Comercio {merchant_id} no encontrado")
    return {**merchant, "transactions": repository.list_transactions(merchant_id=merchant_id)}


@api.get("/transactions", response_model=list[Transaction], tags=["Transactions"])
def transactions(
    status: str | None = Query(default=None, description="approved | flagged"),
    merchant_id: str | None = None,
) -> list[dict[str, Any]]:
    """Transacciones de muestra, las más recientes primero."""
    return repository.list_transactions(merchant_id=merchant_id, status=status)


@api.get("/agent/tools", response_model=list[ToolInfo], tags=["Agent"])
def agent_tools() -> list[ToolInfo]:
    """Herramientas registradas en el agente ReAct."""
    from agent.core import ACTIONS_REQUIRING_APPROVAL, TOOL_REGISTRY

    tools = [
        ToolInfo(name=name, description=(fn.__doc__ or "").strip().splitlines()[0])
        for name, fn in TOOL_REGISTRY.items()
    ]
    tools += [
        ToolInfo(name=name, description="Requiere aprobación de un operador", requires_approval=True)
        for name in sorted(ACTIONS_REQUIRING_APPROVAL)
    ]
    return tools


@api.post("/agent/run", response_model=AgentRunResponse, tags=["Agent"])
def agent_run(request: AgentRequest) -> dict[str, Any]:
    """Ejecuta el ciclo ReAct para un objetivo en lenguaje natural."""
    from agent.core import run_agent

    client = HttpLLMClient()
    start = time.perf_counter()
    try:
        result = run_agent(request.goal.strip(), client)
    except LLMUnavailableError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    finally:
        client.close()
    return {**result.to_dict(), "duration_ms": int((time.perf_counter() - start) * 1000)}


app.include_router(api)
