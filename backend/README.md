# FleetSure Backend

FastAPI + PostgreSQL backend for fleet expense and profitability tracking.

---

## Project Structure

```
backend/
├── app/
│   ├── main.py              # App entry point, router registration
│   ├── config.py            # All config loaded from .env
│   ├── database.py          # DB engine, session, Base
│   ├── models/              # SQLAlchemy ORM models
│   │   ├── vehicle.py
│   │   ├── trip.py
│   │   └── expense.py
│   ├── schemas/             # Pydantic request/response schemas
│   │   ├── vehicle.py
│   │   ├── trip.py
│   │   ├── expense.py
│   │   └── profit.py
│   ├── routers/             # API route handlers
│   │   ├── vehicles.py
│   │   ├── trips.py
│   │   └── expenses.py
│   └── services/            # Business logic layer
│       ├── vehicle_service.py
│       ├── trip_service.py
│       └── expense_service.py
├── alembic/                 # Database migrations
├── alembic.ini
├── requirements.txt
├── .env.example
└── README.md
```

---

## Database Design

### vehicles
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| registration_number | VARCHAR(20) | Unique, indexed |
| make | VARCHAR(100) | e.g., Tata |
| model | VARCHAR(100) | e.g., LPT 2518 |
| year | INTEGER | Optional |
| vehicle_type | ENUM | truck, mini_truck, trailer, tanker, container, other |
| status | ENUM | active, inactive, in_trip, maintenance |
| owner_id | UUID | Nullable — future multi-tenant FK |
| created_at | TIMESTAMP | Auto |
| updated_at | TIMESTAMP | Auto |

### trips
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| vehicle_id | UUID | FK → vehicles.id |
| driver_name | VARCHAR(150) | |
| driver_phone | VARCHAR(20) | Optional |
| origin | VARCHAR(200) | |
| destination | VARCHAR(200) | |
| distance_km | NUMERIC(10,2) | Optional |
| start_date | DATE | |
| end_date | DATE | Optional |
| freight_amount | NUMERIC(12,2) | Revenue for this trip |
| status | ENUM | planned, in_progress, completed, cancelled |
| notes | TEXT | Optional |
| owner_id | UUID | Nullable — future multi-tenant FK |

### expenses
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| trip_id | UUID | FK → trips.id (CASCADE DELETE) |
| expense_type | ENUM | fuel, toll, maintenance, driver_payment, loading_unloading, police_challan, other |
| amount | NUMERIC(12,2) | |
| description | VARCHAR(500) | Optional |
| date | DATE | |
| receipt_url | VARCHAR(500) | Optional — for future file uploads |

---

## How to Run Locally

### Prerequisites
- Python 3.11+
- PostgreSQL running locally (or Docker)
- pip

### Step 1 — Clone and enter the backend folder
```bash
cd backend
```

### Step 2 — Create a virtual environment
```bash
python -m venv venv
source venv/bin/activate        # Mac/Linux
venv\Scripts\activate           # Windows
```

### Step 3 — Install dependencies
```bash
pip install -r requirements.txt
```

### Step 4 — Set up PostgreSQL database
```bash
# Option A: Using psql
psql -U postgres
CREATE DATABASE fleetsure;
\q

# Option B: Using Docker (no install needed)
docker run --name fleetsure-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=fleetsure \
  -p 5432:5432 \
  -d postgres:15
```

### Step 5 — Configure environment
```bash
cp .env.example .env
# Edit .env and set your DATABASE_URL
```

Your `.env` should look like:
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/fleetsure
```

### Step 6 — Run the server
```bash
uvicorn app.main:app --reload
```

Server starts at: **http://localhost:8000**

Interactive API docs: **http://localhost:8000/docs**

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/vehicles/` | Register a vehicle |
| GET | `/api/v1/vehicles/` | List all vehicles |
| GET | `/api/v1/vehicles/{id}` | Get vehicle details |
| PATCH | `/api/v1/vehicles/{id}` | Update vehicle |
| POST | `/api/v1/trips/` | Start a trip |
| GET | `/api/v1/trips/` | List all trips |
| GET | `/api/v1/trips/{id}` | Trip detail + all expenses |
| PATCH | `/api/v1/trips/{id}` | Update trip (complete/cancel) |
| GET | `/api/v1/trips/{id}/profit` | Profit calculation |
| POST | `/api/v1/trips/{id}/expenses/` | Add expense to trip |
| GET | `/api/v1/trips/{id}/expenses/` | List trip expenses |

---

## Quick Test Flow

### 1. Register a vehicle
```bash
curl -X POST http://localhost:8000/api/v1/vehicles/ \
  -H "Content-Type: application/json" \
  -d '{
    "registration_number": "MH12AB1234",
    "make": "Tata",
    "model": "LPT 2518",
    "year": 2021,
    "vehicle_type": "truck"
  }'
```

### 2. Start a trip
```bash
curl -X POST http://localhost:8000/api/v1/trips/ \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_id": "<vehicle_id_from_step_1>",
    "driver_name": "Ramesh Kumar",
    "driver_phone": "9876543210",
    "origin": "Mumbai",
    "destination": "Delhi",
    "distance_km": 1450,
    "start_date": "2024-01-15",
    "freight_amount": 85000
  }'
```

### 3. Add expenses
```bash
curl -X POST http://localhost:8000/api/v1/trips/<trip_id>/expenses/ \
  -H "Content-Type: application/json" \
  -d '{"expense_type": "fuel", "amount": 18000, "date": "2024-01-15"}'

curl -X POST http://localhost:8000/api/v1/trips/<trip_id>/expenses/ \
  -H "Content-Type: application/json" \
  -d '{"expense_type": "toll", "amount": 3200, "date": "2024-01-16"}'

curl -X POST http://localhost:8000/api/v1/trips/<trip_id>/expenses/ \
  -H "Content-Type: application/json" \
  -d '{"expense_type": "driver_payment", "amount": 8000, "date": "2024-01-17"}'
```

### 4. Check profit
```bash
curl http://localhost:8000/api/v1/trips/<trip_id>/profit
```

Expected response:
```json
{
  "freight_amount": 85000,
  "total_expenses": 29200,
  "profit": 55800,
  "margin_percent": 65.65,
  "expense_breakdown": {
    "fuel": 18000,
    "toll": 3200,
    "driver_payment": 8000
  },
  "is_profitable": true
}
```

### 5. Complete trip
```bash
curl -X PATCH http://localhost:8000/api/v1/trips/<trip_id> \
  -H "Content-Type: application/json" \
  -d '{"status": "completed", "end_date": "2024-01-17"}'
```

---

## Using Alembic (Production Migrations)

Once you have production data, use migrations instead of `create_all`:

```bash
# Generate a migration after changing models
alembic revision --autogenerate -m "add vehicles table"

# Apply migrations
alembic upgrade head

# Roll back one step
alembic downgrade -1
```

---

## What's Coming Next
- Authentication (JWT)
- Multi-tenant (fleet owner accounts)
- Cloud deployment (Railway / AWS)
