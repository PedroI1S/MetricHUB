# MetricHUB – Data Acquisition & Monitoring Platform

Version 0.8 introduces smooth UI animations and enhanced user experience improvements.

## ✨ New Features in v0.8

### 🎬 Smooth UI Animations
- **Layout Transitions**: Smooth animated transitions between grid and sidebar layouts in Reports
- **Framer Motion Integration**: Professional animations with easing and timing controls
- **Sidebar Slide-in**: Sidebar smoothly slides from left with fade effect
- **Content Transitions**: Main content area slides from right with staggered timing
- **Fade Effects**: Opacity transitions for seamless view changes

### 🎯 Enhanced Navigation
- **Auto-scroll to Selection**: When viewing an experiment from Dashboard, the sidebar automatically scrolls to center the selected item
- **Isolated Scroll Behavior**: Only the sidebar list scrolls, keeping main content stationary
- **Smart Ref Management**: Proper React ref forwarding for ScrollArea components
- **Smooth Scroll**: Uses native smooth scrolling with proper viewport calculations

### 📊 Dashboard Improvements
- **"Show All Measurements" Button**: Quick access button in "Latest Measurements" section
- **Smart Display**: Button only appears when there are more than 4 measurements
- **Header Placement**: Button positioned in card header for easy access
- **Cursor Feedback**: Proper pointer cursor on hover for better UX

### 🔧 Bug Fixes
- Fixed ScrollArea ref forwarding using React.forwardRef
- Fixed experiment selection highlighting (string vs number comparison)
- Improved viewport scroll calculations using getBoundingClientRect()
- Enhanced navigation consistency across all pages

## Project Structure

```
DAQPG-0.8/
├── frontend/          # Next.js 14 (App Router) + React + TypeScript + Tailwind
│   ├── app/          # Next.js app router pages
│   ├── components/   # React components
│   ├── hooks/        # Custom React hooks
│   ├── lib/          # Utilities and API client
│   ├── public/       # Static assets
│   ├── styles/       # Global styles
│   └── out/          # Static build output (generated)
├── backend/          # Flask + Flask-SocketIO + SQLite
│   ├── app/          # Routes, sockets, models, database
│   ├── config.ini    # Backend configuration
│   └── run.py        # Backend entry point
├── package.json      # Root package.json with scripts
├── requirements.txt  # Python dependencies
└── README.md         # This file
```

## 🚀 Getting Started

### Prerequisites

