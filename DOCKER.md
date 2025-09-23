# Docker Instructions for CVE Application

This document provides instructions for running the CVE (Common Vulnerabilities and Exposures) application using Docker.

## Quick Start

### Option 1: Using Docker Compose (Recommended)

```bash
# Clone the repository and navigate to the project directory
cd RSecurity

# Build and run the application
docker-compose up --build

# The application will be available at: http://localhost:8080
```

### Option 2: Using Docker Commands

```bash
# Build the Docker image
docker build -t cve-app .

# Create a backend/data directory for database persistence
mkdir -p ./backend/data

# Run the container
docker run -d \
  --name cve-app \
  -p 8080:8080 \
  -v $(pwd)/backend/data:/app/backend/data \
  -e NODE_ENV=production \
  -e PORT=8080 \
  -e DB_PATH=/app/backend/data/cves.db \
  -e NIST_API_URL="https://services.nvd.nist.gov/rest/json/cves/2.0?cpeName=cpe:2.3:o:microsoft:windows_10:1607" \
  cve-app
```

## Application Features

- **Full-stack CVE data viewer** with React frontend and Express.js backend
- **SQLite database** for storing CVE data from NIST API
- **Automatic data synchronization** on first startup
- **Responsive UI** with virtual scrolling for performance
- **Health monitoring** endpoint at `/api/health`

## Available Endpoints

- `http://localhost:8080` - Main application (React frontend)
- `http://localhost:8080/api/health` - Health check endpoint
- `http://localhost:8080/api/cves` - Get all CVE data
- `http://localhost:8080/api/cves/sync` - Trigger manual data sync
- `http://localhost:8080/api/cves/sync/status` - Get sync status

## Database Persistence

The SQLite database is stored in the `./backend/data` directory and will persist between container restarts. On first startup, the application will automatically:

1. Create the database schema
2. Fetch CVE data from the NIST API
3. Populate the database with initial data

## Stopping the Application

### Docker Compose
```bash
docker-compose down
```

### Docker Commands
```bash
docker stop cve-app
docker rm cve-app
```

## Troubleshooting

### Port Already in Use
If port 8080 is already in use, you can change it:

**Docker Compose:**
Edit `docker-compose.yml` and change `"8080:8080"` to `"3000:8080"` (or any available port)

**Docker Command:**
Change `-p 8080:8080` to `-p 3000:8080` in the docker run command

### Health Check
To verify the application is running correctly:
```bash
curl http://localhost:8080/api/health
```

### View Logs
```bash
# Docker Compose
docker-compose logs -f

# Docker Command
docker logs -f cve-app
```

## Development Notes

- The application serves both the React frontend and Express.js API from the same container
- Database files are excluded from the Docker image and mounted as volumes for persistence
- The build process uses multi-stage Docker builds for optimized image size
- Production environment variables are automatically configured

## System Requirements

- Docker 20.x or later
- Docker Compose 1.29 or later
- At least 1GB of available disk space for the Docker image and database