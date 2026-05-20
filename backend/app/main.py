from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import vahan, dl, export, documents, pdf, billing, analytics, suggestions, notifications

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

API_PREFIX = "/api/v1"

# External lookups
app.include_router(vahan.router,    prefix=API_PREFIX)
app.include_router(dl.router,       prefix=API_PREFIX)

# Document download (base64 blob served from Python)
app.include_router(documents.router, prefix=API_PREFIX)

# Server-side PDF generation
app.include_router(pdf.router,      prefix=API_PREFIX)

# Excel / CSV export
app.include_router(export.router,   prefix=API_PREFIX)

# Billing / Razorpay
app.include_router(billing.router,  prefix=API_PREFIX)

# Server-side analytics aggregations
app.include_router(analytics.router,       prefix=API_PREFIX)
app.include_router(suggestions.router,     prefix=API_PREFIX)
app.include_router(notifications.router,   prefix=API_PREFIX)


@app.get("/health")
def health_check():
    return {"status": "ok"}
