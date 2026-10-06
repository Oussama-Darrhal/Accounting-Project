# Compta MVP

Monorepo: React frontend (this folder) and Laravel API (`backend/`).

Rename the GitHub repository to `Accounting-Project` in Settings when you can. The code already holds both sides.

## What the API is

Double-entry journal for one company file (Atlas Conseil). Money is `DECIMAL(15,2)` in Postgres and compared as integer cents in PHP. `is_draft` is computed on the server: debit cents ≠ credit cents.

Auxiliary tiers accounts are children of `3421` / `4411` (`44110001` + name), not codes like `4411-Oasis`.

Law 69-21 delay is **invoice `date_piece` → payment `date_piece`**. `due_date` (invoice date + 60 days by default) feeds the dashboard alert.

## Frontend

```bash
npm install
npm run dev
```

Vite on http://localhost:5173. The UI still uses the Zustand store until `src/services/journalApi.js` is pointed at this API.

## Backend

Needs PHP 8.3, Composer, PostgreSQL 16.

```bash
docker compose up -d postgres   # or a local Postgres
cd backend
cp .env.example .env            # already set for user/db compta / compta
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve               # http://localhost:8000
php artisan test
```

### Endpoints (`/api`)

| Method | Path | Role |
|---|---|---|
| GET | `/accounts` | Plan comptable |
| GET | `/journals` | ACH, VT, BQ, OD |
| POST | `/journal-entries` | Same payload as the React `buildJournalPayload` |
| GET | `/journal-entries` | List (drafts included) |
| GET | `/journal-entries/{id}` | Reopen one entry |
| GET | `/ledger?account=&from=&to=` | Posted lines only |
| POST | `/lettrage` | `{ "line_ids": ["…", "…"] }` exact debit = credit |
| GET | `/dashboard/alerts` | `{ drafts, late_invoices, solde_restant }` |

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

Auth is not required yet (one seeded company). Sanctum is installed for the next step.

## Layout

```
src/                 React app
backend/             Laravel 13 API
docker-compose.yml   Postgres 16
```

Laravel 11 was requested; Composer blocks it on security advisories. This app is Laravel 13, same routing and Eloquent style.
