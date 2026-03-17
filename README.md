# MetricHUB

**MetricHUB** is a Data Acquisition and Monitoring Platform designed for collecting, visualizing, and reporting metrics from multiple edge devices in real time.

## Overview

MetricHUB connects edge devices (collectors) to a central hub where their data is stored, monitored, and analyzed. The platform consists of:

- **Backend** — A Python/Flask server that exposes a REST API and WebSocket interface, persisting data in PostgreSQL.
- **Frontend** — A Next.js web application that provides a real-time dashboard, device monitoring, and report generation.
- **Edge Gateway** — A lightweight Python script that runs on edge devices and forwards measurements to the hub.
- **Device Simulator** — A built-in script to simulate collector devices for testing and development.

## Quick Start

### Prerequisites

- [Docker](https://www.docker.com/) — to run the PostgreSQL database.
- [Node.js](https://nodejs.org/) 20+ and [pnpm](https://pnpm.io/) — for the frontend.
- [Python](https://www.python.org/) 3.9+ — for the backend.

### Run

```bash
# 1. Start the database
docker compose up -d

# 2. Install dependencies
cd MetricHUB_0.1
pnpm install
python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt

# 3. Build the frontend and start the backend
pnpm dev:full
```

The application will be available at **http://localhost:5001**.

## Documentation

For detailed documentation — architecture, configuration options, API reference, deployment guides, and more — please visit the **[project wiki](../../wiki)**.
