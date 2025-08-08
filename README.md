# Fullstack Driver Log Application

A fullstack application for planning long‑haul trips and generating DOT‑compliant driver logs with Hours of Service (HOS) rules. The backend (Django + DRF) computes routes and detailed logs using OpenRouteService, and the frontend (React + Vite + Tailwind) provides an interactive UI with itinerary, map, and PDF‑friendly outputs.

## Tech Stack

- Backend: Django, Django REST Framework, requests, python-dotenv
- Frontend: React, Vite, Tailwind CSS, react-leaflet, lucide-react
- Maps/Routing: OpenRouteService (ORS)
- Database: SQLite (dev)

## Monorepo Structure

```
fullstack_driver_log/
  backend/           # Django project & API
  frontend/          # React app
  README.md          # This file
```

## Prerequisites

- Python 3.10+
- Node.js 18+
- ORS API Key (free): https://openrouteservice.org/dev/#/signup

## Quick Start (Windows PowerShell)

```powershell
# Backend
cd backend
python -m venv venv
./venv/Scripts/Activate.ps1
pip install -r requirements.txt
copy env.example .env
# Edit .env and set ORS_API_KEY
python manage.py migrate
python manage.py runserver

# Frontend (in a new terminal)
cd ../frontend
npm install
npm run dev
```

- Backend: http://127.0.0.1:8000/
- Frontend: http://127.0.0.1:5173/

## Environment Variables (backend/.env)

```env
SECRET_KEY=replace-with-a-secure-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
ORS_API_KEY=your-openrouteservice-api-key
```

## Frontend Environment (optional)

Create `frontend/.env` to configure the API base URL:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

If not set, the frontend defaults to `http://localhost:8000/api`.

## Production Deployment Notes (separate services)

- Frontend: build with `VITE_API_BASE_URL` pointing to your backend, deploy to static hosting (Netlify, Vercel, S3+CloudFront, etc.).
- Backend: set `DEBUG=False`, set `ALLOWED_HOSTS`, configure CORS/CSRF envs, point `DATABASES` to Postgres via envs, run `migrate`, deploy behind HTTPS (Gunicorn/Uvicorn → Nginx/Ingress).
- Backend DB options:
  - Supabase/Heroku style: set `DATABASE_URL` (SSL required by default)
  - Manual Postgres: set `POSTGRES_*` envs; default `sslmode=require`
- Database: use managed Postgres, restrict access to backend, enable backups/monitoring.

## Features

- Enter start, pickup, and dropoff locations (search/autocomplete)
- Calculates route segments and simulates detailed HOS‑compliant daily logs
- Interactive map with route and event markers
- Detailed itinerary with event durations, locations, HOS status snapshots
- History: reload previous trips; delete single or all entries
- Downloadable outputs (PDF utilities in codebase)

## Notable Implementation Details

- HOS calculator models the four time banks (daily driving, 14‑hour on‑duty, 8‑hour break cycle, weekly 70‑hour), applies breaks, resets, and fixed tasks (pre‑trip, pickup/dropoff, fueling).
- Routing fallback: tries driving‑hgv then driving‑car.
- ORS per‑leg distance guard (~6,000 km). Over‑limit legs return a clear validation error.
- Trip history persisted in SQLite with simple CRUD endpoints.

## API

Base URL: `http://127.0.0.1:8000/api/`

- POST `calculate-trip/`

  - Body (JSON):
    ```json
    {
      "start_location": "New York, NY, USA",
      "pickup_location": "Columbus, OH, USA",
      "dropoff_location": "Chicago, IL, USA",
      "cycle_hours_used": 8
    }
    ```
  - Response: route geometry, logs, trip summary, `log_info`

- GET `history/` → list recent trips
- DELETE `history/` → delete all trips
- GET `history/:id/` → recalc and return a past trip
- DELETE `history/:id/` → delete single entry

## Frontend Commands

```bash
cd frontend
npm install
npm run dev        # start dev server
npm run build      # production build
npm run preview    # preview production build
```

## Backend Commands

```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

## Troubleshooting

- ORS 400/404: verify ORS_API_KEY and keep each leg under ~6000 km.
- CORS: django-cors-headers installed and configured.
- Port conflicts: change backend port (`runserver 8001`).

## Production Notes

- Set `DEBUG=False`, strong `SECRET_KEY`, and configure `ALLOWED_HOSTS`.
- Use PostgreSQL and proper env management.
- Consider splitting very long trips into multiple legs.

## License

MIT (adjust as needed)
