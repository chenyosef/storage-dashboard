# Setup Guide: Storage Integration Dashboard

This guide walks you through setting up the Storage Integration Dashboard step-by-step.

## Step 1: Google Cloud and Sheets Setup

### 1.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "New Project" or select existing project
3. Note the Project ID for later use

### 1.2 Enable Google Sheets API

1. In Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Google Sheets API"
3. Click on it and press "Enable"

### 1.3 Create Service Account

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "Service Account"
3. Fill in details:
   - **Name**: `storage-dashboard-reader`
   - **Description**: `Read access for storage integration sheets`
4. Click "Create and Continue"
5. **Role**: Select "Viewer" (or create custom role with sheets.spreadsheets.readonly permission)
6. Click "Continue" then "Done"

### 1.4 Generate Service Account Key

1. In the Credentials page, click on your newly created service account
2. Go to "Keys" tab
3. Click "Add Key" → "Create new key"
4. Select "JSON" format
5. Download the JSON file (keep this secure!)

### 1.5 Prepare Your Google Sheet

1. Create or open your existing Google Sheets document
2. Ensure the first row contains headers (e.g., "Vendor", "Storage Model", "Support Status")
3. Copy the Sheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p/edit
                                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                    This is your SHEET_ID
   ```

### 1.6 Share Sheet with Service Account

1. In your Google Sheet, click the "Share" button
2. Add the service account email as a viewer:
   - Email is found in the downloaded JSON file: `"client_email": "storage-dashboard-reader@your-project.iam.gserviceaccount.com"`
   - Set permission to "Viewer"
3. Click "Send"

## Step 2: Server Setup

### 2.1 Prepare Server Environment

Choose your deployment method:

#### Option A: Podman (Recommended)
- Ensure Podman is installed (`podman --version`)
- Optional: Install podman-compose for compose functionality
- Minimum 512MB RAM, 1GB storage

#### Option B: Direct Node.js Installation (Alternative)
- Node.js 18+ installed
- npm or yarn package manager

### 2.2 Download Application

```bash
# If you have the code in a repository
git clone <repository-url>
cd storage-dashboard

# Or if you have the files directly
# Extract to /opt/storage-dashboard or your preferred location
```

### 2.3 Configure Environment

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` file:
   ```bash
   nano .env  # or use your preferred editor
   ```

3. Set the required values:
   ```env
   # Required: Your Google Sheet ID
   GOOGLE_SHEET_ID=1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p
   
   # Required: Base64 encoded service account JSON
   GOOGLE_CREDENTIALS_BASE64=eyJ0eXBlIjoic2VydmljZV9hY2NvdW50IiwicHJvamVjdF9pZCI6...
   
   # Optional: Customize sync interval (minutes)
   SYNC_INTERVAL_MINUTES=5
   
   # Optional: Change port
   PORT=3001
   ```

### 2.4 Encode Service Account Credentials

You need to convert the JSON credentials file to base64:

#### Linux/Mac:
```bash
base64 -w 0 path/to/your/credentials.json
```

#### Windows:
```cmd
certutil -encode credentials.json temp.b64
findstr /v /c:- temp.b64
```

