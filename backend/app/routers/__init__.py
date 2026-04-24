from app.routers.vehicles import router as vehicles_router
from app.routers.trips import router as trips_router
from app.routers.expenses import router as expenses_router

__all__ = ["vehicles_router", "trips_router", "expenses_router"]
