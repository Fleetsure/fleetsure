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
from app.models.document import Document          # noqa: F401                    # noqa: F401

from app.database import engine, Base
from app.routers import auth, vehicles, drivers, trips, expenses, vahan, dl, export
from app.routers import fuel, driver_payments, parties, pnl, insurance, documents


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
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


@app.get("/health")
def health_check():
    return {"status": "ok"}