#### All Platforms
- **Python 3.8+** ([Download](https://www.python.org/downloads/))
- **Node.js 18+** ([Download](https://nodejs.org/))
- **pnpm** package manager

#### Installing pnpm
```bash
# Using npm (comes with Node.js)
npm install -g pnpm

# Or using standalone script (Linux/macOS)
curl -fsSL https://get.pnpm.io/install.sh | sh -

# Windows (PowerShell)
iwr https://get.pnpm.io/install.ps1 -useb | iex
```

### Installation

#### 1. Clone or Extract the Project
```bash
cd /path/to/DAQPG_local/DAQPG-0.8
```

#### 2. Set Up Python Environment

**Linux/macOS:**
```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

**Windows (Command Prompt):**
```cmd
# Create virtual environment
python -m venv venv

# Activate virtual environment
venv\Scripts\activate.bat

# Install Python dependencies
pip install -r requirements.txt
```

**Windows (PowerShell):**
```powershell
# Create virtual environment
python -m venv venv

# Activate virtual environment
venv\Scripts\Activate.ps1

# If you get execution policy error, run:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Install Python dependencies
pip install -r requirements.txt
```

#### 3. Install Frontend Dependencies
```bash
# Install all frontend dependencies
pnpm install
```

#### 4. Configure Environment (Optional)

Create `frontend/.env.local` if you need custom configuration:
```env
NEXT_PUBLIC_API_BASE=http://localhost:5001
NEXT_PUBLIC_SOCKET_URL=http://localhost:5001
```

### Running the Application

#### Option 1: Full Build and Run (Recommended)
```bash
# Build frontend and start backend (serves on port 5001)
pnpm dev:full
```

#### Option 2: Development Mode
```bash
# Start backend only (port 5001)
pnpm dev
```

#### Option 3: Build Frontend Only
```bash
# Generate static files in frontend/out
pnpm build
```

### Accessing the Application

After starting the server, access:
- **Local**: http://localhost:5001
- **Network**: http://[your-ip]:5001

Default credentials:
- **Admin**: username: `admin`, password: `admin`
- **User**: username: `user`, password: `user`

### Testing with Simulated Data

To simulate a data collector, open a new terminal:

**Linux/macOS:**
```bash
source venv/bin/activate
python simulate_collector.py --collector-id COL001 --interval 2
```

**Windows:**
```cmd
venv\Scripts\activate.bat
python simulate_collector.py --collector-id COL001 --interval 2
```

## 📝 Configuration

Edit `backend/config.ini` to customize:
- Server host and port
- Database location
- Static files directory
- Display host for network access

Example `config.ini`:
```ini
[server]
HOST = 0.0.0.0
PORT = 5001
DISPLAY_HOST = localhost

[paths]
STATIC_DIR = ../frontend/out
DATABASE = datalogger.db
```

## �️ Troubleshooting

### Port Already in Use
If port 5001 is already in use:
1. Stop the conflicting process
2. Or change PORT in `backend/config.ini`

### Python Virtual Environment Issues

**Linux/macOS:**
```bash
# If venv activation fails
chmod +x venv/bin/activate
source venv/bin/activate
```

**Windows:**
```powershell
# If PowerShell execution policy blocks activation
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Frontend Build Issues
```bash
# Clear cache and reinstall
rm -rf frontend/node_modules frontend/.next frontend/out
pnpm install
pnpm build
```

### Database Issues
```bash
# Delete and recreate database
rm datalogger.db
python backend/run.py  # Database will be recreated automatically
```

## � Version History

### v0.8.0 - Smooth Animations & UX Improvements (Current)
- 🎬 Added Framer Motion for smooth layout transitions
- ➕ Auto-scroll to selected experiment in Reports sidebar
- ➕ "Show All Measurements" button in Dashboard
- 🔧 Fixed ScrollArea ref forwarding
- 🎨 Enhanced cursor feedback and hover states
- 🐛 Fixed experiment selection highlighting

### v0.7.0 - Reports Redesign & Navigation Polish
- 🎨 Reorganized Reports layout (graph, table, statistics)
- ➕ Added search/filter for experiments
- ➕ Dashboard shows last 4 measurements
- 🔧 Fixed navigation bar height consistency
- 🔧 Fixed timestamp display issues

### v0.6.0 - Data Export & PDF Reports
- 📄 Professional PDF report generation
- 📊 Enhanced data table with vertical display
- ➕ Excel export (XLSX) functionality
- ➕ Auto-scroll control in data table
- ➕ Separate window view for data

### v0.5.0 - Advanced Graph Navigation
- ➕ Horizontal scroll bar for time-series navigation
- ➕ Time window selection (30s, 1min, 5min, 10min, All)
- 🔧 Smart scroll position tracking
- 🔧 Fixed scroll position drift

### v0.4.0 - Time Scale Features
- ➕ Time scale selector implementation
- 🔧 Chart.js integration improvements

### v0.3.0 - Modular Architecture
- �️ Restructured into frontend/backend modules
- ➕ Flask + Next.js integration
- ➕ Socket.IO real-time communication

## 🔮 Future Enhancements

- 🧪 Unit tests for components and API
- 📊 Advanced data filtering and analysis
- 🎯 User preferences and customization
- 📱 Progressive Web App (PWA) support
- 🌐 Internationalization (i18n)
- 📈 Advanced charting options
- � Enhanced security features
- 💾 Database migration tools

## 📄 License

This project is proprietary software. All rights reserved.

## 🤝 Contributing

For questions, issues, or contributions, please contact the development team.

## 📞 Support

For technical support or questions:
- Check the [GuideME.md](./GuideME.md) for detailed usage instructions
- Review the troubleshooting section above
- Contact the development team

---

**DAQPG 0.8** - Professional Data Acquisition Platform
Built with ❤️ using React, Next.js, Flask, and Socket.IO
