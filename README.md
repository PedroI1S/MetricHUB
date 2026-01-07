# MetricHUB

**MetricHUB** is a comprehensive Data Acquisition and Monitoring Platform designed for real-time sensor data collection, visualization, and analysis in laboratory and industrial environments. It provides a modern, responsive web interface to manage multiple experiments, visualize data streams in real-time, and generate professional reports.

## 🚀 Key Features

*   **Real-time Acquisition**: Continuous data collection from multiple 22-channel collectors.
*   **Modern Web Dashboard**: Responsive Next.js frontend with smooth Framer Motion animations.
*   **Interactive Visualization**: Real-time charts with zoom, pan, and live value updates.
*   **Robust Backend**: Python Flask server with Socket.IO for bidirectional low-latency communication.
*   **Data Integrity**: SQLite database with a fully normalized schema (`experiments`, `config_read`, `readings`).
*   **Export Capabilities**: Generate professional PDF reports and Excel (XLSX) spreadsheets.
*   **User Management**: Role-based access control (Admin/User) to secure experiment configuration.

---

## 📂 Project Structure

This repository contains the evolution of the platform:

*   **`MetricHUB_0.1/`** (Current Version)
    *   The latest, fully-featured version (formerly DAQPG-0.8).
    *   **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Shadcn/UI.
    *   **Backend**: Flask 3.x, Socket.IO, SQLite, Pandas.
*   **`DAQPG/`** (Legacy)
    *   Previous version of the platform (formerly DAQPG 2).
*   **`DAQPG.py`**: Legacy standalone script.
*   **`simulate_collector.py`**: Utility to simulate a hardware data collector for testing.

---

## 🛠️ Installation & Setup (MetricHUB_0.1)

### Prerequisites
*   **Python 3.8+**
*   **Node.js 18+** & **pnpm**

### 1. Backend Setup
Navigate to the `MetricHUB_0.1` directory:

```bash
cd MetricHUB_0.1
```

Create and activate a virtual environment:

```bash
# macOS/Linux
python3 -m venv venv
source venv/bin/activate

# Windows
python -m venv venv
venv\Scripts\activate
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

### 2. Frontend Setup
Install Node.js dependencies:

```bash
cd frontend
pnpm install
```

### 3. Running the Application

**Option 1: Full Dev Mode (Recommended)**
Build the frontend and run the backend to serve both:

```bash
# from MetricHUB_0.1 directory
pnpm dev:full
```

**Option 2: Separate Processes**
*   **Backend**: `python backend/run.py` (Runs on port 5001)
*   **Frontend**: `pnpm dev` (Runs on port 3000)

Access the dashboard at **http://localhost:5001**.

*   **Admin Login**: `admin` / `admin`
*   **User Login**: `user` / `user`

---

## 💻 Usage

### 1. Simulating a Collector
To test the system without physical hardware, run the simulator:

```bash
# Open a new terminal
python simulate_collector.py --collector-id LAB_COLLECTOR_01
```

The collector will appear automatically in the Dashboard.

### 2. Creating an Experiment
1.  Go to the **Configuration** page.
2.  Select the active collector.
3.  Name your experiment.
4.  Configure channels (Sensors, Voltage, Resistance).
5.  Set sampling interval and duration.
6.  Click **Start Experiment**.

### 3. Monitoring & Reports
*   **Live View**: Watch data stream in real-time with auto-scrolling charts.
*   **Reports**: Access history of all experiments, view statistics, and download data as **PDF** or **XLSX**.

---

## 🔧 Architecture

The system uses a **Client-Server** architecture decoupled by a REST API and WebSockets:

*   **Communication**:
    *   **Collectors -> Server**: HTTP POST `/api/data` (JSON payloads).
    *   **Server -> Client**: Socket.IO events (`new_data`, `experiments_update`).
*   **Database**: SQLite with Write-Ahead Logging (WAL) for concurrency.
*   **Security**: Flask-Login for session management and HttpOnly cookies.

## 📄 Documentation

For detailed feature breakdown, database schema, and API endpoints, see:
*   [FUNCIONALIDADES.md](./MetricHUB_0.1/FUNCIONALIDADES.md) - Detailed feature specification (PT-BR).
*   [RESTRUCTURE_SUMMARY.md](./MetricHUB_0.1/RESTRUCTURE_SUMMARY.md) - Database normalization details.

## 📝 License

Proprietary software. All rights reserved.
