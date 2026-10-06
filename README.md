# Compta MVP

Monorepo: React frontend (this folder) and Laravel API (`backend/`).

Rename the GitHub repository to `Accounting-Project` in Settings when you can. The code already holds both sides.

## Run locally with Docker

Postgres, the API, and the built UI on one command. The nginx container serves the app on **http://localhost:8080** and proxies `/api` to Laravel.

```bash
docker compose up --build
```

Open http://localhost:8080, log in with any email and a password of 4+ characters, then saisie → enregistrer. Posted entries show on the dashboard and the grand livre.

| Service | Port |
|---|---|
| Web (nginx + React build) | 8080 |
| API (`php artisan serve`) | 8000 |
| Postgres 16 | 5432 |

Stop with `Ctrl+C`, or `docker compose down`. The database volume `compta_pg` keeps the three dossiers (Jony Travel, Astrolabe Voyage, CG Mobility).

If port 5432 is already taken by a host Postgres, either stop that instance or change the compose mapping (for example `"5433:5432"`). The API container still talks to `postgres:5432` on the Docker network.

## Frontend without Docker

```bash
npm install
npm run dev
```

Vite on http://localhost:5173. It proxies `/api` to http://127.0.0.1:8000, so run the API (Docker `api`+`postgres`, or `php artisan serve` on the host).

## Backend without the web container

Needs PHP 8.3, Composer, PostgreSQL 16.

```bash
docker compose up -d postgres
cd backend
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve               # http://localhost:8000
php artisan test
```

`.env.example` is already set for user/db `compta` / `compta`.

## What the API is

Three independent company files under one umbrella (**Groupe**): **Jony Travel**, **Astrolabe Voyage**, **CG Mobility**. Each has its own journals, plan comptable, écritures, lettrage, alerts, and activity logs.

Every mutating call (except `GET /api/companies`) is scoped by the `X-Company-Id` header (numeric id or slug). The UI switcher in the header sets that dossier.

Money is `DECIMAL(15,2)` in Postgres and compared as integer cents in PHP. `is_draft` is computed on the server: debit cents ≠ credit cents.

Auxiliary tiers accounts are children of `3421` / `4411` (`44110001` + name), not codes like `4411-Oasis`.

Law 69-21 delay is **invoice `date_piece` → payment `date_piece`**. `due_date` (invoice date + 60 days by default) feeds the dashboard alert.

The React store hydrates from `GET /api/journal-entries` and `GET /api/dashboard/alerts` for the current dossier. Saisie `Enregistrer` / `Brouillon` calls `POST /api/journal-entries`. Open grid lines stay in localStorage **per company**; posted journal data does not.

### Endpoints (`/api`)

| Method | Path | Role |
|---|---|---|
| GET | `/companies` | Jony Travel, Astrolabe Voyage, CG Mobility |
| POST | `/companies/{id}/select` | Log “dossier ouvert” |
| PUT | `/companies/{id}` | Paramètres of the current dossier |
| GET | `/activity-logs` | Logs of the current dossier |
| GET | `/accounts` | Plan comptable of the current dossier |
| POST | `/accounts` | New client/fournisseur (`parent_code` 3421 or 4411 + `name`) |
| GET | `/journals` | ACH, VT, BQ, OD |
| POST | `/journal-entries` | Same payload as the React `buildJournalPayload` |
| GET | `/journal-entries` | List (drafts included) |
| GET | `/journal-entries/{id}` | Reopen one entry |
| PUT | `/journal-entries/{id}` | Update a draft (posted entries are rejected) |
| GET | `/ledger?account=&from=&to=` | Posted lines only |
| POST | `/lettrage` | `{ "line_ids": ["…", "…"] }` equal amounts, or remainder split |
| POST | `/lettrage/unmatch` | `{ "code": "A" }` |
| GET | `/dashboard/alerts` | `{ drafts, late_invoices, unlettered, solde_restant }` |

POST `/journal-entries` body:

```json
{
  "lines": [
    {
      "date": "2026-01-12",
      "journal": "ACH",
      "facture": "FF-0342",
      "libelle": "Achat FF-0342",
      "compte": "6111",
      "tiers": "4411 - Sud Import",
      "debit": 12500,
      "credit": 0,
      "tva": 20
    }
  ]
}
```

Auth is not required yet (one seeded company). Sanctum is installed for the next step. The login screen is still dummy.

## Layout

```
src/                 React app
backend/             Laravel 13 API
Dockerfile           nginx + Vite build
backend/Dockerfile  PHP 8.3 + Composer
docker-compose.yml   Postgres 16 + api + web
```

Laravel 11 was requested; Composer blocks it on security advisories. This app is Laravel 13, same routing and Eloquent style.
