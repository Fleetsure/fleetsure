from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import ALL models before create_all so SQLAlchemy sees every table
from app.models.user import User                      # noqa: F401
from app.models.vehicle import Vehicle                # noqa: F401
from app.models.driver import Driver                  # noqa: F401
from app.models.trip import Trip                      # noqa: F401
from app.models.expense import Expense                # noqa: F401
from app.models.fuel_log import FuelLog               # noqa: F401
from app.models.driver_payment import DriverPayment   # noqa: F401
from app.models.party import Party
from app.models.insurance import InsurancePolicy  # noqa: F401
from app.models.document import Document          # noqa: F401
from app.models.toll_log import TollLog           # noqa: F401
from app.models.tyre_log import TyreLog           # noqa: F401
from app.models.misc_expense import MiscExpense           # noqa: F401
from app.models.notification_settings import NotificationSettings  # noqa: F401
from app.models.subscription import Subscription                   # noqa: F401
from app.models.insight import OperationalInsight                  # noqa: F401
from app.models.marketplace import ReturnLoad, LoadInterest        # noqa: F401

from app.database import engine, Base
from app.routers import auth, vehicles, drivers, trips, expenses, vahan, dl, export
from app.routers import fuel, driver_payments, parties, pnl, insurance, documents, pdf, tolls, tyres, misc_expenses, notifications
from app.routers import import_data
from app.routers import billing
from app.routers import insights
from app.routers import suggestions
from app.routers import analytics
from app.routers import marketplace


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    # Safe column migrations — non-blocking, skips if columns already exist
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS org_name VARCHAR(255)"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS org_logo TEXT"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)"))
            conn.execute(text("ALTER TABLE fuel_logs ADD COLUMN IF NOT EXISTS trip_id UUID"))
            conn.execute(text("ALTER TABLE fuel_logs ALTER COLUMN odometer_km DROP NOT NULL"))
            conn.execute(text("ALTER TABLE trips ADD COLUMN IF NOT EXISTS driver_id UUID"))
            # Add new enum values to PostgreSQL native types (safe — skips if already present)
            conn.execute(text("ALTER TYPE insighttype ADD VALUE IF NOT EXISTS 'compliance_expiry'"))
            conn.commit()
    except Exception:
        pass  # Never block startup — app works fine even if migration skips
    yield


app = FastAPI(
    title="FleetSure API",
    version="1.0.0",
    description="Backend for FleetSure fleet management SaaS",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api/v1"

app.include_router(auth.router,            prefix=API_PREFIX)
app.include_router(vehicles.router,        prefix=API_PREFIX)
app.include_router(drivers.router,         prefix=API_PREFIX)
app.include_router(trips.router,           prefix=API_PREFIX)
app.include_router(expenses.router,        prefix=API_PREFIX)
app.include_router(fuel.router,            prefix=API_PREFIX)
app.include_router(driver_payments.router, prefix=API_PREFIX)
app.include_router(parties.router,         prefix=API_PREFIX)
app.include_router(pnl.router,             prefix=API_PREFIX)
app.include_router(insurance.router,           prefix=API_PREFIX)
app.include_router(documents.router,       prefix=API_PREFIX)
app.include_router(vahan.router,           prefix=API_PREFIX)
app.include_router(dl.router,              prefix=API_PREFIX)
app.include_router(export.router,          prefix=API_PREFIX)
app.include_router(pdf.router,             prefix=API_PREFIX)
app.include_router(tolls.router,           prefix=API_PREFIX)
app.include_router(tyres.router,           prefix=API_PREFIX)
app.include_router(misc_expenses.router,   prefix=API_PREFIX)
app.include_router(notifications.router,   prefix=API_PREFIX)
app.include_router(import_data.router,     prefix=API_PREFIX)
app.include_router(billing.router,         prefix=API_PREFIX)
app.include_router(insights.router,        prefix=API_PREFIX)
app.include_router(suggestions.router,     prefix=API_PREFIX)
app.include_router(analytics.router,       prefix=API_PREFIX)
app.include_router(marketplace.router,     prefix=API_PREFIX)


@app.get("/health")
def health_check():
    return {"status": "ok"}