#### Online (if needed):
Use a base64 encoder (ensure it's secure for sensitive data)

Copy the output and paste it as `GOOGLE_CREDENTIALS_BASE64` in your `.env` file.

## Step 3: Deploy Application

### 3.1 Podman Deployment (Recommended)

#### Easy Deployment with Script
```bash
# Make script executable
chmod +x deploy.sh

# Deploy the application
./deploy.sh

# Check deployment status
./deploy.sh status

# View logs
./deploy.sh logs
```

#### Manual Podman Compose Deployment
```bash
# Build and start the application
podman-compose up --build -d

# Check if it's running
podman-compose ps

# View logs
podman-compose logs -f storage-dashboard
```

#### Direct Podman Commands
```bash
# Build image
podman build -t storage-dashboard .

# Create volume
podman volume create storage-data

# Run container
podman run -d --name storage-dashboard \
  -p 3001:3001 \
  -v storage-data:/app/data:Z \
  --env-file .env \
  --restart unless-stopped \
  storage-dashboard
```

### 3.2 Direct Node.js Deployment

```bash
# Install dependencies
npm run install:all

# Build the client
cd client && npm run build && cd ..

# Start the server
cd server && npm start
```

## Step 4: Test the Installation

### 4.1 Check Application Health

```bash
# Test the health endpoint
curl http://localhost:3001/api/health

# Expected response:
{
  "status": "ok",
  "message": "All systems operational",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "lastSync": "2024-01-01T12:00:00.000Z",
  "syncStats": {
    "totalSyncs": 1,
    "successfulSyncs": 1,
    "failedSyncs": 0
  }
}
```

### 4.2 Test Data Sync

```bash
# Force a manual sync
curl -X POST http://localhost:3001/api/storage/sync

# Check if data is available
curl http://localhost:3001/api/storage
```

### 4.3 Access Web Interface

1. Open your browser
2. Go to `http://localhost:3001`
3. You should see the Storage Integration Dashboard
4. Verify that data appears and search/filter functions work

## Step 5: Production Configuration

### 5.1 Security Hardening

1. **Use HTTPS**: Set up SSL certificates
2. **Network Security**: Restrict access to internal networks
3. **Environment Variables**: Ensure `.env` file is not accessible via web
4. **Regular Updates**: Keep Podman images updated

### 5.2 Monitoring Setup

1. **Set up log rotation**:
   ```bash
   # Add to podman-compose.yml
   logging:
     driver: "json-file"
     options:
       max-size: "10m"
       max-file: "3"
   ```

2. **Health check monitoring**:
   ```bash
   # Add to crontab for external monitoring
   */5 * * * * curl -f http://localhost:3001/api/health || echo "Dashboard down"
   ```

### 5.3 Backup Strategy

1. **Environment Configuration**: Backup `.env` file securely
2. **Data Backup**: Data is automatically backed up in Google Sheets
3. **Application Backup**: Keep application code in version control

## Step 6: User Training

### 6.1 Sales Team Access

1. **Provide URL**: Share the dashboard URL with sales team
2. **Mobile Access**: Ensure mobile browsers work correctly
3. **Export Training**: Show how to export CSV/JSON for customer presentations

### 6.2 Data Management

1. **Sheet Updates**: Train data owners on updating Google Sheets
2. **Column Structure**: Document expected column names and formats
3. **Sync Timing**: Explain the auto-sync schedule and manual sync option

## Troubleshooting Installation

### Common Setup Issues

1. **Podman build fails**:
   ```bash
   # Run the fix script first
   ./fix-podman.sh
   
   # Clear Podman cache
   podman system prune -a
   
   # Rebuild without cache
   podman build --no-cache -t storage-dashboard .
   
   # Or use deployment script
   ./deploy.sh cleanup && ./deploy.sh
   ```

2. **Google API permission errors**:
   - Verify service account email is added to sheet
   - Check that Sheets API is enabled
   - Ensure service account has correct permissions

3. **Base64 encoding issues**:
   ```bash
   # Verify encoding worked correctly
   echo "GOOGLE_CREDENTIALS_BASE64_VALUE" | base64 -d | jq .
   ```

4. **Port conflicts**:
   ```bash
   # Check what's using port 3001
   lsof -i :3001
   # Change PORT in .env file if needed
   ```

### Log Analysis

```bash
# View detailed logs using script
./deploy.sh logs

# Direct podman commands
podman logs --tail=100 storage-dashboard

# Search for specific errors
podman logs storage-dashboard 2>&1 | grep -i error

# Using podman-compose
podman-compose logs --tail=100 storage-dashboard
```

### Recovery Procedures

1. **Complete reset**:
   ```bash
   # Using deployment script
   ./deploy.sh cleanup && ./deploy.sh
   
   # Manual reset
   podman-compose down -v
   podman-compose up --build -d
   ```

2. **Data resync**:
   ```bash
   curl -X POST http://localhost:3001/api/storage/sync
   ```

## Next Steps

After successful setup:

1. **Monitor Performance**: Check `/api/sync/stats` regularly
2. **User Feedback**: Collect feedback from sales team
3. **Data Validation**: Verify data accuracy between sheets and dashboard
4. **Scale Planning**: Consider load balancing for high usage

## Getting Help

If you encounter issues:

1. Check the main README.md troubleshooting section
2. Review application logs for specific error messages
3. Test Google Sheets API access directly
4. Verify network connectivity and firewall settings