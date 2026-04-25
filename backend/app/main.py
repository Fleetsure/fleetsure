from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.database import Base, engine

# Import User first so its table exists before FK tables are created
from app.models.user import User  # noqa: F401

from app.routers.auth import router as auth_router
from app.routers.vehicles import router as vehicles_router
from app.routers.trips import router as trips_router
from app.routers.expenses import router as expenses_router
from app.routers.drivers import router as drivers_router
from app.routers.export import router as export_router
from app.routers.vahan import router as vahan_router
from app.routers.dl import router as dl_router

# ── Schema bootstrap ──────────────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)

# Run each migration in its own transaction so a failure doesn't poison the connection
_MIGRATIONS = [
    # Expense type → VARCHAR
    "ALTER TABLE expenses ALTER COLUMN expense_type TYPE VARCHAR(50) USING expense_type::text",
    # Trip columns
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS doc_number     VARCHAR(100)",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS material       VARCHAR(200)",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS weight_tonnes  NUMERIC(10,2)",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS driver_advance NUMERIC(12,2) DEFAULT 0",
    # Driver columns
    "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS dob               DATE",
    "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS blood_group       VARCHAR(10)",
    "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS father_name       VARCHAR(150)",
    "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS transport_validity DATE",
    "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS issuing_rto       VARCHAR(100)",
    "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS badge_issue_date  DATE",
    "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS owner_id          UUID",
    # Vehicle columns
    "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fuel_type        VARCHAR(50)",
    "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS chassis_number   VARCHAR(100)",
    "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS engine_number    VARCHAR(100)",
    "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vehicle_class    VARCHAR(100)",
    "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS owner_name       VARCHAR(200)",
    "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS rto_code         VARCHAR(20)",
    "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS color            VARCHAR(50)",
    "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS insurance_expiry DATE",
    "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fitness_expiry   DATE",
    "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS puc_expiry       DATE",
    "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS permit_expiry    DATE",
    "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS owner_id         UUID",
]

# Each statement runs in its own connection+transaction — failures are isolated
for stmt in _MIGRATIONS:
    try:
        with engine.connect() as conn:
            conn.execute(text(stmt))
            conn.commit()
    except Exception:
        pass  # Column/type already exists — safe to ignore

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="FleetSure API — fleet management backend.",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router,     prefix="/api/v1")
app.include_router(vehicles_router, prefix="/api/v1")
app.include_router(drivers_router,  prefix="/api/v1")
app.include_router(trips_router,    prefix="/api/v1")
app.include_router(expenses_router, prefix="/api/v1")
app.include_router(export_router,   prefix="/api/v1")
app.include_router(vahan_router,    prefix="/api/v1")
app.include_router(dl_router,       prefix="/api/v1")


@app.get("/", tags=["Health"])
def root():
    return {"service": settings.APP_NAME, "version": settings.APP_VERSION, "status": "running"}


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}
