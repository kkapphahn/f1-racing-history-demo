# Azure Static Web Apps Configuration

This file configures the Azure Static Web Apps deployment and API integration.

## Deployment Configuration

- **App Location**: `/` (root directory contains index.html, styles.css, script.js)
- **API Location**: `/api` (contains Azure Functions for Genie integration)
- **Output Location**: `` (no build output, static files served directly)

## API Functions

The `/api` folder contains managed Azure Functions that run within the Static Web App:

- `startChat` - POST endpoint to start new Genie conversation
- `sendMessage` - POST endpoint to send follow-up messages
- `getStatus` - GET endpoint to check message status

## Environment Variables

Configure these in Azure Portal > Static Web App > Configuration:

```
DATABRICKS_HOST=https://your-workspace.azuredatabricks.net
DATABRICKS_TOKEN=your-personal-access-token
DATABRICKS_GENIE_SPACE_ID=your-genie-space-id
```

### How to Get Your Personal Access Token:

1. In Databricks workspace, click your username (top-right)
2. Go to "Settings" > "Developer" > "Access tokens"
3. Click "Generate new token"
4. Give it a name (e.g., "F1 Chat") and optionally set expiration
5. Copy the token value immediately (you won't see it again)

## Local Development

1. Install dependencies:
   ```powershell
   cd api
   npm install
   ```

2. Configure local settings:
   - Update `api/local.settings.json` with your Databricks credentials

3. Install Azure Static Web Apps CLI:
   ```powershell
   npm install -g @azure/static-web-apps-cli
   ```

4. Start local development server:
   ```powershell
   swa start . --api-location ./api
   ```

5. Open http://localhost:4280 in your browser

## Deployment

The GitHub Actions workflow automatically deploys both frontend and API when you push to the `master` branch.

### Manual Configuration After First Deploy

1. Go to Azure Portal > Your Static Web App > Configuration
2. Add the four Databricks environment variables listed above
3. Save and restart the Static Web App

## CORS

CORS is automatically handled by Azure Static Web Apps - API endpoints are served from the same domain as the frontend, so no CORS configuration needed!

## Cost

Azure Static Web Apps Free tier includes:
- 100 GB bandwidth/month
- Custom domains
- Managed API functions (up to 2 per app on Free tier, more on Standard)

Perfect for this use case!
