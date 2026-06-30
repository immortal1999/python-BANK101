# pythonbank

A containerized banking backend API built with **FastAPI** and **PostgreSQL** (SQLAlchemy ORM + Alembic migrations). Features JWT-based authentication, a 3-tier least-privilege database role model, and a fully containerized deployment on AWS — with Caddy for automatic HTTPS, ECR for the app image, and Secrets Manager for credentials.

## Tech Stack

- **API:** FastAPI (Python), Pydantic / pydantic-settings
- **Database:** PostgreSQL — SQLAlchemy (ORM) + Alembic (migrations)
- **Auth:** JWT (python-jose) + bcrypt password hashing (passlib)
- **Containerization:** Docker + Docker Compose
- **Reverse proxy / TLS:** Caddy (automatic Let's Encrypt HTTPS)
- **Cloud (AWS):** EC2 (host), ECR (image registry), Secrets Manager (credentials), IAM (least-privilege roles)
- **DNS:** DuckDNS

## Architecture

```mermaid
flowchart TB
    User([User / Browser])
    DNS[DuckDNS<br/>your-app.duckdns.org]

    subgraph AWS["AWS"]
        SM[[Secrets Manager]]
        ECR[(ECR<br/>app image)]

        subgraph EC2["EC2 · Docker Compose"]
            Caddy[Caddy<br/>:80 / :443 · auto HTTPS]
            API[FastAPI · uvicorn<br/>:8080]
            DB[(PostgreSQL 16<br/>:5432)]
        end
    end

    User -->|HTTPS| DNS --> Caddy
    Caddy -->|reverse proxy| API
    API -->|SQL · app role| DB
    ECR -.->|docker pull| API
    SM -.->|fetch-secrets.sh via IAM role| EC2
```

## Deployment Flow

```mermaid
flowchart LR
    Dev([Developer]) -->|docker build --platform amd64| IMG[app image]
    IMG -->|docker push| ECR[(ECR)]
    Dev -->|scp config| EC2[EC2 host]
    ECR -.->|docker compose pull| EC2
    EC2 -->|fetch-secrets.sh| ENV[.env on host]
    ENV --> UP[docker compose up]
    UP --> LIVE([https://your-app.duckdns.org])
```

## Database Roles (least privilege)

```mermaid
flowchart TB
    subgraph PG[PostgreSQL]
        dbadmin[dbadmin<br/>superuser · bootstrap only]
        bankadmin[bankadmin<br/>owns schema · migrations]
        bankapp[bankapp<br/>data only · the live app]
    end
    dbadmin -->|creates| bankadmin
    dbadmin -->|creates| bankapp
    Alembic[Alembic migrations] -->|connects as| bankadmin
    FastAPI[FastAPI app] -->|connects as| bankapp
```

## Configuration

Secrets are stored in **AWS Secrets Manager** and pulled onto the host at deploy time
by `backend/fetch-secrets.sh` (authorized via the instance's IAM role), which writes a
local `.env` that Docker Compose reads. See `secrets.example.json` for the required keys.

## Status / Roadmap

- [x] Containerized deployment (EC2 + Docker Compose: api + Postgres + Caddy)
- [x] AWS integration (ECR image, Secrets Manager, IAM least-privilege roles)
- [x] Automatic HTTPS via Caddy / Let's Encrypt
- [x] SQLAlchemy models + Pydantic schemas
- [x] Auth helpers (password hashing + JWT)
- [ ] Initial database migration (create tables)
- [ ] Auth endpoints (`/register`, `/login`) + `get_current_user`
- [ ] Resource routers (accounts, transactions, etc.)
- [ ] Frontend (React)
