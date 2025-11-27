# Currency Tracker Backend

Flask REST API that fetches live currency rates, persists snapshots via SQLAlchemy, and caches upstream responses in Redis.

## Prerequisites

- Python 3.11+
- Redis server (e.g. `brew services start redis`)
- Optional: virtual environment (`python -m venv .venv`)
- PostgreSQL 15+ (local or managed)

## Setup

1. Create a virtual environment and install dependencies:

   ```bash
   cd currency-backend
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

2. Copy the sample environment file and edit the values (supply DB credentials, FreeCurrency API key, and session TTL):

   ```bash
   cp env.example .env
   # update DB_USER, DB_PASSWORD, FREECURRENCY_API_KEY, etc.
   ```

3. Start PostgreSQL & Redis (e.g. `brew services start postgresql redis`), apply the env file, then run the API:

   ```bash
   export FLASK_ENV=development  # optional
   python main.py
   ```

The API runs on `http://localhost:5000`.

## Key Endpoints & Docs

- `GET /api/health` – health + Redis status
- `GET /api/rates?pairs=USD:EUR,USD:GBP` – fetch rates (cached in Redis, persisted in SQLite)
- `GET /api/watchlist` – list tracked currency pairs
- `POST /api/watchlist` – add a pair `{ "base": "USD", "quote": "EUR" }`
- `DELETE /api/watchlist/<id>` – remove a tracked pair
- `POST /api/users` – create a profile (name, email, password)
- `GET /api/users/<id>/favorites` – list starred currencies
- `POST /api/users/<id>/favorites` – star a currency pair
- `DELETE /api/users/<id>/favorites/<favorite_id>` – unstar
- `POST /api/users/<id>/rates` – calculate rates for an arbitrary list and/or a user’s favorites
- `POST /api/auth/login` – email/password login (returns bearer token)
- `POST /api/auth/logout` – revoke the bearer token

Swagger UI is available at `http://localhost:5000/apidocs` once the server is running.

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `DB_USER` | _(required)_ | PostgreSQL username |
| `DB_PASSWORD` | _(required)_ | PostgreSQL password |
| `DB_HOST` | _(required)_ | PostgreSQL host |
| `DB_PORT` | _(required)_ | PostgreSQL port |
| `DB_NAME` | _(required)_ | PostgreSQL database name |
| `DATABASE_URL` | _(optional)_ | Full URI override (e.g. for managed DBs) |
| `REDIS_URL` | _(required)_ | Redis connection |
| `FREECURRENCY_API_URL` | _(required)_ | Upstream FX source |
| `FREECURRENCY_API_KEY` | _(required)_ | FreeCurrency API key |
| `DEFAULT_BASE` | _(required)_ | Base currency fallback |
| `DEFAULT_SYMBOLS` | _(required)_ | CSV of default quote currencies |
| `RATE_CACHE_TTL` | _(required)_ | Redis TTL for rates (seconds) |
| `SESSION_TTL_SECONDS` | _(required)_ | Redis TTL for auth tokens (seconds) |

