from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.database import Base, engine

from app.routers.vehicles import router as vehicles_router
from app.routers.trips import router as trips_router
from app.routers.expenses import router as expenses_router
from app.routers.drivers import router as drivers_router
from app.routers.export import router as export_router
from app.routers.vahan import router as vahan_router
from app.routers.dl import router as dl_router

Base.metadata.create_all(bind=engine)

_MIGRATIONS = [
    "ALTER TABLE expenses ALTER COLUMN expense_type TYPE VARCHAR(50) USING expense_type::text",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS doc_number     VARCHAR(100)",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS material       VARCHAR(200)",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS weight_tonnes  NUMERIC(10,2)",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS driver_advance NUMERIC(12,2) DEFAULT 0",
    "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS dob               DATE",
    "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS blood_group       VARCHAR(10)",
    "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS father_name       VARCHAR(150)",
    "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS transport_validity DATE",
    "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS issuing_rto       VARCHAR(100)",
    "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS badge_issue_date  DATE",
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
]

for stmt in _MIGRATIONS:
    try:
        with engine.connect() as conn:
            conn.execute(text(stmt))
            conn.commit()
    except Exception:
        pass

app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(vehicles_router, prefix="/api/v1")
app.include_router(drivers_router,  prefix="/api/v1")
app.include_router(trips_router,    prefix="/api/v1")
app.include_router(expenses_router, prefix="/api/v1")
app.include_router(export_router,   prefix="/api/v1")
app.include_router(vahan_router,    prefix="/api/v1")
app.include_router(dl_router,       prefix="/api/v1")


@app.get("/health")
def health_check():
    return {"status": "ok"}
