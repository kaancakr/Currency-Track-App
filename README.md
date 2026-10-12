# Currency Tracker

A full-stack currency tracker with a Next.js dashboard for live exchange rates, a watchlist and per-user favorites, backed by a Flask API with PostgreSQL and Redis.

```
Browser ──> Next.js (pages + /api route handlers) ──> Flask API ──> FreeCurrency API
                                                         ├──> PostgreSQL (users, favorites, watchlist, rate history)
                                                         └──> Redis (rate cache, auth tokens)
```

## Features

- **Live rates dashboard.** Shows a sortable table of the default pairs (`DEFAULT_BASE` against each of `DEFAULT_SYMBOLS`). It refreshes every 15 seconds and has a manual refresh button. Status cards show backend health, the Redis connection, the number of pairs and the last update time.
- **Watchlist.** Add and remove currency pairs, given as 3-letter codes. Duplicate pairs are rejected. The watchlist is shared, not per user.
- **Per-user favorites.** Star and unstar pairs, then see live rates for all of your favorites in one request.
- **Accounts.** Register, log in and log out:
  - Passwords are hashed with Werkzeug and must be at least 8 characters.
  - Login returns a random bearer token that is stored in Redis with a configurable TTL.
  - `POST /api/auth/logout` revokes the token. The navbar's Logout button currently only clears the session in the browser.
- **Health check.** `GET /api/health` reports the API status and whether Redis responds. If the backend is unreachable or takes longer than 5 seconds, the Next.js proxy returns `503` with the reason.
- **Rate caching and history.** Upstream responses are cached in Redis for `RATE_CACHE_TTL` seconds. Every fresh fetch is also saved to PostgreSQL as a rate snapshot.
- **API docs.** The Flask API serves Swagger UI (Flasgger) at `/apidocs`.

### Where the rates come from

The Flask service `currency-backend/app/services/rate_provider.py` fetches rates from the **FreeCurrency API**. The endpoint is set with `FREECURRENCY_API_URL` and the key with `FREECURRENCY_API_KEY`. Requested pairs are grouped by base currency, so each base takes one upstream call. Results are cached in Redis, and fresh results are written to the `currency_rates` table.

## Tech stack

| Layer | Technologies |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, TanStack Table, lucide-react |
| API proxy | Next.js Route Handlers in `src/app/api`, which forward each request to the Flask API |
| Backend | Python, Flask 3, Flask-SQLAlchemy, Flasgger, requests, python-dotenv |
| Data | PostgreSQL (SQLAlchemy models, tables created on startup with `db.create_all()`), Redis |

Database tables: `users`, `user_favorites`, `tracked_pairs`, `currency_rates`. The project has no migration tool.

## API routes

These are the Next.js route handlers in `currency-app/src/app/api`. Each one forwards to the same path on the Flask API, which serves it under `/api`.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | API status and Redis connectivity |
| `GET` | `/api/rates?pairs=USD:EUR,USD:GBP` | Latest rates for the given pairs. Without `pairs`, uses the default pairs |
| `GET` | `/api/watchlist` | List tracked pairs, newest first |
| `POST` | `/api/watchlist` | Add a pair `{ "base": "USD", "quote": "EUR" }` |
| `DELETE` | `/api/watchlist/{id}` | Remove a tracked pair |
| `POST` | `/api/users` | Register `{ "name", "email", "password" }` |
| `GET` | `/api/users/{id}` | Get a user profile |
| `GET` | `/api/users/{id}/favorites` | List a user's favorite pairs |
| `POST` | `/api/users/{id}/favorites` | Add a favorite `{ "base", "quote" }` |
| `DELETE` | `/api/users/{id}/favorites/{favId}` | Remove a favorite |
| `POST` | `/api/users/{id}/rates` | Rates for `{ "pairs": [{ "base", "quote" }], "use_favorites": bool }`. Uses the favorites when no pairs are sent |
| `POST` | `/api/auth/login` | Log in with `{ "email", "password" }`. Returns `{ token, user }` |
| `POST` | `/api/auth/logout` | Revoke the token sent as `Authorization: Bearer <token>` |

## Project structure

```
currency-app/                 # Next.js frontend and API proxy
├── src/app/                  # Pages: / (dashboard), /watchlist, /favorites, /login, /register
├── src/app/api/              # Route handlers that forward to the Flask API
├── src/components/           # Navigation, DataTable (TanStack Table), rates/watchlist/favorites tables
└── src/lib/                  # api-client.ts (typed fetch client), config.ts (backend URL)
currency-backend/             # Flask REST API
├── main.py                   # Entry point (port 5000)
└── app/                      # App factory, config, models, routes, auth (Redis tokens), services/rate_provider.py
```

## Getting started

**Prerequisites:** Node.js and npm, Python 3.11+, a running PostgreSQL and Redis, and a FreeCurrency API key.

### 1. Backend (Flask API)

```bash
cd currency-backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then fill in the values (see below)
python main.py
```

The API runs on `http://localhost:5000`, with Swagger UI at `http://localhost:5000/apidocs`. Tables are created automatically on first start.

### 2. Frontend (Next.js)

```bash
cd currency-app
npm install
# create .env.local with NEXT_PUBLIC_BACKEND_API_URL (see below)
npm run dev
```

Open `http://localhost:3000`.

Other frontend scripts: `npm run build`, `npm start`, `npm run lint`.

## Environment variables

Only the names are listed here. Never commit real values.

**Frontend** (`currency-app/.env.local`)

| Name | Purpose |
| --- | --- |
| `NEXT_PUBLIC_BACKEND_API_URL` | Base URL of the Flask API, **including the `/api` prefix** (locally `http://localhost:5000/api`). The built-in fallback `http://localhost:5000` has no `/api`, so set this explicitly. |

**Backend** (shell environment or `currency-backend/.env`, loaded by python-dotenv; start from `currency-backend/.env.example`, and `.env` is gitignored). The app fails at startup if a required variable is missing.

| Name | Purpose |
| --- | --- |
| `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME` | PostgreSQL connection |
| `DATABASE_URL` | Optional full database URI. When set, it replaces the `DB_*` variables |
| `REDIS_URL` | Redis connection (rate cache and auth tokens) |
| `FREECURRENCY_API_URL` | Upstream rates endpoint |
| `FREECURRENCY_API_KEY` | FreeCurrency API key |
| `DEFAULT_BASE` | Base currency for the default pairs |
| `DEFAULT_SYMBOLS` | Comma-separated quote currencies for the default pairs |
| `RATE_CACHE_TTL` | Rate cache lifetime in seconds |
| `SESSION_TTL_SECONDS` | Auth token lifetime in seconds |

## Links

- Author: [github.com/kaancakr](https://github.com/kaancakr)
