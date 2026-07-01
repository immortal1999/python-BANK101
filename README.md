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

- [ ] Frontend (React)
