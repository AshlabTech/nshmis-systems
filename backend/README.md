# Niger HMIS Outreach Backend

Laravel 12 API backend for the Niger State HMIS Outreach System.

## Requirements

- PHP 8.2+
- MySQL 8.0+ or MariaDB 10.4+ (utf8mb4)
- Composer
- `pdo_mysql` PHP extension enabled

## Local MySQL Setup

### 1. Create the database

```sql
CREATE DATABASE niger_hmis CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in your credentials:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=niger_hmis
DB_USERNAME=root        # replace for production
DB_PASSWORD=            # replace for production
```

### 3. Install dependencies

```bash
composer install
php artisan key:generate
```

### 4. Migrate and seed

```bash
php artisan config:clear
php artisan migrate:fresh --seed
```

Seed output should confirm:
- 25 LGAs (Niger State)
- 75 Wards (3 per LGA)
- 50 Facilities (2 per LGA)
- 8 Disease categories
- 8 Service categories
- Admin user: `admin@nigerhmis.local` / `Admin@1234`

### 5. Serve

Via virtual host (configured in XAMPP/Apache):

```
APP_URL=http://hmis-backend.test
```

API base URL: `http://hmis-backend.test/api/v1`

Alternatively with the built-in dev server:

```bash
php artisan serve
# API base URL: http://127.0.0.1:8000/api/v1
```

---

## API Reference

All routes are prefixed `/api/v1`. Authentication uses Laravel Sanctum bearer tokens.

### Auth

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/v1/auth/login` | No |
| POST | `/api/v1/auth/logout` | Yes |
| GET | `/api/v1/auth/me` | Yes |

### Core

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/sync` | Mobile sync (patient / encounter / referral) |
| GET | `/api/v1/metadata` | Reference data for mobile dropdowns |
| GET | `/api/v1/dashboard/stats` | Dashboard cards + charts |
| GET | `/api/v1/sync-logs` | Sync audit log |

### Patients / Encounters / Referrals

| Method | Path |
|--------|------|
| GET | `/api/v1/patients` |
| GET | `/api/v1/patients/{uuid}` |
| GET | `/api/v1/encounters` |
| GET | `/api/v1/encounters/{uuid}` |
| GET | `/api/v1/referrals` |
| GET | `/api/v1/referrals/{uuid}` |
| PATCH | `/api/v1/referrals/{uuid}/status` |

### Exports (CSV streaming)

`GET /api/v1/exports/patients` | `GET /api/v1/exports/encounters` | `GET /api/v1/exports/referrals`

---

## Mobile Sync Contract

The sync endpoint format is fixed — do not change it.

**Request** `POST /api/v1/sync`

```json
{
  "items": [
    { "entity": "patient",   "uuid": "...", "data": {} },
    { "entity": "encounter", "uuid": "...", "data": {} },
    { "entity": "referral",  "uuid": "...", "data": {} }
  ]
}
```

**Response**

```json
{
  "results": [
    {
      "uuid": "...",
      "entity": "patient",
      "status": "success",
      "message": "Patient created.",
      "server_id": 1,
      "updated_at": "2026-04-30T..."
    },
    {
      "uuid": "...",
      "entity": "encounter",
      "status": "failed",
      "message": "Patient not found for encounter sync: ...",
      "server_id": null,
      "updated_at": null
    }
  ],
  "summary": {
    "success": 1,
    "failed": 1,
    "total": 2
  }
}
```

Each item is processed independently. A failure in one item does not roll back others.

---

## Deployment Notes

Before going to production:

1. Set `APP_ENV=production` and `APP_DEBUG=false` in `.env`
2. Replace `DB_USERNAME` and `DB_PASSWORD` with production credentials
3. Replace `APP_KEY` with a freshly generated key (`php artisan key:generate`)
4. Run `php artisan config:cache` and `php artisan route:cache`
5. Ensure `pdo_mysql` is enabled in `php.ini`

---

## Useful Commands

```bash
php artisan migrate:fresh --seed          # full reset + seed
php artisan db:seed                       # re-seed without dropping tables (idempotent)
php artisan route:list --path=api         # list all 42 API routes
php artisan config:clear                  # clear config cache after .env changes
php artisan tinker                        # interactive REPL
```
