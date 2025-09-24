# CVE Vulnerability Tracker - RSecurity Challenge

A full-stack web application that fetches CVE data from NIST API, stores it in SQLite, and presents it through a React interface.

## Challenge Requirements ✅

- ✅ Lightweight web server (Express.js + TypeScript)
- ✅ API integration (NIST CVE API)
- ✅ Database storage (SQLite)
- ✅ UI presentation (React with virtual scrolling)
- ✅ Docker containerization on port 8080
- ✅ Smooth data presentation with filtering and responsive design

## Quick Start

```bash
# Clone and run with Docker (Recommended)
git clone git@github.com:Ronco75/RSecurity-Task.git
cd RSecurity-Task
docker-compose up --build

# Access application
# Frontend: http://localhost:8080
# API: http://localhost:8080/api
```

The application automatically:
- Creates SQLite database
- Fetches CVE data from NIST API (`https://services.nvd.nist.gov/rest/json/cves/2.0?cpeName=cpe:2.3:o:microsoft:windows_10:1607`)
- Serves React frontend with virtual scrolling for performance

## Features

- **Virtual Scrolling**: Handles thousands of CVE records efficiently
- **Responsive Design**: Grid/list views with adaptive columns
- **Real-time Filtering**: Search by text, severity, and CVSS score
- **Auto-refresh**: Keeps CVE data synchronized
- **Health Monitoring**: Built-in API health checks

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check and database status |
| GET | `/api/cves` | Retrieve all CVE records |
| POST | `/api/cves/sync` | Trigger manual CVE data synchronization |
| GET | `/api/cves/sync/status` | Get current sync operation status |

## Development Setup

### Backend
```bash
cd backend
npm install
npm run dev  # Runs on port 8080
```

### Frontend
```bash
cd frontend
npm install
npm run dev  # Runs on port 5173
```

## Tech Stack

- **Backend**: Express.js, TypeScript, SQLite
- **Frontend**: React, TypeScript, Vite, react-window
- **Container**: Docker with multi-stage builds