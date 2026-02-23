# Wiki Update: PostgreSQL Migration & Docker Setup

This document contains updated information for the MetricHUB Wiki based on the latest changes.

## 1. Database Architecture
The database has been migrated from SQLite to **PostgreSQL** for better scalability and performance.
- **Connection Pooling**: Implemented using `psycopg2.pool.ThreadedConnectionPool`.
- **Schema**: Fully relational normalized schema (`experiments`, `config_read`, `readings`).

## 2. Infrastructure (Docker)
We now use Docker Compose to manage the database and administration tools.
- **PostgreSQL**: Version 15-alpine.
- **Adminer**: Web-based tool for database management.

### Starting the Environment
Run this in the root directory:
```bash
docker compose up -d
```

### Adminer (Web DB Manager)
- **URL**: `http://localhost:8080`
- **System**: PostgreSQL
- **Server**: `metrichub_postgres`
- **User**: `metrichub_user`
- **Password**: `metrichub_password`
- **Database**: `metrichub_db`

## 3. Project Structure
The project has been reorganized into `MetricHUB_0.1`.
- `backend/`: API and server-side logic.
- `frontend/`: Next.js 14 web dashboard.
- `Docs/`: Documentation and legacy archives.

## 4. Running the Application
### Backend & Frontend
```bash
cd MetricHUB_0.1
pnpm install
pnpm dev:full
```

### Simulator
```bash
cd MetricHUB_0.1
./.venv/bin/python simulate_collector.py
```

## 5. Deployment Notes
- The `next.config.mjs` was updated to remove `basePath` for local serving. If deploying to GitHub Pages, you may need to re-add the `basePath`.
