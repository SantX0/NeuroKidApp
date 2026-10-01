"""NeuroKid backend — parental cognitive protection telemetry & curation API."""

import logging
import os
import random
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Annotated, Any, Dict, List, Optional

import bcrypt
import httpx
import jwt
from bson import ObjectId
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, BeforeValidator, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("neurokid")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
JWT_MINUTES = int(os.environ["JWT_EXPIRE_MINUTES"])
EMERGENT_LLM_KEY = os.environ["EMERGENT_LLM_KEY"]

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

bearer = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------- mongo base
def _to_str_id(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return str(value)
    return value


PyObjectId = Annotated[str, BeforeValidator(_to_str_id)]


class BaseDocument(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    model_config = {"populate_by_name": True, "arbitrary_types_allowed": True}

    def to_mongo(self) -> Dict[str, Any]:
        data = self.model_dump(by_alias=True, exclude_none=True)
        data.pop("_id", None)
        return data

    @classmethod
    def from_mongo(cls, doc: Dict[str, Any]):
        if doc is None:
            return None
        return cls.model_validate(doc)


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


# --------------------------------------------------------------------- models
AGE_BRACKETS = {
    "toddler": {"label": "Bebês", "range": "2-4", "max_minutes": 60, "max_cuts": 3},
    "explorer": {"label": "Exploradores", "range": "5-8", "max_minutes": 120, "max_cuts": 5},
    "preteen": {"label": "Pré-adolescentes", "range": "9-12", "max_minutes": 180, "max_cuts": 8},
}


def bracket_for_age(age: int) -> str:
    if age <= 4:
        return "toddler"
    if age <= 8:
        return "explorer"
    return "preteen"


class Parent(BaseDocument):
    email: EmailStr
    name: str
    password_hash: Optional[str] = None
    picture: Optional[str] = None
    provider: str = "password"
    created_at: datetime = Field(default_factory=now_utc)


class Child(BaseDocument):
    parent_id: str
    name: str
    age: int
    bracket: str
    avatar_color: str
    device: str
    shield_active: bool = True
    daily_limit_minutes: int
    allowed_content: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=now_utc)


class ContentItem(BaseDocument):
    title: str
    subtitle: str
    thumbnail: str
    duration_minutes: int
    cuts_per_minute: float
    pacing: str
    audio_note: str
    age_brackets: List[str]
    stimulus_badges: List[str]
    ai_verdict: str
    ai_reason: str
    color_profile: str
    flash_stimuli: bool = False


class Alert(BaseDocument):
    child_id: str
    kind: str  # auto_interruption | attention_transition | digest
    title: str
    message: str
    action: str
    severity: str  # critical | moderate | calm
    at: datetime
    cleared: bool = False


class TelemetrySample(BaseDocument):
    child_id: str
    at: datetime
    minutes: int
    sensory_load: float  # 0..100
    cuts_per_minute: float
    intercepted: bool = False


# --------------------------------------------------------------- auth helpers
class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ParentOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    picture: Optional[str] = None
    provider: str = "password"


def parent_out(parent: Parent) -> "ParentOut":
    return ParentOut(
        id=parent.id,
        name=parent.name,
        email=parent.email,
        picture=parent.picture,
        provider=parent.provider,
    )


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    parent: ParentOut


def hash_password(raw: str) -> str:
    return bcrypt.hashpw(raw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(raw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(raw.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def make_token(parent_id: str) -> str:
    issued = now_utc()
    payload = {
        "sub": parent_id,
        "role": "parent",
        "iat": issued,
        "exp": issued + timedelta(minutes=JWT_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def parent_from_session_token(token: str) -> Optional[str]:
    """Emergent-managed Google sessions live in `user_sessions`, not in a JWT."""
    row = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not row:
        return None
    expires_at = row["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < now_utc():
        await db.user_sessions.delete_one({"session_token": token})
        return None
    return row["parent_id"]


async def current_parent(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
) -> Parent:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")

    raw = credentials.credentials
    parent_id: Optional[str] = None
    try:
        payload = jwt.decode(raw, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("role") == "parent":
            parent_id = payload.get("sub")
    except Exception:
        parent_id = await parent_from_session_token(raw)

    if not parent_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    if not ObjectId.is_valid(parent_id):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token subject")
    doc = await db.parents.find_one({"_id": ObjectId(parent_id)})
    if not doc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Parent no longer exists")
    return Parent.from_mongo(doc)


async def owned_child(child_id: str, parent: Parent) -> Child:
    if not ObjectId.is_valid(child_id):
        raise HTTPException(404, "Child not found")
    doc = await db.children.find_one(
        {"_id": ObjectId(child_id), "parent_id": parent.id}
    )
    if not doc:
        raise HTTPException(404, "Child not found")
    return Child.from_mongo(doc)


# ------------------------------------------------------------------- seeding
DEMO_EMAIL = "parent@neurokid.app"
DEMO_PASSWORD = "NeuroKid2026!"
SEED_VERSION = 2  # incrementar sempre que os dados semeados mudarem de idioma/conteúdo

SEED_CONTENT: List[Dict[str, Any]] = [
    {
        "title": "Contos da Floresta",
        "subtitle": "Temporada 1 • histórias calmas da mata",
        "thumbnail": "https://images.unsplash.com/photo-1648824156751-b994ece57a10?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1ODh8MHwxfHNlYXJjaHwxfHxmb3Jlc3QlMjB0YWxlcyUyMGlsbHVzdHJhdGlvbnxlbnwwfHx8fDE3ODcyNzQ3ODF8MA&ixlib=rb-4.1.0&q=85",
        "duration_minutes": 18,
        "cuts_per_minute": 2.0,
        "pacing": "Lento e deliberado",
        "audio_note": "Áudio natural calmante, sem efeitos bruscos",
        "age_brackets": ["toddler", "explorer"],
        "stimulus_badges": ["Linguagem", "Calma emocional"],
        "ai_verdict": "approved",
        "ai_reason": "O ritmo fica em 2 cortes de cena por minuto, a narração não tem pressa e a paleta usa verdes naturais, sem nenhum estímulo de flash.",
        "color_profile": "Tons terrosos naturais",
        "flash_stimuli": False,
    },
    {
        "title": "Pequeno Carpinteiro",
        "subtitle": "Trabalho manual real com um adulto",
        "thumbnail": "https://images.pexels.com/photos/32795058/pexels-photo-32795058.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "duration_minutes": 12,
        "cuts_per_minute": 1.6,
        "pacing": "Lento e deliberado",
        "audio_note": "Sons reais da oficina, sem trilha sonora",
        "age_brackets": ["explorer", "preteen"],
        "stimulus_badges": ["Construção de foco", "Coordenação fina"],
        "ai_verdict": "approved",
        "ai_reason": "Planos longos e sem corte deixam a atenção assentar; as mãos permanecem em quadro, então a criança acompanha uma ação do início ao fim.",
        "color_profile": "Neutros de madeira",
        "flash_stimuli": False,
    },
    {
        "title": "Exploradores da Geometria",
        "subtitle": "Episódio 4 • construindo pontes com formas",
        "thumbnail": "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?crop=entropy&cs=srgb&fm=jpg&q=85&w=940",
        "duration_minutes": 14,
        "cuts_per_minute": 3.4,
        "pacing": "Lento e deliberado",
        "audio_note": "Fundo ambiente suave sob a narração",
        "age_brackets": ["explorer", "preteen"],
        "stimulus_badges": ["Raciocínio espacial", "Calma emocional"],
        "ai_verdict": "approved",
        "ai_reason": "Ritmo abaixo de 4 cortes de cena por minuto, cores naturais e zero estímulos de flash.",
        "color_profile": "Cores primárias suaves",
        "flash_stimuli": False,
    },
    {
        "title": "Canções do Jardim do Céu",
        "subtitle": "Seleção para a hora de dormir",
        "thumbnail": "https://images.pexels.com/photos/6951647/pexels-photo-6951647.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "duration_minutes": 22,
        "cuts_per_minute": 0.8,
        "pacing": "Quase estático",
        "audio_note": "Um só instrumento, com fade gradual",
        "age_brackets": ["toddler", "explorer", "preteen"],
        "stimulus_badges": ["Calma emocional", "Preparo para o sono"],
        "ai_verdict": "approved",
        "ai_reason": "Menos de um corte por minuto e curva de áudio descendente — ideal como substituição durante um Soft Landing.",
        "color_profile": "Azuis do crepúsculo e creme",
        "flash_stimuli": False,
    },
    {
        "title": "Ateliê de Argila",
        "subtitle": "Modelagem sensorial, um pote por vez",
        "thumbnail": "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?crop=entropy&cs=srgb&fm=jpg&q=85&w=940",
        "duration_minutes": 16,
        "cuts_per_minute": 2.2,
        "pacing": "Lento e deliberado",
        "audio_note": "Argila úmida e um cantarolar baixo",
        "age_brackets": ["toddler", "explorer"],
        "stimulus_badges": ["Coordenação fina", "Construção de foco"],
        "ai_verdict": "approved",
        "ai_reason": "A câmera mantém o mesmo quadro por longos trechos, permitindo que a criança antecipe o que vem em seguida em vez de perseguir cortes.",
        "color_profile": "Terracota e linho",
        "flash_stimuli": False,
    },
    {
        "title": "Observadores da Maré",
        "subtitle": "Caminhadas de descoberta no litoral",
        "thumbnail": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?crop=entropy&cs=srgb&fm=jpg&q=85&w=940",
        "duration_minutes": 20,
        "cuts_per_minute": 2.6,
        "pacing": "Lento e deliberado",
        "audio_note": "Ondas e conversa sem roteiro",
        "age_brackets": ["explorer", "preteen"],
        "stimulus_badges": ["Curiosidade", "Raciocínio espacial"],
        "ai_verdict": "approved",
        "ai_reason": "Luz natural, observação em tempo real e ausência de edição em laço de recompensa mantêm a carga cognitiva na faixa equilibrada.",
        "color_profile": "Verdes do mar",
        "flash_stimuli": False,
    },
]

SEED_CHILDREN = [
    {"name": "Leo", "age": 5, "avatar_color": "#1B7A82", "device": "Tablet"},
    {"name": "Mia", "age": 3, "avatar_color": "#2A9D8F", "device": "Celular"},
    {"name": "Nina", "age": 10, "avatar_color": "#E9C46A", "device": "Tablet"},
]

ALERT_TEMPLATES = [
    {
        "kind": "auto_interruption",
        "severity": "critical",
        "title": "Interrupção automática",
        "message": "Hiperestimulação detectada em um vídeo acelerado ({cuts} cortes/min).",
        "action": "A tela entrou em Soft Landing de 12s com suavidade.",
    },
    {
        "kind": "attention_transition",
        "severity": "moderate",
        "title": "Transição de atenção",
        "message": "Ciclo de atenção se fechando (limite de {minutes}min atingido).",
        "action": "Sugestão: proponha uma atividade física de transição.",
    },
    {
        "kind": "digest",
        "severity": "calm",
        "title": "Resumo de Descanso",
        "message": "Os picos sensoriais leves ficaram dentro da faixa segura toda a tarde.",
        "action": "Nenhuma ação necessária — o equilíbrio se manteve.",
    },
]


async def migrate_seed_language() -> None:
    """Regenera o conteúdo semeado quando a versão muda (ex.: tradução pt-BR)."""
    meta = await db.meta.find_one({"_id": "seed"})
    if meta and meta.get("version") == SEED_VERSION:
        return

    await db.content.delete_many({})
    await db.alerts.delete_many({})
    await db.telemetry.delete_many({})
    await db.content.insert_many(
        [ContentItem(**item).to_mongo() for item in SEED_CONTENT]
    )
    await db.children.update_many({"device": "Phone"}, {"$set": {"device": "Celular"}})

    docs = await db.children.find({}).to_list(500)
    for doc in docs:
        child = Child.from_mongo(doc)
        await db.children.update_one(
            {"_id": ObjectId(child.id)}, {"$set": {"allowed_content": []}}
        )
        await seed_child_history(child.id, child.bracket)

    await db.meta.update_one(
        {"_id": "seed"}, {"$set": {"version": SEED_VERSION}}, upsert=True
    )
    logger.info("seed migrated to version %s (pt-BR)", SEED_VERSION)


async def seed_database() -> None:
    if await db.content.count_documents({}) == 0:
        await db.content.insert_many(
            [ContentItem(**item).to_mongo() for item in SEED_CONTENT]
        )
        logger.info("seeded slow content library")

    parent_doc = await db.parents.find_one({"email": DEMO_EMAIL})
    if not parent_doc:
        parent = Parent(
            email=DEMO_EMAIL,
            name="Ana Ribeiro",
            password_hash=hash_password(DEMO_PASSWORD),
        )
        result = await db.parents.insert_one(parent.to_mongo())
        parent_id = str(result.inserted_id)
        logger.info("seeded demo parent %s", DEMO_EMAIL)
    else:
        parent_id = str(parent_doc["_id"])

    if await db.children.count_documents({"parent_id": parent_id}) == 0:
        for spec in SEED_CHILDREN:
            bracket = bracket_for_age(spec["age"])
            child = Child(
                parent_id=parent_id,
                bracket=bracket,
                daily_limit_minutes=AGE_BRACKETS[bracket]["max_minutes"],
                **spec,
            )
            result = await db.children.insert_one(child.to_mongo())
            await seed_child_history(str(result.inserted_id), bracket)
        logger.info("seeded children + telemetry history")


async def ensure_starter_child(parent_id: str) -> None:
    """Every new parent lands on a dashboard with real data, never an empty shell."""
    if await db.children.count_documents({"parent_id": parent_id}) > 0:
        return
    spec = SEED_CHILDREN[0]
    bracket = bracket_for_age(spec["age"])
    child = Child(
        parent_id=parent_id,
        bracket=bracket,
        daily_limit_minutes=AGE_BRACKETS[bracket]["max_minutes"],
        **spec,
    )
    result = await db.children.insert_one(child.to_mongo())
    await seed_child_history(str(result.inserted_id), bracket)


async def ensure_today_activity() -> None:
    """Top up today's telemetry so the dashboard always reflects a live day."""
    now = now_utc()
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    docs = await db.children.find({}).to_list(200)
    for doc in docs:
        child = Child.from_mongo(doc)
        existing = await db.telemetry.count_documents(
            {"child_id": child.id, "at": {"$gte": start}}
        )
        if existing >= 3:
            continue
        rng = random.Random(f"{child.id}-{start.date().isoformat()}")
        samples: List[Dict[str, Any]] = []
        alerts: List[Dict[str, Any]] = []
        for step in range(4):
            at = now - timedelta(hours=4 - step, minutes=rng.randint(0, 40))
            if at < start:
                at = start + timedelta(hours=step, minutes=rng.randint(0, 40))
            spike = step == 2
            load = min(94.0, rng.uniform(24, 44) + (36 if spike else 0))
            cuts = round(1.2 + load / 14, 1)
            samples.append(
                TelemetrySample(
                    child_id=child.id,
                    at=at,
                    minutes=rng.randint(9, 24),
                    sensory_load=round(load, 1),
                    cuts_per_minute=cuts,
                    intercepted=spike,
                ).to_mongo()
            )
            if spike:
                alerts.append(
                    Alert(
                        child_id=child.id,
                        kind="auto_interruption",
                        severity="critical",
                        title="Interrupção automática",
                        message=f"Hiperestimulação detectada em um vídeo acelerado ({cuts} cortes/min).",
                        action="A tela entrou em Soft Landing de 12s com suavidade.",
                        at=at,
                    ).to_mongo()
                )
            elif step == 3:
                alerts.append(
                    Alert(
                        child_id=child.id,
                        kind="attention_transition",
                        severity="moderate",
                        title="Transição de atenção",
                        message="Ciclo de atenção se fechando (limite de 35min atingido).",
                        action="Sugestão: proponha uma atividade física de transição.",
                        at=at,
                    ).to_mongo()
                )
        if samples:
            await db.telemetry.insert_many(samples)
        if alerts:
            await db.alerts.insert_many(alerts)


async def seed_child_history(child_id: str, bracket: str) -> None:
    rng = random.Random(child_id)
    samples: List[Dict[str, Any]] = []
    alerts: List[Dict[str, Any]] = []
    today = now_utc().replace(minute=0, second=0, microsecond=0)

    for day_offset in range(6, -1, -1):
        day = today - timedelta(days=day_offset)
        active_hours = sorted(rng.sample(range(8, 20), rng.randint(4, 7)))
        for hour in active_hours:
            at = day.replace(hour=hour)
            if at > now_utc():
                continue
            base = rng.uniform(18, 46)
            spike = rng.random() < 0.18
            load = min(96.0, base + (rng.uniform(28, 44) if spike else 0))
            cuts = round(1.2 + load / 14, 1)
            samples.append(
                TelemetrySample(
                    child_id=child_id,
                    at=at,
                    minutes=rng.randint(8, 26),
                    sensory_load=round(load, 1),
                    cuts_per_minute=cuts,
                    intercepted=spike,
                ).to_mongo()
            )
            if spike:
                template = ALERT_TEMPLATES[0]
                alerts.append(
                    Alert(
                        child_id=child_id,
                        kind=template["kind"],
                        severity=template["severity"],
                        title=template["title"],
                        message=template["message"].format(cuts=cuts),
                        action=template["action"],
                        at=at,
                    ).to_mongo()
                )
            elif rng.random() < 0.14:
                template = ALERT_TEMPLATES[1]
                alerts.append(
                    Alert(
                        child_id=child_id,
                        kind=template["kind"],
                        severity=template["severity"],
                        title=template["title"],
                        message=template["message"].format(minutes=35),
                        action=template["action"],
                        at=at,
                    ).to_mongo()
                )
        if day_offset > 0 and rng.random() < 0.5:
            template = ALERT_TEMPLATES[2]
            alerts.append(
                Alert(
                    child_id=child_id,
                    kind=template["kind"],
                    severity=template["severity"],
                    title=template["title"],
                    message=template["message"],
                    action=template["action"],
                    at=day.replace(hour=20),
                ).to_mongo()
            )

    if samples:
        await db.telemetry.insert_many(samples)
    if alerts:
        await db.alerts.insert_many(alerts)


# ----------------------------------------------------------------------- app
@asynccontextmanager
async def lifespan(app: FastAPI):
    await client.admin.command("ping")
    await db.parents.create_index("email", unique=True)
    await db.telemetry.create_index([("child_id", 1), ("at", -1)])
    await db.alerts.create_index([("child_id", 1), ("at", -1)])
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("parent_id")
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    await seed_database()
    await migrate_seed_language()
    await ensure_today_activity()
    yield
    client.close()


app = FastAPI(title="NeuroKid API", lifespan=lifespan)
api = APIRouter(prefix="/api")


@api.get("/")
async def root():
    return {"service": "neurokid", "status": "ok"}


@api.get("/health")
async def health():
    await client.admin.command("ping")
    return {"ok": True, "time": now_utc().isoformat()}


# --------------------------------------------------------------------- auth
@api.post("/auth/register", response_model=TokenOut, status_code=201)
async def register(body: RegisterIn):
    email = body.email.lower()
    if await db.parents.find_one({"email": email}, {"_id": 1}):
        raise HTTPException(409, "This email is already registered")
    parent = Parent(
        email=email, name=body.name.strip(), password_hash=hash_password(body.password)
    )
    result = await db.parents.insert_one(parent.to_mongo())
    parent_id = str(result.inserted_id)
    await ensure_starter_child(parent_id)

    return TokenOut(
        access_token=make_token(parent_id),
        expires_in=JWT_MINUTES * 60,
        parent=ParentOut(id=parent_id, name=parent.name, email=parent.email),
    )


@api.post("/auth/login", response_model=TokenOut)
async def login(body: LoginIn):
    doc = await db.parents.find_one({"email": body.email.lower()})
    if not doc or not doc.get("password_hash"):
        raise HTTPException(401, "Incorrect email or password")
    if not verify_password(body.password, doc["password_hash"]):
        raise HTTPException(401, "Incorrect email or password")
    parent = Parent.from_mongo(doc)
    return TokenOut(
        access_token=make_token(parent.id),
        expires_in=JWT_MINUTES * 60,
        parent=parent_out(parent),
    )


class SessionIn(BaseModel):
    session_id: str = Field(min_length=4)


class SessionOut(BaseModel):
    session_token: str
    parent: ParentOut


EMERGENT_SESSION_URL = (
    "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"
)


@api.post("/auth/session", response_model=SessionOut)
async def google_session(body: SessionIn):
    """Exchange a one-time Emergent session_id for a 7-day session token."""
    try:
        async with httpx.AsyncClient(timeout=20.0) as http:
            res = await http.get(
                EMERGENT_SESSION_URL, headers={"X-Session-ID": body.session_id}
            )
    except httpx.HTTPError as exc:
        logger.warning("emergent session lookup failed: %s", exc)
        raise HTTPException(401, "Could not verify this Google session")

    if res.status_code != 200:
        logger.warning("emergent session rejected: %s", res.status_code)
        raise HTTPException(401, "Could not verify this Google session")

    payload = res.json()
    email = str(payload.get("email", "")).lower()
    session_token = payload.get("session_token")
    if not email or not session_token:
        raise HTTPException(401, "Google session is missing required details")

    existing = await db.parents.find_one({"email": email})
    if existing:
        parent_id = str(existing["_id"])
        await db.parents.update_one(
            {"_id": existing["_id"]},
            {
                "$set": {
                    "name": payload.get("name") or existing.get("name") or "Parent",
                    "picture": payload.get("picture"),
                }
            },
        )
        parent = Parent.from_mongo(
            await db.parents.find_one({"_id": existing["_id"]})
        )
    else:
        parent = Parent(
            email=email,
            name=payload.get("name") or "Parent",
            picture=payload.get("picture"),
            provider="google",
        )
        result = await db.parents.insert_one(parent.to_mongo())
        parent_id = str(result.inserted_id)
        parent.id = parent_id

    await ensure_starter_child(parent.id)
    await ensure_today_activity()

    await db.user_sessions.update_one(
        {"session_token": session_token},
        {
            "$set": {
                "session_token": session_token,
                "parent_id": parent.id,
                "expires_at": now_utc() + timedelta(days=7),
                "created_at": now_utc(),
            }
        },
        upsert=True,
    )

    return SessionOut(session_token=session_token, parent=parent_out(parent))


@api.post("/auth/logout")
async def logout(credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer)):
    if credentials:
        await db.user_sessions.delete_one({"session_token": credentials.credentials})
    return {"ok": True}


@api.get("/auth/me", response_model=ParentOut)
async def me(parent: Parent = Depends(current_parent)):
    return parent_out(parent)


# ----------------------------------------------------------------- children
def child_public(child: Child) -> Dict[str, Any]:
    bracket = AGE_BRACKETS[child.bracket]
    return {
        "id": child.id,
        "name": child.name,
        "age": child.age,
        "bracket": child.bracket,
        "bracket_label": bracket["label"],
        "bracket_range": bracket["range"],
        "avatar_color": child.avatar_color,
        "device": child.device,
        "shield_active": child.shield_active,
        "daily_limit_minutes": child.daily_limit_minutes,
        "allowed_content": child.allowed_content,
    }


class ChildIn(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    age: int = Field(ge=2, le=12)
    device: str = "Tablet"
    avatar_color: str = "#1B7A82"


@api.get("/children")
async def list_children(parent: Parent = Depends(current_parent)):
    docs = await db.children.find({"parent_id": parent.id}).to_list(50)
    return [child_public(Child.from_mongo(d)) for d in docs]


@api.post("/children", status_code=201)
async def create_child(body: ChildIn, parent: Parent = Depends(current_parent)):
    bracket = bracket_for_age(body.age)
    child = Child(
        parent_id=parent.id,
        name=body.name.strip(),
        age=body.age,
        device=body.device,
        avatar_color=body.avatar_color,
        bracket=bracket,
        daily_limit_minutes=AGE_BRACKETS[bracket]["max_minutes"],
    )
    result = await db.children.insert_one(child.to_mongo())
    child.id = str(result.inserted_id)
    await seed_child_history(child.id, bracket)
    return child_public(child)


class ShieldIn(BaseModel):
    shield_active: bool


@api.patch("/children/{child_id}/shield")
async def toggle_shield(
    child_id: str, body: ShieldIn, parent: Parent = Depends(current_parent)
):
    child = await owned_child(child_id, parent)
    await db.children.update_one(
        {"_id": ObjectId(child.id)}, {"$set": {"shield_active": body.shield_active}}
    )
    child.shield_active = body.shield_active
    return child_public(child)


# ---------------------------------------------------------------- dashboard
@api.get("/children/{child_id}/dashboard")
async def dashboard(child_id: str, parent: Parent = Depends(current_parent)):
    child = await owned_child(child_id, parent)
    start_of_day = now_utc().replace(hour=0, minute=0, second=0, microsecond=0)
    docs = await db.telemetry.find(
        {"child_id": child.id, "at": {"$gte": start_of_day}}
    ).sort("at", 1).to_list(200)
    samples = [TelemetrySample.from_mongo(d) for d in docs]

    total_minutes = sum(s.minutes for s in samples)
    low = [s for s in samples if s.sensory_load < 50]
    moderate = [s for s in samples if 50 <= s.sensory_load < 75]
    high = [s for s in samples if s.sensory_load >= 75]
    count = max(len(samples), 1)
    avg_load = round(sum(s.sensory_load for s in samples) / count, 1) if samples else 0.0

    if avg_load < 45:
        status_label, status_tone = "Equilibrado", "calm"
    elif avg_load < 65:
        status_label, status_tone = "Um pouco agitado", "moderate"
    else:
        status_label, status_tone = "Precisa de pausa", "critical"

    return {
        "child": child_public(child),
        "screen_time": {
            "minutes": total_minutes,
            "limit_minutes": child.daily_limit_minutes,
            "ratio": round(min(total_minutes / child.daily_limit_minutes, 1.0), 3),
        },
        "sensory": {
            "status_label": status_label,
            "status_tone": status_tone,
            "avg_load": avg_load,
            "low_pct": round(len(low) / count * 100),
            "moderate_pct": round(len(moderate) / count * 100),
            "high_pct": round(len(high) / count * 100),
            "wave": [
                {"at": s.at.isoformat(), "load": s.sensory_load, "hour": s.at.hour}
                for s in samples
            ],
        },
        "interventions_today": len([s for s in samples if s.intercepted]),
        "protected_device": child.device,
        "shield_active": child.shield_active,
    }


# ------------------------------------------------------------------- alerts
def alert_public(alert: Alert) -> Dict[str, Any]:
    return {
        "id": alert.id,
        "kind": alert.kind,
        "title": alert.title,
        "message": alert.message,
        "action": alert.action,
        "severity": alert.severity,
        "at": alert.at.isoformat(),
        "cleared": alert.cleared,
    }


@api.get("/children/{child_id}/alerts")
async def list_alerts(child_id: str, parent: Parent = Depends(current_parent)):
    child = await owned_child(child_id, parent)
    docs = await db.alerts.find({"child_id": child.id, "cleared": False}).sort(
        "at", -1
    ).to_list(120)
    alerts = [alert_public(Alert.from_mongo(d)) for d in docs]

    today = now_utc().date().isoformat()
    yesterday = (now_utc().date() - timedelta(days=1)).isoformat()
    groups: Dict[str, List[Dict[str, Any]]] = {}
    for item in alerts:
        day = item["at"][:10]
        label = "HOJE" if day == today else "ONTEM" if day == yesterday else day
        groups.setdefault(label, []).append(item)
    return {
        "total": len(alerts),
        "critical": len([a for a in alerts if a["severity"] == "critical"]),
        "groups": [{"label": k, "items": v} for k, v in groups.items()],
    }


@api.post("/children/{child_id}/alerts/clear")
async def clear_alerts(child_id: str, parent: Parent = Depends(current_parent)):
    child = await owned_child(child_id, parent)
    result = await db.alerts.update_many(
        {"child_id": child.id, "cleared": False}, {"$set": {"cleared": True}}
    )
    return {"cleared": result.modified_count}


class SoftLandingIn(BaseModel):
    trigger: str = "manual_demo"
    cuts_per_minute: float = 9.5


@api.post("/children/{child_id}/soft-landing")
async def log_soft_landing(
    child_id: str, body: SoftLandingIn, parent: Parent = Depends(current_parent)
):
    child = await owned_child(child_id, parent)
    at = now_utc()
    alert = Alert(
        child_id=child.id,
        kind="auto_interruption",
        severity="critical",
        title="Interrupção automática",
        message=f"Hiperestimulação detectada ({body.cuts_per_minute} cortes/min).",
        action="A tela entrou em Soft Landing de 12s com suavidade.",
        at=at,
    )
    await db.alerts.insert_one(alert.to_mongo())
    await db.telemetry.insert_one(
        TelemetrySample(
            child_id=child.id,
            at=at,
            minutes=4,
            sensory_load=88.0,
            cuts_per_minute=body.cuts_per_minute,
            intercepted=True,
        ).to_mongo()
    )
    return {"ok": True, "duration_seconds": 12, "trigger": body.trigger}


@api.post("/children/{child_id}/screen-break")
async def screen_break(child_id: str, parent: Parent = Depends(current_parent)):
    child = await owned_child(child_id, parent)
    at = now_utc()
    alert = Alert(
        child_id=child.id,
        kind="attention_transition",
        severity="moderate",
        title="Pausa de tela iniciada",
        message=f"Você pausou a tela de {child.name} gentilmente por 15 minutos.",
        action="Sugestão: ofereça água e um alongamento rápido juntos.",
        at=at,
    )
    await db.alerts.insert_one(alert.to_mongo())
    return {"ok": True, "break_minutes": 15}


# ------------------------------------------------------------------ content
def content_public(item: ContentItem, allowed: List[str]) -> Dict[str, Any]:
    return {
        "id": item.id,
        "title": item.title,
        "subtitle": item.subtitle,
        "thumbnail": item.thumbnail,
        "duration_minutes": item.duration_minutes,
        "cuts_per_minute": item.cuts_per_minute,
        "pacing": item.pacing,
        "audio_note": item.audio_note,
        "age_brackets": item.age_brackets,
        "stimulus_badges": item.stimulus_badges,
        "ai_verdict": item.ai_verdict,
        "ai_reason": item.ai_reason,
        "color_profile": item.color_profile,
        "flash_stimuli": item.flash_stimuli,
        "allowed": item.id in allowed,
    }


@api.get("/content")
async def list_content(
    bracket: Optional[str] = None,
    child_id: Optional[str] = None,
    parent: Parent = Depends(current_parent),
):
    allowed: List[str] = []
    if child_id:
        child = await owned_child(child_id, parent)
        allowed = child.allowed_content
    query: Dict[str, Any] = {}
    if bracket and bracket != "all":
        query["age_brackets"] = bracket
    docs = await db.content.find(query).to_list(100)
    items = [content_public(ContentItem.from_mongo(d), allowed) for d in docs]
    items.sort(key=lambda i: i["cuts_per_minute"])
    return items


@api.get("/content/{content_id}")
async def get_content(
    content_id: str,
    child_id: Optional[str] = None,
    parent: Parent = Depends(current_parent),
):
    if not ObjectId.is_valid(content_id):
        raise HTTPException(404, "Content not found")
    doc = await db.content.find_one({"_id": ObjectId(content_id)})
    if not doc:
        raise HTTPException(404, "Content not found")
    allowed: List[str] = []
    if child_id:
        child = await owned_child(child_id, parent)
        allowed = child.allowed_content
    return content_public(ContentItem.from_mongo(doc), allowed)


class AllowIn(BaseModel):
    child_id: str
    allowed: bool = True


@api.post("/content/{content_id}/allow")
async def allow_content(
    content_id: str, body: AllowIn, parent: Parent = Depends(current_parent)
):
    child = await owned_child(body.child_id, parent)
    if not ObjectId.is_valid(content_id):
        raise HTTPException(404, "Content not found")
    op = "$addToSet" if body.allowed else "$pull"
    await db.children.update_one(
        {"_id": ObjectId(child.id)}, {op: {"allowed_content": content_id}}
    )
    return {"ok": True, "allowed": body.allowed}


# ----------------------------------------------------------- AI explanation
class ClassifyIn(BaseModel):
    child_id: Optional[str] = None


@api.post("/content/{content_id}/classify")
async def classify_content(
    content_id: str, body: ClassifyIn, parent: Parent = Depends(current_parent)
):
    """Ask Gemini 3 Flash for a fresh cognitive-impact reading of the clip."""
    if not ObjectId.is_valid(content_id):
        raise HTTPException(404, "Content not found")
    doc = await db.content.find_one({"_id": ObjectId(content_id)})
    if not doc:
        raise HTTPException(404, "Content not found")
    item = ContentItem.from_mongo(doc)

    age_note = ""
    if body.child_id:
        child = await owned_child(body.child_id, parent)
        age_note = f" Quem assiste tem {child.age} anos (faixa {AGE_BRACKETS[child.bracket]['label']})."

    prompt = (
        "Classifique este vídeo infantil quanto à carga sensorial e ao valor cognitivo.\n"
        f"Título: {item.title}\nSubtítulo: {item.subtitle}\n"
        f"Duração: {item.duration_minutes} minutos\n"
        f"Cortes de cena por minuto: {item.cuts_per_minute}\n"
        f"Ritmo: {item.pacing}\nÁudio: {item.audio_note}\n"
        f"Perfil de cor: {item.color_profile}\n"
        f"Possui estímulos de flash: {item.flash_stimuli}."
        f"{age_note}\n\n"
        "Responda APENAS com JSON estrito, sem blocos de markdown, neste formato "
        "e com todos os textos em português do Brasil:\n"
        '{"verdict":"approved|caution|blocked","sensory_load_score":0-100,'
        '"stimulus_badges":["duas ou três habilidades em rótulos curtos"],'
        '"why":"uma frase acolhedora e sem julgamento para o pai/mãe explicando a evidência de ritmo",'
        '"parent_tip":"uma sugestão curta e apoiadora"}'
    )

    try:
        from emergentintegrations.llm.chat import (  # noqa: WPS433
            LlmChat,
            StreamDone,
            TextDelta,
            UserMessage,
        )

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"classify-{content_id}",
            system_message=(
                "Você é o analista de carga cognitiva de mídia infantil do NeuroKid. "
                "É calmo, baseado em evidências e nunca alarmista. "
                "Responda sempre em português do Brasil e apenas em JSON."
            ),
        ).with_model("gemini", "gemini-3-flash-preview")

        buffer = ""
        async for event in chat.stream_message(UserMessage(text=prompt)):
            if isinstance(event, TextDelta):
                buffer += event.content
            elif isinstance(event, StreamDone):
                break

        import json
        import re

        match = re.search(r"\{.*\}", buffer, re.S)
        parsed = json.loads(match.group(0)) if match else {}
        analysis = {
            "verdict": parsed.get("verdict", item.ai_verdict),
            "sensory_load_score": parsed.get(
                "sensory_load_score", round(item.cuts_per_minute * 9)
            ),
            "stimulus_badges": parsed.get("stimulus_badges", item.stimulus_badges),
            "why": parsed.get("why", item.ai_reason),
            "parent_tip": parsed.get(
                "parent_tip",
                "Boa opção para o momento de desacelerar antes do jantar.",
            ),
            "source": "gemini-3-flash-preview",
        }
    except Exception as exc:  # degradação suave, sem alarmismo
        logger.warning("AI classification fell back: %s", exc)
        analysis = {
            "verdict": item.ai_verdict,
            "sensory_load_score": round(item.cuts_per_minute * 9),
            "stimulus_badges": item.stimulus_badges,
            "why": item.ai_reason,
            "parent_tip": "Boa opção para o momento de desacelerar antes do jantar.",
            "source": "analisador de ritmo no aparelho",
        }

    await db.content.update_one(
        {"_id": ObjectId(content_id)}, {"$set": {"last_analysis": analysis}}
    )
    return analysis


# ------------------------------------------------------------ weekly report
OFFLINE_ACTIVITIES = [
    {
        "title": "Modelagem sensorial em argila",
        "why": "Recupera o foco tátil depois da tela",
        "minutes": 20,
        "icon": "circle",
    },
    {
        "title": "Caça a padrões ao ar livre",
        "why": "Relaxamento visual com foco a distância",
        "minutes": 30,
        "icon": "sun",
    },
    {
        "title": "Recontar a história devagar",
        "why": "Transforma assistir em produzir linguagem",
        "minutes": 15,
        "icon": "book-open",
    },
    {
        "title": "Caminhada de equilíbrio descalço",
        "why": "Aterra o corpo e reinicia a atenção",
        "minutes": 12,
        "icon": "wind",
    },
]


@api.get("/children/{child_id}/weekly-report")
async def weekly_report(child_id: str, parent: Parent = Depends(current_parent)):
    child = await owned_child(child_id, parent)
    now = now_utc()
    week_start = (now - timedelta(days=7)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    prev_start = week_start - timedelta(days=7)

    this_week = [
        TelemetrySample.from_mongo(d)
        for d in await db.telemetry.find(
            {"child_id": child.id, "at": {"$gte": week_start}}
        ).to_list(1000)
    ]
    prev_week = [
        TelemetrySample.from_mongo(d)
        for d in await db.telemetry.find(
            {"child_id": child.id, "at": {"$gte": prev_start, "$lt": week_start}}
        ).to_list(1000)
    ]

    minutes = sum(s.minutes for s in this_week)
    prev_minutes = sum(s.minutes for s in prev_week)
    delta_pct = (
        round((minutes - prev_minutes) / prev_minutes * 100)
        if prev_minutes
        else 0
    )
    intercepted = len([s for s in this_week if s.intercepted])
    count = max(len(this_week), 1)
    avg_load = sum(s.sensory_load for s in this_week) / count if this_week else 0
    balance_score = max(40, min(100, round(100 - (avg_load - 30) * 0.9)))

    by_day: Dict[str, Dict[str, float]] = {}
    for s in this_week:
        key = s.at.date().isoformat()
        bucket = by_day.setdefault(key, {"minutes": 0, "load_sum": 0, "n": 0})
        bucket["minutes"] += s.minutes
        bucket["load_sum"] += s.sensory_load
        bucket["n"] += 1
    days = [
        {
            "date": key,
            "weekday": datetime.fromisoformat(key).strftime("%a"),
            "minutes": int(v["minutes"]),
            "avg_load": round(v["load_sum"] / max(v["n"], 1), 1),
        }
        for key, v in sorted(by_day.items())
    ]

    return {
        "child": child_public(child),
        "total_minutes": minutes,
        "delta_pct": delta_pct,
        "spikes_intercepted": intercepted,
        "balance_score": balance_score,
        "balance_label": "Ótimo"
        if balance_score >= 85
        else "Bom" if balance_score >= 70 else "Requer atenção",
        "avg_load": round(avg_load, 1),
        "days": days,
        "activities": OFFLINE_ACTIVITIES,
    }


class ReminderIn(BaseModel):
    activity_title: str
    at_hour: int = 17


@api.post("/children/{child_id}/offline-reminder")
async def schedule_reminder(
    child_id: str, body: ReminderIn, parent: Parent = Depends(current_parent)
):
    child = await owned_child(child_id, parent)
    when = now_utc().replace(hour=body.at_hour, minute=0, second=0, microsecond=0)
    await db.reminders.insert_one(
        {
            "child_id": child.id,
            "parent_id": parent.id,
            "activity_title": body.activity_title,
            "at": when,
            "created_at": now_utc(),
        }
    )
    return {
        "ok": True,
        "activity_title": body.activity_title,
        "at": when.isoformat(),
    }


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
