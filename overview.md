# MetricHUB — Technical Overview

## Table of Contents

1. [Introduction](#1-introduction)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Repository Structure](#3-repository-structure)
4. [Backend](#4-backend)
   - 4.1 [Technology Stack](#41-technology-stack)
   - 4.2 [Application Factory & Initialisation](#42-application-factory--initialisation)
   - 4.3 [Configuration (`config.ini`)](#43-configuration-configini)
   - 4.4 [Data Models & In-Memory State](#44-data-models--in-memory-state)
   - 4.5 [Database Layer (PostgreSQL)](#45-database-layer-postgresql)
   - 4.6 [REST API Endpoints](#46-rest-api-endpoints)
   - 4.7 [WebSocket Events](#47-websocket-events)
   - 4.8 [Report Export (XLSX / CSV)](#48-report-export-xlsx--csv)
5. [Frontend](#5-frontend)
   - 5.1 [Technology Stack](#51-technology-stack)
   - 5.2 [Project Structure](#52-project-structure)
   - 5.3 [Pages & Routing](#53-pages--routing)
   - 5.4 [Key Components](#54-key-components)
   - 5.5 [API & Socket Client (`lib/api.ts`)](#55-api--socket-client-libapts)
   - 5.6 [Demo Mode](#56-demo-mode)
   - 5.7 [Static Export & Frontend Serving](#57-static-export--frontend-serving)
6. [Edge Gateway](#6-edge-gateway)
   - 6.1 [Purpose & Operation](#61-purpose--operation)
   - 6.2 [DAQ Hardware Interface (PyVISA)](#62-daq-hardware-interface-pyvisa)
   - 6.3 [Channel Mapping](#63-channel-mapping)
   - 6.4 [Simulation / Fallback Mode](#64-simulation--fallback-mode)
7. [Device Simulator](#7-device-simulator)
8. [Infrastructure & DevOps](#8-infrastructure--devops)
   - 8.1 [Docker Compose](#81-docker-compose)
   - 8.2 [Database Administration (Adminer)](#82-database-administration-adminer)
9. [Authentication & Security](#9-authentication--security)
10. [Data Flow: End-to-End](#10-data-flow-end-to-end)
11. [Development Workflow](#11-development-workflow)
12. [Roadmap](#12-roadmap)

---

## 1. Introduction

**MetricHUB** is an open-source Data Acquisition and Monitoring Platform designed to collect, store, visualise, and export time-series measurements from multiple physical edge devices in real time. The primary use case is industrial laboratory environments where data loggers / data-acquisition units (DAQs) — such as temperature, voltage, resistance, or current sensors — need to be centralised under a single web dashboard.

The platform was designed and validated in partnership with **ATLAS Eletrodomésticos** as its pilot client, and is intended to be extended to broader industrial and laboratory applications in Brazil and Latin America.

---

## 2. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                          CLIENT BROWSER                          │
│  Next.js 14 SPA (React 18, TypeScript, Tailwind, shadcn/ui)     │
│  ← REST (fetch) + Socket.IO (WebSocket/polling) →               │
└────────────────────────┬─────────────────────────────────────────┘
                         │  HTTP / WebSocket (port 5001)
┌────────────────────────▼─────────────────────────────────────────┐
│                    BACKEND SERVER (Flask)                         │
│  Flask + Flask-SocketIO + Flask-CORS + Flask-Login               │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────────────┐  │
│  │  routes.py  │   │  sockets.py  │   │    database.py        │  │
│  │  REST API   │   │  WS handlers │   │  psycopg2 pool (1-20) │  │
│  └─────────────┘   └──────────────┘   └──────────┬───────────┘  │
└──────────────────────────────────────────────────┼───────────────┘
                                                   │  port 5433
┌──────────────────────────────────────────────────▼───────────────┐
│                  PostgreSQL 15 (Docker)                           │
│  Tables: experiments | config_read | readings                    │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────┐          HTTP POST /api/data
│  Edge Gateway         │ ─────────────────────────────────────────►
│  (edge_gateway.py)    │
│  PyVISA / simulation  │ ◄── HTTP GET /api/collector/config ───────
└──────────────────────┘

┌──────────────────────┐
│  Device Simulator     │ ─── HTTP POST /api/data ─────────────────►
│  (simulate_collector) │
└──────────────────────┘
```

The Flask server acts as the single hub:
- It **receives** measurement data from edge devices (HTTP POST).
- It **stores** that data in PostgreSQL.
- It **streams** real-time updates to connected browser clients via Socket.IO.
- It **serves** the pre-built Next.js frontend as static HTML/JS from `frontend/out/`.

---

## 3. Repository Structure

```
MetricHUB/
├── docker-compose.yml          # PostgreSQL + Adminer services
├── README.md                   # Quick-start guide
├── overview.md                 # This document
└── MetricHUB_0.1/              # Main application version
    ├── backend/
    │   ├── app/
    │   │   ├── __init__.py     # App factory, SocketIO, LoginManager
    │   │   ├── routes.py       # REST API Blueprint
    │   │   ├── sockets.py      # Socket.IO event handlers
    │   │   ├── database.py     # PostgreSQL pool, schema, CRUD
    │   │   └── models.py       # User model, in-memory state
    │   ├── config.ini          # Runtime configuration
    │   └── run.py              # Entry point (reads config, starts server)
    ├── frontend/
    │   ├── app/                # Next.js App Router pages
    │   │   ├── layout.tsx
    │   │   ├── page.tsx        # Login redirect
    │   │   ├── dashboard/
    │   │   ├── configuracao/
    │   │   ├── monitoramento/
    │   │   └── relatorios/
    │   ├── components/         # React component library
    │   │   ├── auth/
    │   │   ├── configuration/
    │   │   ├── dashboard/
    │   │   ├── layout/
    │   │   ├── monitoring/
    │   │   ├── reports/
    │   │   └── ui/             # shadcn/ui primitives
    │   ├── hooks/              # Custom React hooks
    │   ├── lib/
    │   │   ├── api.ts          # REST + Socket.IO client
    │   │   ├── pdf-generator.ts
    │   │   └── utils.ts
    │   ├── styles/
    │   ├── public/
    │   ├── next.config.mjs     # Static export config
    │   └── package.json
    ├── Docs/
    │   ├── README.md           # Detailed setup guide
    │   ├── ROADMAP.md          # Technical & commercial roadmap
    │   └── WIKI_UPDATES.md     # PostgreSQL migration notes
    ├── edge_gateway.py         # Physical DAQ edge script
    ├── simulate_collector.py   # Simulated collector for testing
    ├── requirements.txt        # Backend Python dependencies
    ├── requirements_gateway.txt # Edge gateway Python dependencies
    ├── package.json            # Workspace scripts (pnpm dev:full)
    └── tsconfig.json           # Root TypeScript config
```

---

## 4. Backend

### 4.1 Technology Stack

| Package | Purpose |
|---|---|
| `Flask` | Web framework, HTTP routing, static file serving |
| `Flask-SocketIO` | WebSocket layer (Socket.IO protocol) |
| `Flask-CORS` | Cross-Origin Resource Sharing headers |
| `Flask-Login` | Session-based authentication |
| `psycopg2-binary` | PostgreSQL adapter with threaded connection pool |
| `pandas` | Data manipulation for report generation |
| `xlsxwriter` | Branded Excel (XLSX) report generation |
| Python `configparser` | INI-based runtime configuration |

Python version requirement: **3.9+**

### 4.2 Application Factory & Initialisation

The backend uses Flask's **application factory pattern** (`app/__init__.py → create_app()`):

1. Reads `config.ini` for the static folder path.
2. Creates a Flask app instance with `static_folder` pointing to `frontend/out/`.
3. Attaches `Flask-SocketIO`, `Flask-Login`, and `Flask-CORS`.
4. Registers the `main_bp` Blueprint (all routes).
5. Imports socket event handlers.
6. Calls `database.init_db()` — creates tables if absent.
7. Loads **running** and **completed** experiments from PostgreSQL into in-memory dicts (`running_experiments`, `completed_experiments`).
8. Starts the `check_inactive_collectors()` background timer.
9. Registers `database.cleanup_on_exit()` with `atexit` to close the connection pool gracefully.

Entry point (`run.py`) reads `config.ini`, detects the local network IP and optional public IP (via `api.ipify.org`), then calls `socketio.run()` with Werkzeug.

### 4.3 Configuration (`config.ini`)

Located at `MetricHUB_0.1/backend/config.ini`:

```ini
[SERVER]
HOST            = 0.0.0.0         # Listen address
PORT            = 5001             # HTTP/WS port
DISPLAY_HOST    = auto             # 'auto' detects LAN IP via UDP probe
STATIC_DIR      = ../frontend/out  # Relative path to Next.js export

SECRET_KEY      = <your-secret-here>

[DATABASE]
HOST     = localhost
PORT     = 5433              # Docker-mapped PostgreSQL port
USER     = metrichub_user
PASSWORD = metrichub_password
DBNAME   = metrichub_db

[APPLICATION]
NUM_CHANNELS              = 22   # Total DAQ channel slots (0–21 → 201–222)
COLLECTOR_TIMEOUT_SECONDS = 15   # Seconds before an idle collector is removed
```

### 4.4 Data Models & In-Memory State

`app/models.py` holds all **in-memory runtime state**:

| Object | Type | Description |
|---|---|---|
| `active_collectors` | `dict[str, dict]` | Keyed by `collector_id`; contains `last_seen` (UNIX timestamp) and `latest_data` (22-element readings array) |
| `running_experiments` | `dict[int, dict]` | Active measurements; keyed by integer experiment ID from DB |
| `completed_experiments` | `dict[int, dict]` | Finished measurements loaded from DB at startup |
| `base_channel_config` | `dict[str, dict]` | Default configuration template for all 22 channels |
| `users` / `user_credentials` | `dict` | Hardcoded user store (admin + user) |

The `User` class extends `flask_login.UserMixin` and carries `id`, `username`, and `role` fields.

**Collector lifecycle:** When data arrives from a collector, `active_collectors[cid]` is created or updated. A recurring `threading.Timer` runs every `COLLECTOR_TIMEOUT_SECONDS` seconds and removes collectors that have not reported in that window, then broadcasts the updated collector map to all WebSocket clients.

### 4.5 Database Layer (PostgreSQL)

#### Connection Pool

`app/database.py` uses `psycopg2.pool.ThreadedConnectionPool` with:
- `minconn = 1`, `maxconn = 20`
- Connections are obtained via the `get_db()` context manager, which calls `pool.getconn()` / `pool.putconn()`.

#### Schema

```sql
-- Experiments (measurements)
CREATE TABLE experiments (
    id_exp      SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    collector_id TEXT NOT NULL,
    start       DOUBLE PRECISION NOT NULL,  -- UNIX epoch (seconds)
    finish      DOUBLE PRECISION,           -- NULL while running
    duration    DOUBLE PRECISION,           -- Planned duration (0 = unlimited)
    interval    DOUBLE PRECISION,           -- Save interval (seconds)
    created_at  DOUBLE PRECISION DEFAULT EXTRACT(EPOCH FROM NOW())
);

-- Channel configuration per experiment
CREATE TABLE config_read (
    id          SERIAL PRIMARY KEY,
    id_exp      INTEGER NOT NULL REFERENCES experiments(id_exp) ON DELETE CASCADE,
    canal       TEXT NOT NULL,           -- String channel index ("0"–"21")
    id_canal    INTEGER NOT NULL,        -- Integer channel index
    nome_canal  TEXT,                    -- Human-readable channel name
    limites     TEXT,                    -- JSON-encoded limit thresholds
    unidade     TEXT,                    -- Unit string (°C, V, Ω, A, …)
    tipo        TEXT,                    -- Sensor type: 'temp' | 'volt' | 'res'
    habilitado  INTEGER DEFAULT 1,       -- 1 = enabled, 0 = disabled
    UNIQUE(id_exp, canal)
);
CREATE INDEX idx_config_read_id_exp    ON config_read (id_exp);
CREATE INDEX idx_config_read_id_canal  ON config_read (id_canal);

-- Time-series readings
CREATE TABLE readings (
    id       SERIAL PRIMARY KEY,
    id_canal INTEGER NOT NULL REFERENCES config_read(id) ON DELETE CASCADE,
    time     DOUBLE PRECISION NOT NULL,  -- Absolute UNIX epoch (seconds)
    value    DOUBLE PRECISION NOT NULL
);
CREATE INDEX idx_readings_id_canal   ON readings (id_canal);
CREATE INDEX idx_readings_time       ON readings (time);
CREATE INDEX idx_readings_canal_time ON readings (id_canal, time);
```

`ON DELETE CASCADE` ensures that deleting an experiment row automatically removes all related channel configurations and time-series readings.

#### Key Database Functions

| Function | Description |
|---|---|
| `init_db()` | Creates tables and indexes if they do not exist |
| `create_experiment(...)` | Inserts a row into `experiments` and all enabled channels into `config_read`; returns the new `id_exp` |
| `save_row_to_db(exp_id, row)` | Inserts one time-point of readings; maps channel key → `config_read.id` then batch-inserts into `readings` |
| `finish_experiment(exp_id)` | Sets `finish` timestamp on the experiment row |
| `get_experiment_history(exp_id)` | JOINs `readings` with `config_read`, pivots into `[{time, values: {canal: value}}]` |
| `get_experiment_config(exp_id)` | Returns the channel configuration dict for a given experiment |
| `load_running_experiments_from_db()` | Recovers unfinished experiments from DB into `running_experiments` on startup |
| `load_completed_experiments_from_db()` | Populates `completed_experiments` from DB on startup |
| `cleanup_on_exit()` | Closes all pool connections |

### 4.6 REST API Endpoints

All endpoints are registered under the `main_bp` Blueprint (`/`).

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/` | No | Serves the SPA `index.html` |
| `GET` | `/<path>` | No | Serves static frontend assets or falls back to `index.html` |
| `POST` | `/api/login` | No | Authenticates username/password, sets Flask-Login session cookie |
| `GET` | `/api/logout` | Required | Clears session |
| `GET` | `/api/status` | No | Returns `{logged_in, role, username}` |
| `POST` | `/api/data` | No | Receives `{collector_id, readings[]}` from an edge device; updates `active_collectors`, saves a DB row if an experiment is running, emits Socket.IO events |
| `GET` | `/api/collector/config?collector_id=X` | No | Returns `{status: "running", experiment_id, config, interval}` or `{status: "idle"}` for a given collector |

**CORS headers** are returned on every endpoint (including preflight `OPTIONS` requests) to support the Next.js dev server running on port 3000.

### 4.7 WebSocket Events

The backend uses **Flask-SocketIO** (Socket.IO protocol, polling transport by default).

#### Events emitted by the server → client

| Event | Payload | When |
|---|---|---|
| `initial_config` | `base_channel_config` dict | On every client connection |
| `collectors_update` | `{collector_id: {status, last_seen, latest_data}}` | On new data arrival, collector removed, experiment start/stop |
| `experiments_update` | `{running: {…}, completed: {…}}` | On experiment start, stop, delete |
| `new_data` | `{experiment_id, data: {time, values}}` | On each save interval during a running experiment |
| `experiment_history` | Full history + metadata | In response to `subscribe_to_experiment` |
| `xlsx_generated` | `{filename, data: base64-string}` | After XLSX is generated in memory |
| `csv_generated` | `{filename, data: base64-string}` | After CSV is generated in memory |
| `error` | `{message}` | On validation or runtime errors |

#### Events received by the server ← client

| Event | Payload | Description |
|---|---|---|
| `start_experiment` | `{collector_id, name, config, interval, duration}` | Creates experiment in DB, adds to `running_experiments`, emits updates |
| `stop_experiment` | `exp_id` | Moves experiment from `running_experiments` to `completed_experiments`, sets `finish` in DB |
| `subscribe_to_experiment` | `exp_id` | Sends full history for the experiment; joins Socket.IO room for running experiments |
| `unsubscribe_from_experiment` | `exp_id` | Leaves the Socket.IO room |
| `get_collector_data` | `collector_id` | Emits `collector_data_response` with latest readings |
| `generate_xlsx` | `exp_id` | Builds a formatted XLSX in memory, emits `xlsx_generated` |
| `generate_csv` | `exp_id` | Builds a formatted CSV in memory, emits `csv_generated` |
| `delete_experiment` | `exp_id` | **Admin only** — deletes experiment from DB and `completed_experiments` dict |

### 4.8 Report Export (XLSX / CSV)

#### XLSX

Generated server-side using `pandas` + `xlsxwriter`. The workbook includes:
- A branded **header row** ("Laboratório de Desenvolvimento") with dark-blue (`#0B2239`) background.
- **Metadata section** (experiment name, generation date, acquisition unit, thermocouple type) in columns A–B.
- **Data table** starting at column F, row 3 — with alternating row shading, borders, and numeric formatting (`0.00`).
- Black fill columns (C–E) acting as visual separators.
- **Yellow footer band** below the data rows.
- Frozen panes at the header row, 90% zoom, and column widths auto-tuned.
- File is base64-encoded and pushed to the client over Socket.IO as `xlsx_generated`.

#### CSV

- Combines a channel-configuration block (Canal, Tipo, Unidade) and the time-series data block side by side with two blank separator columns.
- Uses semicolon (`;`) delimiter and `utf-8-sig` encoding for Excel compatibility.
- Delivered to the client over Socket.IO as `csv_generated`.

---

## 5. Frontend

### 5.1 Technology Stack

| Package | Purpose |
|---|---|
| `Next.js 14` | React meta-framework (App Router, static export) |
| `React 18` | UI rendering |
| `TypeScript 5` | Static typing |
| `Tailwind CSS v4` | Utility-first styling |
| `shadcn/ui` | Component library built on Radix UI primitives |
| `Recharts` | Responsive SVG charts (time-series) |
| `Chart.js` + `react-chartjs-2` | Additional chart types |
| `framer-motion` | Page and element animations |
| `socket.io-client` | Real-time WebSocket communication |
| `date-fns` | Date formatting (Brazilian Portuguese locale) |
| `jspdf` + `jspdf-autotable` | Client-side PDF report generation |
| `next-themes` | Dark/light theme switching |
| `lucide-react` | Icon set |
| `react-hook-form` + `zod` | Form validation |

### 5.2 Project Structure

```
frontend/
├── app/
│   ├── layout.tsx           # Root layout (ThemeProvider, Toaster, metadata)
│   ├── page.tsx             # "/" — auto-redirects to /dashboard if logged in
│   ├── dashboard/page.tsx
│   ├── configuracao/page.tsx
│   ├── monitoramento/page.tsx
│   └── relatorios/page.tsx
├── components/
│   ├── auth/login-form.tsx
│   ├── configuration/
│   │   ├── configuration.tsx      # Experiment creation wizard
│   │   └── channel-configuration.tsx
│   ├── dashboard/
│   │   ├── dashboard.tsx          # Stats cards + experiment lists
│   │   ├── experiment-card.tsx
│   │   └── stats-card.tsx
│   ├── layout/navigation.tsx
│   ├── monitoring/
│   │   ├── monitoring.tsx         # Live chart + channel table
│   │   ├── realtime-chart.tsx
│   │   ├── live-values.tsx
│   │   └── channel-values-table.tsx
│   ├── reports/
│   │   ├── reports.tsx            # Historical analysis view
│   │   ├── report-chart.tsx
│   │   ├── data-table.tsx
│   │   └── stats-summary.tsx
│   ├── theme-provider.tsx
│   └── ui/                       # shadcn/ui primitives
├── hooks/
├── lib/
│   ├── api.ts                    # REST + Socket.IO client singleton
│   ├── pdf-generator.ts          # jsPDF report builder
│   └── utils.ts
├── styles/globals.css
└── public/
```

### 5.3 Pages & Routing

| Route | Page | Description |
|---|---|---|
| `/` | Login | Shows `LoginForm`; redirects to `/dashboard` if already authenticated |
| `/dashboard` | Dashboard | Stats overview, running experiments, last 4 completed, active collectors |
| `/configuracao` | Configuration | Select collector, configure channels, set interval/duration, start experiment |
| `/monitoramento` | Monitoring | Lists running experiments; `?id=<exp_id>` shows the live real-time chart |
| `/relatorios` | Reports | Grid of completed experiments; selecting one shows the historical chart + export tools |

All pages follow the same pattern:
1. On mount, call `authApi.getStatus()` — redirect to `/` if not logged in.
2. Connect `socketManager`.
3. Render navigation bar + page-specific component.
4. On unmount, disconnect `socketManager`.

### 5.4 Key Components

#### Dashboard (`components/dashboard/dashboard.tsx`)
- Maintains local state for `runningExperiments`, `completedExperiments`, `collectors`.
- Listens to `experiments_update` and `collectors_update` Socket.IO events.
- Displays four **StatsCards** (total, running, completed, active collectors).
- Running experiments panel and "Last 4 Completed" panel with `ScrollArea`.
- Active collectors section — shows status badge (running / online).
- **XLSX download**: triggers `socketManager.generateXLSX(id)` and auto-downloads the base64 response.

#### Configuration (`components/configuration/`)
- Allows the operator to:
  1. Choose an active collector from the `collectors_update` list.
  2. Name the measurement session.
  3. Set the data-save interval (seconds) and optional duration.
  4. Enable/configure each of the 22 channels (name, type, unit, limits).
- On submit, emits `start_experiment` via Socket.IO.

#### Monitoring (`components/monitoring/monitoring.tsx`)
- Subscribes to an experiment via `subscribe_to_experiment`.
- Receives `experiment_history` (full past data) and streams `new_data` events.
- Renders a **real-time scrolling line chart** (Recharts) and a channel values table.
- Provides a **Stop** button which emits `stop_experiment` and navigates to the Reports page.

#### Reports (`components/reports/reports.tsx`)
- Shows historical chart (Recharts), statistical summary, and tabular data for a completed experiment.
- Export buttons: **XLSX** (via Socket.IO), **CSV** (via Socket.IO), **PDF** (client-side via jsPDF).
- Admin users additionally see a **Delete** button.

### 5.5 API & Socket Client (`lib/api.ts`)

`lib/api.ts` exports:

- **`authApi`** — `login()`, `logout()`, `getStatus()` using `fetch` with `credentials: 'include'`.
- **`dataApi`** — `sendData()` (used by the collector simulator page if needed).
- **`SocketManager`** (class) — wraps a `socket.io-client` instance:
  - `connect()` / `disconnect()`
  - Experiment management: `startExperiment()`, `stopExperiment()`, `subscribeToExperiment()`, `unsubscribeFromExperiment()`
  - Listeners: `onExperimentsUpdate()`, `onCollectorsUpdate()`, `onNewData()`, `onExperimentHistory()`, `onXlsxGenerated()`, `onInitialConfig()`, `onConnect()`, `onDisconnect()`
  - Utility emitters: `getCollectorData()`, `generateXLSX()`, `deleteExperiment()`
- **`socketManager`** — a singleton `SocketManager` instance used across all pages.

**URL resolution** is automatic:
- If served by Flask (port 5001) → uses `window.location.origin`.
- If running Next.js dev server (port 3000) → targets `hostname:5001`.
- SSR/build fallback → `http://localhost:5001`.
- Overridable via `NEXT_PUBLIC_API_BASE` and `NEXT_PUBLIC_SOCKET_URL` environment variables.

**Socket transport**: `polling` only (long-polling). This avoids WebSocket upgrade issues in environments with reverse proxies.

### 5.6 Demo Mode

A lightweight offline demo is built into `api.ts`:

- Activated by setting `localStorage.daqpg_demo_mode = "true"` (e.g., from the login page when the server is unreachable).
- In demo mode, `authApi.login()` returns a fake admin session and `SocketManager.connect()` runs `startDemoSimulation()` which:
  - Immediately triggers the `connect` callbacks.
  - Emits a mock `experiments_update` with two pre-defined completed experiments.
  - When `subscribeToExperiment()` is called, generates 300 synthetic data points (5 minutes of sine/cosine values) and delivers them as `experiment_history`.
- Useful for UI demonstrations without a running backend or database.

### 5.7 Static Export & Frontend Serving

The frontend is built as a **fully static site** (`output: 'export'` in `next.config.mjs`):

```bash
pnpm build   # Runs 'next build', produces frontend/out/
```

The Flask backend serves the `frontend/out/` directory:
- `GET /` → `index.html`
- `GET /_next/*` and files with extensions → direct static file
- Any other path without extension → attempts `<path>.html` (Next.js static export naming), then falls back to `index.html` for client-side routing.

This "single-binary" deployment means only the Flask server needs to be exposed; no separate Node.js server is required in production.

---

## 6. Edge Gateway

### 6.1 Purpose & Operation

`edge_gateway.py` runs on the machine physically connected to the DAQ hardware. Its job is to:

1. **Poll** the hub server every `SCAN_INTERVAL` seconds (default: 1 s) at `GET /api/collector/config?collector_id=<id>`.
2. If an experiment is **running**: re-configure the DAQ hardware if the experiment has changed, read the sensor channels, build a 22-element readings array, and POST it to `/api/data`.
3. If **idle**: send a heartbeat POST with zeroed readings to keep the collector visible in the dashboard.

Key configurable constants in the script:

| Constant | Default | Description |
|---|---|---|
| `SERVER_URL` | `http://127.0.0.1:5001/api/data` | Backend data endpoint |
| `COLLECTOR_ID` | `"Gateway_Demo_01"` | Unique identifier for this edge device |
| `DAQ_ADDRESS` | `None` | VISA resource string (auto-detected if `None`) |
| `SCAN_INTERVAL` | `1.0` | Seconds between read/send cycles |

### 6.2 DAQ Hardware Interface (PyVISA)

The `DAQInterface` class wraps a `pyvisa.ResourceManager`:

- **Connect**: opens the VISA resource (USB auto-discovery if `DAQ_ADDRESS` is `None`), sends `*RST; *CLS`, queries `*IDN?`.
- **Configure channels**: for each enabled channel in the experiment config:
  - `volt` → `CONF:VOLT:DC AUTO,DEF,(@{channel})`
  - `temp` → `CONF:TEMP TC,K,(@{channel})` + `SENS:TEMP:TRAN:TC:RJUN:TYPE INT,...`
  - `res` → `CONF:RES AUTO,DEF,(@{channel})`
  - Builds `ROUT:SCAN`, sets `TRIG:SOUR IMM`, `TRIG:COUN 1`.
- **Read channels**: writes `INITiate`, queries `FETCh?`, parses comma-separated float values.

### 6.3 Channel Mapping

The hub operates on a **logical channel index** of 0–21. The DAQ hardware uses **physical channel addresses** 201–222. The mapping is:

```
logical_index → DAQ_address = 201 + logical_index
```

When the DAQ returns values from `FETCh?`, they are in ascending channel-number order. The gateway re-maps them back to the 22-slot array expected by the server.

### 6.4 Simulation / Fallback Mode

If `pyvisa` is not installed (or no hardware is detected), the gateway falls back automatically to **simulation mode**: `read_channels()` returns 22 random floats in `[20, 30]`. This allows the edge gateway to be tested end-to-end without hardware.

---

## 7. Device Simulator

`simulate_collector.py` is a standalone test script that continuously sends synthetic data to the backend, making it easy to develop and test the platform without any hardware.

- Defines 10 realistic channels (3× resistance, 3× voltage, 2× temperature, 2× current) with min/max bounds.
- Each update applies a random ±2 % drift to maintain realistic-looking time series.
- Sends `POST /api/data` every `UPDATE_INTERVAL_SECONDS` (2 s) with `{collector_id, channels[], readings[]}`.
- Can be run as multiple concurrent processes with different `COLLECTOR_ID` values to simulate multiple devices.

---

## 8. Infrastructure & DevOps

### 8.1 Docker Compose

`docker-compose.yml` at the repository root brings up two services:

```yaml
services:
  postgres:
    image: postgres:15-alpine
    container_name: metrichub_postgres
    environment:
      POSTGRES_USER: metrichub_user
      POSTGRES_PASSWORD: metrichub_password
      POSTGRES_DB: metrichub_db
    ports:
      - "5433:5432"      # Host 5433 → container 5432
    volumes:
      - postgres_data:/var/lib/postgresql/data

  adminer:
    image: adminer
    ports:
      - 8080:8080        # Web DB management UI
```

The host port `5433` (non-default) avoids conflict with any locally installed PostgreSQL instance. The backend `config.ini` is pre-configured to connect on this port.

### 8.2 Database Administration (Adminer)

The Adminer web interface is available at `http://localhost:8080`:

| Field | Value |
|---|---|
| System | PostgreSQL |
| Server | `metrichub_postgres` (Docker service name) or `localhost` |
| Username | `metrichub_user` |
| Password | `metrichub_password` |
| Database | `metrichub_db` |

---

## 9. Authentication & Security

### Current Implementation

- **Session-based authentication** via `Flask-Login` + signed cookies (`SECRET_KEY`).
- Two hardcoded user accounts:
  | Username | Password | Role |
  |---|---|---|
  | `admin` | `admin` | `admin` |
  | `user` | `user` | `user` |
- The `admin` role is required to delete experiments (checked in the `delete_experiment` Socket.IO handler).
- CORS is enabled for all origins (`cors_allowed_origins="*"`) to ease development; production deployments should restrict this.
- Session cookies are configured with `SESSION_COOKIE_SAMESITE = "Lax"` and `SESSION_COOKIE_SECURE = False` (suitable for HTTP in a LAN environment; must be set to `True` with HTTPS in production).

### Known Limitations / Security Roadmap (Phase 0)

- Credentials are stored in plaintext in source code — must be migrated to environment variables or a database-backed user store before any external exposure.
- `SECRET_KEY` in `config.ini` should be replaced with a strong random value and kept out of version control.
- A full security hardening sprint (Phase 0) is planned, including HTTPS termination and proper credential management.

---

## 10. Data Flow: End-to-End

The following describes the complete life cycle of a measurement:

```
1. OPERATOR opens the browser → GET / → served index.html by Flask
2. OPERATOR logs in → POST /api/login → Flask session cookie set
3. Socket.IO connects → server emits:
     - initial_config  (22-channel template)
     - collectors_update (online devices)
     - experiments_update (running + completed)

4. EDGE GATEWAY boots, sends heartbeat → POST /api/data (idle readings)
   → Server adds gateway to active_collectors
   → Server emits collectors_update to all connected browsers

5. OPERATOR configures channels in /configuracao
   → emits start_experiment via Socket.IO
   → Server: create_experiment() in DB → running_experiments[id] = {…}
   → Server emits experiments_update + collectors_update

6. EDGE GATEWAY polls GET /api/collector/config → receives {status: "running", …}
   → Reconfigures DAQ hardware channels
   → Reads sensor values every SCAN_INTERVAL seconds
   → POST /api/data with full 22-slot readings array

7. SERVER receives POST /api/data:
   → Updates active_collectors[cid].latest_data
   → Checks if save interval has elapsed
   → If yes: save_row_to_db() → INSERT into readings
   → Emits new_data to Socket.IO room for the experiment

8. BROWSER (monitoring page) subscribed to experiment:
   → Receives new_data events in real time
   → Appends points to the Recharts line chart

9. OPERATOR stops the experiment:
   → Emits stop_experiment via Socket.IO
   → Server: finish_experiment() sets finish timestamp in DB
   → running_experiments[id] removed → completed_experiments[id] added
   → Server emits experiments_update + collectors_update

10. OPERATOR views /relatorios:
    → Emits subscribe_to_experiment
    → Server: get_experiment_history() → pivoted time-series from DB
    → Sends experiment_history event with full data
    → Browser renders historical chart, stats, and data table

11. OPERATOR exports data:
    → XLSX: emits generate_xlsx → server builds workbook → emits xlsx_generated (base64)
       → Browser auto-downloads file
    → CSV: emits generate_csv → same flow → csv_generated event
    → PDF: generated entirely client-side via jsPDF (no server round-trip)
```

---

## 11. Development Workflow

### Prerequisites

- [Docker Desktop](https://www.docker.com/) — for PostgreSQL and Adminer.
- [Node.js 20+](https://nodejs.org/) and [pnpm 9+](https://pnpm.io/) — for the frontend.
- [Python 3.9+](https://www.python.org/) — for the backend and edge scripts.

### Setup

```bash
# 1. Start the database
docker compose up -d

# 2. Install all dependencies
cd MetricHUB_0.1
pnpm install                        # Frontend Node modules
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt   # Backend

# 3. Start both frontend (dev) and backend in one command
pnpm dev:full
# This builds the Next.js static export and starts the Flask server.
# Open http://localhost:5001

# 4. (Optional) Run the device simulator in a separate terminal
cd MetricHUB_0.1
./.venv/bin/python simulate_collector.py
```

### Running the Edge Gateway

```bash
cd MetricHUB_0.1
pip install -r requirements_gateway.txt   # Adds pyvisa, pyserial
python edge_gateway.py
# Configure SERVER_URL and COLLECTOR_ID at the top of the script first.
```

### Environment Variables (Frontend)

Create `MetricHUB_0.1/frontend/.env.local` to override defaults:

```
NEXT_PUBLIC_API_BASE=http://<server-ip>:5001
NEXT_PUBLIC_SOCKET_URL=http://<server-ip>:5001
```

### Deployment Notes

- For production, set `SECRET_KEY` to a strong random string and do not commit it.
- Restrict CORS origins in `app/__init__.py`.
- Consider running Flask behind Nginx/Gunicorn with TLS.
- Remove `basePath` from `next.config.mjs` for local serving; re-add it if deploying to a sub-path (e.g., GitHub Pages).
- The `frontend/out/` directory must be rebuilt (`pnpm build`) whenever frontend code changes.

---

## 12. Roadmap

The project is structured in four phases:

### Phase 0 — Critical (0–3 months)
**Focus: Stability & Production Validation**

- Deploy and test the physical Edge Gateway in the ATLAS client environment.
- Security hardening: strong credentials, environment-based secrets, HTTPS.
- Intensive validation and acceptance testing with the ATLAS pilot client.

### Phase 1 — Expansion (3–6 months)
**Focus: Management & Analysis Features**

- Advanced dashboards with richer historical visualisation tools.
- Full admin panel for user, permission, and organisation management.
- Time-series analytics and detailed historical reporting tools.

### Phase 2 — Innovation (9–12 months)
**Focus: Intelligence & Automation**

- Lightweight ML models for **anomaly detection** on sensor streams.
- Automatic insight generation from collected data (intelligent reports).
- Continuous UX/UI refinement and performance optimisation.

### Vision 2026

Establish MetricHUB as a trusted technology partner for the Brazilian industry, modernising quality-control processes with accessible technology and expanding into the broader Latin American market.
