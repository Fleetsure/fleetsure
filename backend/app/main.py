from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, vehicles, drivers, trips, expenses, vahan, dl, export

app = FastAPI(
    title="FleetSure API",
    version="1.0.0",
    description="Backend for FleetSure fleet management SaaS",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
API_PREFIX = "/api/v1"

app.include_router(auth.router,      prefix=API_PREFIX)
app.include_router(vehicles.router,  prefix=API_PREFIX)
app.include_router(drivers.router,   prefix=API_PREFIX)
app.include_router(trips.router,     prefix=API_PREFIX)
app.include_router(expenses.router,  prefix=API_PREFIX)
app.include_router(vahan.router,     prefix=API_PREFIX)
app.include_router(dl.router,        prefix=API_PREFIX)
app.include_router(export.router,    prefix=API_PREFIX)


@app.get("/health")
def health_check():
    return {"status": "ok"}
