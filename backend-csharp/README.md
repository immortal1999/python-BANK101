# BANK101 — C# / ASP.NET Core backend

A port of the Python `backend/` (FastAPI + SQLAlchemy) to ASP.NET Core 10 + EF Core.
It is a **drop-in replacement**: same routes, same JSON, same database, same JWTs.
Both backends can run against the same Postgres at the same time, which is how the
port was verified.

The React frontend is untouched and needs no changes.

## Running it

```bash
# against a local Postgres
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bank101" \
JWT_SECRET_KEY="..." \
dotnet run --project Bank101.Api
```

It reads the **same environment variables** the Python app reads (`DATABASE_URL`,
`JWT_SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `PROJECT_NAME`,
`API_V1_PREFIX`), so the `.env` written by `fetch-secrets.sh` drives it unchanged.

Listens on **8080** in the container, same as the Python image — Caddy needs no edit.

## What maps to what

| Python | C# |
|---|---|
| `app/main.py` | `Program.cs` |
| `app/core/config.py` | `Program.cs` config binding + `JwtSettings` |
| `app/core/security.py` | `Core/Security/Passwords.cs`, `TokenService.cs` |
| `app/core/provisioning.py` | `Core/DemoProvisioner.cs` |
| `app/api/deps.py` | `Core/CurrentUser.cs` + JWT bearer middleware |
| `app/db/database.py` | `Data/BankDbContext.cs` |
| `app/models/*.py` | `Models/*.cs` |
| `app/schemas/*.py` | `Dtos/*.cs` + `Core/FieldValidator.cs` |
| `app/api/v1/endpoints/*.py` | `Endpoints/*.cs` |
| Alembic | EF Core Migrations (see below) |

## Compatibility notes

These are the things that actually needed care. Each is covered by the parity
harness described at the bottom.

**Passwords.** Uses `BCrypt.Net-Next`, which reads passlib's `$2b$` hashes directly,
at the same cost factor (12). Accounts created by either backend log into the other.
Deliberately *not* ASP.NET Identity's `PasswordHasher` — its format is different and
adopting it would lock out every existing user.

**JWTs.** `MapInboundClaims = false`, otherwise .NET rewrites the `sub` claim into a
long `ClaimTypes.NameIdentifier` URI and the lookup fails. Issuer/audience validation
is off and `ClockSkew` is zero, matching what python-jose actually enforces. Tokens
issued by either backend validate in the other, so a live session survives a cutover.

**Money.** `Numeric(18,2)` → `decimal`, serialized **as a JSON string** ("29724.19")
by `DecimalAsStringConverter`, because that is what Pydantic emits and what
`Dashboard.jsx` expects. Emitting bare JSON numbers would reintroduce float rounding
on the client.

**Timestamps.** Every timestamp column is `timestamp without time zone`. Npgsql
defaults C# `DateTime` to `timestamptz` and then rejects non-UTC Kinds, so the column
type is pinned explicitly in `OnModelCreating` and writes go through
`BankDbContext.UtcNowNaive()`.

**Defaults.** In SQLAlchemy, `default=` is applied client-side and only
`server_default=` reaches the DDL. Only `created_at`/`updated_at` have real database
defaults; `role`, `is_active`, `kyc_status`, etc. are C# property initializers. Getting
this wrong makes EF treat the column as store-generated and omit it from INSERTs.

**Error bodies.** FastAPI's shapes are reproduced exactly: `{"detail": "..."}` for
`HTTPException`, and `{"detail": [{type, loc, msg, input, ctx}]}` for 422. `Register.jsx`
reads `err.loc.at(-1)` to highlight the offending input, so `loc` must end with the
snake_case field name. A missing header returns `"Not authenticated"` while a bad token
returns `"Could not validate credentials"` — FastAPI distinguishes the two.

**`DATABASE_URL`.** `Core/DatabaseUrl.cs` translates the SQLAlchemy-style URL
(`postgresql://user:pass@host/db`, including `+psycopg2` variants) into an Npgsql
connection string, so the existing secret works as-is.

### Two known, intentional differences

- **`sqlite://` is not supported.** The Python app falls back to SQLite for local dev;
  this backend is Postgres-only and fails fast with a clear message.
- **422 `input` for a *missing* field** is `null` here, where Pydantic echoes the whole
  request body. Every other error type matches exactly. Nothing in the frontend reads it.

## Migrations

The production database is **Alembic-managed**, and the C# code is written against
that exact schema — it does not need EF migrations to run.

`Migrations/InitialBaseline` exists so a *fresh* database can be created without
Python. It was verified to produce a schema identical to Alembic's: all 60 columns
(types, nullability, defaults) and all 12 constraints match, including `SERIAL` primary
keys and no `ON DELETE CASCADE` (EF's default is cascade; it is explicitly disabled).

The only remaining differences are indexes: Alembic creates a redundant `ix_<table>_id`
on each primary key, and EF adds an index on each foreign key. Neither affects
correctness.

> **Against the existing production database, do not run `dotnet ef database update`.**
> Mark the baseline as already applied instead:
> ```bash
> dotnet ef migrations script --idempotent   # inspect first
> # then insert the migration id into __EFMigrationsHistory without running the DDL
> ```
> Otherwise EF will try to CREATE TABLE over live data.

Keep schema changes in **one** tool. While both backends are live, Alembic stays the
source of truth; regenerate the EF baseline after each Alembic change.

## Deploying

`deploy.sh` and `docker-compose.yml` are unchanged and still ship the Python image.
To cut over, point the API image build at this directory:

```diff
-docker build --platform linux/amd64 -t "$ECR:latest" ./backend
+docker build --platform linux/amd64 -t "$ECR:latest" ./backend-csharp
```

Everything else — Compose, Caddy, ECR, the `frontend/dist` volume, TLS — is untouched,
because the container still listens on 8080 and serves the same routes.

Note that `deploy.sh --migrate` runs `alembic upgrade head` inside the API container.
That command does not exist in this image; run migrations from the Python image, or
drop the flag.

## Verifying the port

Parity was checked by running both backends against one Postgres and diffing
responses across 15 cases (success, 401/403/404/409/422, validation bodies) — all
matched on both status and body shape. Cross-compatibility was confirmed in both
directions: a user registered in Python logs in through C# and vice versa, and tokens
issued by either are accepted by the other.

```bash
dotnet build && dotnet test    # (no test project yet — see below)
```

There is no automated test suite yet. The parity harness used during the port was a
throwaway script; promoting it into an xUnit project (spin up Postgres via
Testcontainers, assert the same 15 cases) is the obvious next step, along with the
endpoints the Python app also lacks: payments, invoices, and audit logs.
