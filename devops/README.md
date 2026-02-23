# DevOps (Docker)

This folder contains Docker and deployment-related assets for the project.

## Prerequisites

- **Docker** installed and running
- **Docker Compose**
  - You can use either `docker compose` (Compose v2) or `docker-compose` (legacy)

## Files

```text
devops/
├── Dockerfile                 # Production image
├── Dockerfile.dev             # Development image
├── docker-compose-pg.yml      # Production stack using PostgreSQL
├── docker-compose-sqlite.yml  # Production stack using SQLite
├── docker-compose.dev.yml     # Development stack
├── .dockerignore              # Build ignore rules
├── docker-helper.bat          # Windows helper script
├── docker-helper.sh           # Linux/macOS helper script
├── entrypoint.sh              # Container entrypoint (SQLite compose uses this)
├── start.sh                   # Container start script
└── README.md                  # This document
```

## Quick start

All commands below are intended to run from the **project root**.

### 1) Build the production image

```bash
docker build -f devops/Dockerfile -t ai-run-nextjs:latest .
```

### 2) Run in production with SQLite (simplest)

```bash
docker compose -f devops/docker-compose-sqlite.yml up -d
```

Notes:
- The compose file mounts `./devops/data` into `/app/data` and `./devops/logs` into `/app/logs`.
- SQLite DB file path is controlled by `DATABASE_URL` in the compose file.

### 3) Run in production with PostgreSQL

```bash
docker compose -f devops/docker-compose-pg.yml up -d
```

Notes:
- `app` depends on the `db` service defined in the same compose file.
- Configure `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, and any AI provider keys in the compose file before deploying.

### 4) Run in development (Docker Compose)

```bash
docker compose -f devops/docker-compose.dev.yml up --build -d
```

This uses `devops/Dockerfile.dev`, mounts the repository into the container, and runs `npm run dev`.

## Helper scripts

From the **project root**:

```bash
# Windows
./devops/docker-helper.bat prod
./devops/docker-helper.bat dev

# Linux/macOS
./devops/docker-helper.sh prod
./devops/docker-helper.sh dev
```

## Configuration reference

### Environment variables (examples)

The actual variables are defined in the compose files. Typical examples:

```yaml
environment:
  - NODE_ENV=production
  - NEXT_TELEMETRY_DISABLED=1
  - DB_PROVIDER=sqlite
  - DATABASE_URL=file:./data/data.db
  - NEXTAUTH_URL=http://localhost:3000
  - NEXTAUTH_SECRET=change-me
```

### Data persistence (volumes)

SQLite production compose (`docker-compose-sqlite.yml`) persists via:

```yaml
volumes:
  - ./data:/app/data
  - ./logs:/app/logs
```

PostgreSQL production compose (`docker-compose-pg.yml`) persists DB data via a named volume:

```yaml
volumes:
  - postgres_data:/var/lib/postgresql/data
```

## Logs

```bash
# All services
docker compose -f devops/docker-compose-sqlite.yml logs

# App only
docker compose -f devops/docker-compose-sqlite.yml logs -f app
```

## Troubleshooting

- **Build fails**
  - Try rebuilding without cache: `docker build --no-cache -f devops/Dockerfile -t ai-run-nextjs:latest .`
- **Port 3000 already in use**
  - Change the host port mapping in the compose file (e.g. `"3001:3000"`).
- **Container starts but cannot log in**
  - Ensure `NEXTAUTH_URL` and `NEXTAUTH_SECRET` are set correctly.

## Contributing

If you change anything under `devops/`:

- **Update this README** so commands and filenames stay accurate.
- **Test** both SQLite and PostgreSQL paths when possible.