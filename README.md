# Storage Integration Dashboard

A web-based dashboard for tracking OpenShift Virtualization storage integration status across major storage vendors. The dashboard automatically syncs with Google Sheets and provides search and filtering capabilities for sales teams.

## Features

- **Automatic Google Sheets Sync**: Pulls data from Google Sheets every 5 minutes (configurable)
- **Real-time Search**: Search across all vendors, models, and statuses
- **Advanced Filtering**: Filter by vendor, status, or any field
- **Mobile Responsive**: Works on desktop, tablet, and mobile devices
- **Health Monitoring**: Built-in sync monitoring and health checks
- **Podman Ready**: Containerized for easy deployment with Podman

## Prerequisites

- Podman (with optional podman-compose)
- Google Cloud Service Account with Sheets API access
- Google Sheets document with your storage integration data

## Quick Start

### 1. Google Sheets Setup

1. Create a Google Sheets document with your storage integration data
2. Note the Sheet ID from the URL: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`
3. Create a Google Cloud Service Account:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable the Google Sheets API
   - Create a Service Account with Sheets read permissions
   - Download the JSON credentials file
4. Share your Google Sheet with the service account email (found in credentials JSON)

### 2. Installation

1. Clone or download this project
2. Copy the environment file:
   ```bash
   cp .env.example .env
   ```

3. Configure your environment in `.env`:
   ```bash
   # Your Google Sheet ID
   GOOGLE_SHEET_ID=your_google_sheet_id_here
   
   # Base64 encoded service account JSON
   GOOGLE_CREDENTIALS_BASE64=your_base64_encoded_service_account_json_here
   
   # Optional: Sync interval in minutes (default: 5)
   SYNC_INTERVAL_MINUTES=5
   ```

4. Encode your Google credentials:
   ```bash
   # Linux/Mac
   base64 -w 0 path/to/your/credentials.json
   
   # Windows
   certutil -encode credentials.json temp.b64 && findstr /v /c:- temp.b64
   ```

5. Build and run with Podman:
   ```bash
   # If you encounter storage issues, run fix first
   ./fix-podman.sh
   
   # Easy deployment with script
   ./deploy.sh
   
   # Or with podman-compose
   podman-compose up --build -d
   
   # Or manual deployment
   ./deploy.sh build && ./deploy.sh deploy
   ```

6. Access the dashboard at `http://localhost:3001`

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GOOGLE_SHEET_ID` | Your Google Sheets document ID | Required |
| `GOOGLE_CREDENTIALS_BASE64` | Base64 encoded service account JSON | Required |
| `PORT` | Server port | 3001 |
| `SYNC_INTERVAL_MINUTES` | Auto-sync interval | 5 |
| `NODE_ENV` | Environment (development/production) | development |

### Google Sheets Format

Your Google Sheets should have:
- First row as headers
- Common column names like "Vendor", "Model", "Status", "Support Level", etc.
- Data starting from row 2

Example structure:
```
| Vendor | Storage Model | Support Status | Integration Level | Notes |
|--------|---------------|----------------|-------------------|-------|
| NetApp | FAS Series    | Fully Supported| CSI Driver       | Latest |
| Dell   | PowerStore    | In Progress    | Beta             | Q2 2024|
```

## API Endpoints

### Storage Data
- `GET /api/storage` - Get all storage data
- `GET /api/storage/search?q=term` - Search storage data
- `POST /api/storage/filter` - Filter data with custom criteria
- `POST /api/storage/sync` - Force manual sync

### Monitoring
- `GET /api/health` - Health check and sync status
- `GET /api/sync/stats` - Sync statistics
- `GET /api/sync/history` - Sync history

## Development

### Local Development Setup

1. Install dependencies:
   ```bash
   npm run install:all
   ```

2. Create a local `credentials.json` file (for development):
   ```bash
   # Place your Google service account JSON in server/credentials.json
   ```

3. Set up environment:
   ```bash
   cp .env.example .env
   # Edit .env with your GOOGLE_SHEET_ID
   ```

4. Start development servers:
   ```bash
   npm run dev
   ```

This starts both the React frontend (port 3000) and Node.js backend (port 3001).

### Podman Development

For development with Podman:
```bash
# Build and run in development mode
./deploy.sh

# View logs
./deploy.sh logs

# Check status
./deploy.sh status

# Stop application
./deploy.sh stop
```

### Project Structure

```
storage-dashboard/
├── client/                 # React frontend
│   ├── src/
│   │   ├── App.js         # Main dashboard component
│   │   ├── index.js       # React entry point
│   │   └── index.css      # Styles
│   └── package.json
├── server/                # Node.js backend
│   ├── services/
│   │   ├── sheetsService.js  # Google Sheets integration
│   │   ├── dataStore.js      # Local data management
│   │   └── syncMonitor.js    # Sync monitoring
│   ├── routes/
│   │   └── storage.js        # API routes
│   ├── index.js              # Express server
│   └── package.json
├── podman-compose.yml     # Podman Compose configuration
├── Dockerfile            # Multi-stage container build
├── deploy.sh             # Podman deployment script
└── README.md
```

## Deployment

### Production Deployment

#### Easy Deployment with Script
```bash
# Production deployment with nginx
./deploy.sh deploy-prod

# Check status
./deploy.sh status

# View logs
./deploy.sh logs
```

#### Manual Podman Compose Deployment
```bash
# Development mode
podman-compose up -d

# Production mode with nginx
podman-compose --profile production up -d
```

#### Direct Podman Commands
```bash
# Build image
podman build -t storage-dashboard .

# Run container
podman run -d --name storage-dashboard \
  -p 3001:3001 \
  -v storage-data:/app/data:Z \
  --env-file .env \
  storage-dashboard
```

### Health Checks

The application includes built-in health checks:
- Container health check on `/api/health`
- Sync monitoring and failure detection
- Automatic restart on failure (with --restart=unless-stopped)

### Monitoring

Monitor the application using:
- `GET /api/health` - Overall health status
- `GET /api/sync/stats` - Sync performance metrics
- `GET /api/sync/history` - Recent sync attempts
- Podman logs: `podman logs storage-dashboard`

## Troubleshooting

### Common Issues

1. **"Google credentials not found"**
   - Ensure `GOOGLE_CREDENTIALS_BASE64` is properly set
   - Verify the base64 encoding is correct (no line breaks)

2. **"Permission denied" on Google Sheets**
   - Share the sheet with the service account email
   - Ensure the service account has read permissions

3. **"No data found in spreadsheet"**
   - Check the sheet ID is correct
   - Verify the sheet has data starting from row 1 (headers)

4. **Sync failures**
   - Check `/api/sync/history` for detailed error messages
   - Verify internet connectivity and Google Sheets API access

### Logs

View application logs:
```bash
# Using deployment script
./deploy.sh logs

# Direct podman commands
podman logs -f storage-dashboard

# Using podman-compose
podman-compose logs -f storage-dashboard
```

## Security Considerations

- Store Google credentials as environment variables, not in files
- Use HTTPS in production
- Limit service account permissions to sheets read-only
- Keep the container updated with security patches
- Consider network segmentation for internal deployments

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review application logs for error details
3. Verify Google Sheets API quotas and permissions
4. Test API endpoints directly using `/api/health`