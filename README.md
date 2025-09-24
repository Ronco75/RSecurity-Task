# CVE Vulnerability Tracker

A full-stack web application that fetches CVE (Common Vulnerabilities and Exposures) data from the NIST National Vulnerability Database API, stores it in a SQLite database, and presents it through a responsive React web interface.

## Challenge Requirements Alignment

This application fully meets all requirements from the full-stack challenge:

- **Lightweight web server**: Built with Express.js and TypeScript
- **API integration**: Fetches data from NIST CVE API
- **Database storage**: Uses SQLite database for data persistence
- **UI presentation**: React-based web interface with smooth data presentation
- **Docker containerization**: Runs as a Docker container accessible on port 8080
- **Specific API endpoint**: Uses `https://services.nvd.nist.gov/rest/json/cves/2.0?cpeName=cpe:2.3:o:microsoft:windows_10:1607`
- **Smooth data presentation**: Implemented with virtual scrolling, auto-refresh, and responsive design

## Key Features

### Smooth Data Presentation
- **Virtual Scrolling**: Uses `react-window` for efficient rendering of large CVE datasets
- **Auto-refresh**: Automatic data synchronization to keep CVE information current
- **Dual View Modes**: Switch between grid and list views for optimal data browsing
- **Responsive Design**: Adaptive grid columns (1-4) based on screen width
- **Filter System**: Text search, severity filtering, and CVSS score range slider
- **Performance Optimized**: Handles thousands of CVE records without performance degradation

### Technical Features
- **Automatic Database Setup**: Creates SQLite database and initializes data on first run
- **Error Handling**: Robust error handling for API failures and network issues
- **Health Monitoring**: Built-in health checks and sync status monitoring
- **CORS Support**: Configured for development and production environments
- **TypeScript**: Full TypeScript implementation for both frontend and backend

## Quick Start (Docker - Recommended)

### Prerequisites
- Docker and Docker Compose installed
- Port 8080 available on your system

### Run the Application

```bash
# Clone the repository
git clone git@github.com:Ronco75/RSecurity-Task.git
cd RSecurity-Task

# Start the application using Docker Compose
docker-compose up --build

# Access the application
# Frontend: http://localhost:8080
# API: http://localhost:8080/api
```

The application will:
1. Build both frontend and backend components
2. Create and initialize the SQLite database
3. Fetch initial CVE data from NIST API
4. Serve the React frontend on port 8080

### Stop the Application
```bash
docker-compose down
```

## Development Setup (npm)

### Prerequisites
- Node.js 18+ installed
- npm package manager

### Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Start development server (with auto-reload)
npm run dev

# Or build and start production server
npm run build
npm start
```

### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Development URLs
- **Frontend**: http://localhost:5173 (Vite dev server)
- **Backend API**: http://localhost:8080
- **Database**: SQLite file at `./backend/data/cves.db`

## Architecture

### Backend (`/backend`)
- **Framework**: Express.js with TypeScript
- **Database**: SQLite with sqlite3 package
- **API Client**: Axios for NIST API requests
- **Key Services**:
  - `cve-service.ts`: NIST API integration and data transformation
  - `sync-service.ts`: CVE data synchronization operations
  - `db.ts`: Database operations and schema management
  - `index.ts`: Express server setup and API routes

### Frontend (`/frontend`)
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Virtualization**: react-window for performance optimization
- **Key Components**:
  - `CVEDemo.tsx`: Main container with grid/list view toggle
  - `CVEItem.tsx`: Detailed list view component
  - `VirtualizedCVEList.tsx`: Virtualized grid component
  - `CVEFilter.tsx`: Advanced filtering system
  - `useCVEs.ts`: Custom hook for CVE data management

### Database Schema
SQLite database with the following CVE fields:
- `id`: Primary key
- `cve_id`: CVE identifier (e.g., CVE-2024-1234)
- `description`: Vulnerability description
- `severity`: Severity level (LOW, MEDIUM, HIGH, CRITICAL)
- `published_date`: Publication timestamp
- `modified_date`: Last modification timestamp
- `cvss_score`: CVSS severity score
- `raw_data`: Complete NIST API response (JSON)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check and database status |
| GET | `/api/cves` | Retrieve all CVE records |
| POST | `/api/cves/sync` | Trigger manual CVE data synchronization |
| GET | `/api/cves/sync/status` | Get current sync operation status |

## Environment Configuration

### Backend Environment Variables
Create `.env` file in `/backend` directory:
```env
PORT=8080
DB_PATH=./data/cves.db
NIST_API_URL=https://services.nvd.nist.gov/rest/json/cves/2.0?cpeName=cpe:2.3:o:microsoft:windows_10:1607
```

### Frontend Environment Variables
Create `.env` file in `/frontend` directory:
```env
VITE_API_BASE_URL=http://localhost:8080
```

## Project Structure

```
RSecurity-Task/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── services/       # Business logic services
│   │   ├── db.ts          # Database operations
│   │   └── index.ts       # Express server setup
│   ├── data/              # SQLite database storage
│   └── package.json
├── frontend/               # React web application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── types/         # TypeScript type definitions
│   │   └── App.tsx        # Main application component
│   └── package.json
├── docker-compose.yml      # Docker Compose configuration
├── Dockerfile             # Multi-stage Docker build
└── README.md              # This file
```

## Data Synchronization

The application automatically:
- Creates the SQLite database on first startup
- Performs initial CVE data sync if database is empty
- Handles NIST API rate limiting and pagination
- Stores both processed and raw CVE data
- Provides manual sync capability via API endpoint

## Performance Features

- **Virtual Scrolling**: Efficiently renders large datasets (thousands of CVE records)
- **Pagination**: Backend supports chunked data fetching
- **Caching**: SQLite database provides fast local data access
- **Responsive Grid**: Automatically adjusts to screen size (1-4 columns)
- **Memory Management**: Virtual scrolling prevents memory bloat
- **Background Sync**: Non-blocking data synchronization

## Browser Support

- Modern browsers with ES6+ support
- Chrome, Firefox, Safari, Edge (latest versions)
- Mobile responsive design for tablets and phones

## Troubleshooting

### Docker Issues
```bash
# Check container status
docker-compose ps

# View container logs
docker-compose logs

# Rebuild containers
docker-compose up --build --force-recreate
```

### Development Issues
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Database Issues
```bash
# Remove database file to force re-initialization
rm backend/data/cves.db

# Check database status via API
curl http://localhost:8080/api/health
```

## License

This project is created for the RSecurity full-stack challenge.