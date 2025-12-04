# F1 Genie Chat Backend - Deployment Guide

## Prerequisites

1. Azure subscription
2. Databricks workspace with configured Genie space
3. Service principal with OAuth M2M credentials
4. Azure CLI installed and logged in

## Configuration Required

Before deploying, you need the following from your Databricks workspace:

- `DATABRICKS_HOST`: Your Databricks workspace URL (e.g., `https://adb-1234567890123456.7.azuredatabricks.net`)
- `DATABRICKS_CLIENT_ID`: Service principal application/client ID
- `DATABRICKS_CLIENT_SECRET`: OAuth secret for the service principal
- `DATABRICKS_GENIE_SPACE_ID`: Your Genie space ID (found in the Genie UI URL)

## Deployment Steps

### Option 1: Deploy via Azure Portal (Recommended)

1. **Create Function App in Azure Portal**:
   - Go to Azure Portal > Create a resource > Function App
   - Settings:
     - Name: `f1-genie-backend`
     - Runtime: Node.js 20
     - Region: East US 2
     - Plan: Consumption (Serverless)
   - Click "Create"

2. **Configure Application Settings**:
   - Go to your Function App > Configuration > Application settings
   - Add the following settings:
     ```
     DATABRICKS_HOST=<your-databricks-workspace-url>
     DATABRICKS_CLIENT_ID=<your-client-id>
     DATABRICKS_CLIENT_SECRET=<your-client-secret>
     DATABRICKS_GENIE_SPACE_ID=<your-genie-space-id>
     ```
   - Click "Save"

3. **Configure CORS**:
   - Go to your Function App > CORS
   - Add allowed origin: `https://black-sea-02e823d0f.3.azurestaticapps.net`
   - Save changes

4. **Deploy Code**:
   ```powershell
   cd backend
   func azure functionapp publish f1-genie-backend
   ```

### Option 2: Deploy via Azure CLI

1. **Create storage account** (if not exists):
   ```powershell
   az storage account create `
     --name f1geniestore `
     --resource-group f1-history-rg `
     --location eastus2 `
     --sku Standard_LRS
   ```

2. **Create Function App**:
   ```powershell
   az functionapp create `
     --name f1-genie-backend `
     --resource-group f1-history-rg `
     --consumption-plan-location eastus2 `
     --runtime node `
     --runtime-version 20 `
     --functions-version 4 `
     --storage-account f1geniestore `
     --os-type Windows
   ```

3. **Configure settings**:
   ```powershell
   az functionapp config appsettings set `
     --name f1-genie-backend `
     --resource-group f1-history-rg `
     --settings `
       DATABRICKS_HOST="<your-workspace-url>" `
       DATABRICKS_CLIENT_ID="<your-client-id>" `
       DATABRICKS_CLIENT_SECRET="<your-client-secret>" `
       DATABRICKS_GENIE_SPACE_ID="<your-space-id>"
   ```

4. **Configure CORS**:
   ```powershell
   az functionapp cors add `
     --name f1-genie-backend `
     --resource-group f1-history-rg `
     --allowed-origins "https://black-sea-02e823d0f.3.azurestaticapps.net"
   ```

5. **Deploy**:
   ```powershell
   cd backend
   func azure functionapp publish f1-genie-backend
   ```

## Update Frontend

After deploying the backend, update the API endpoint in `script.js`:

```javascript
const GENIE_API_BASE = 'https://f1-genie-backend.azurewebsites.net/api';
```

Then commit and push to GitHub to trigger automatic deployment.

## Testing

1. Test backend health:
   ```
   curl https://f1-genie-backend.azurewebsites.net/api/startChat -X POST -H "Content-Type: application/json" -d '{"message":"test"}'
   ```

2. Open your static site and click the chat button
3. Try sample questions about F1 history

## Troubleshooting

### Functions not found
- Check that all three functions deployed: `startChat`, `sendMessage`, `getStatus`
- Run: `func azure functionapp list-functions f1-genie-backend`

### Authentication errors
- Verify Databricks credentials in Function App configuration
- Test OAuth token generation separately
- Check service principal has access to Genie space

### CORS errors
- Verify static web app URL is in CORS allowed origins
- Check browser console for specific error messages

### Timeout errors
- Genie queries can take 30-60 seconds
- Check Function App timeout settings (default 5 minutes for Consumption plan)

## Local Development

1. Copy `local.settings.json` and fill in your Databricks credentials
2. Run locally:
   ```powershell
   cd backend
   npm install
   func start
   ```
3. Update frontend `GENIE_API_BASE` to `http://localhost:7071/api`
4. Open `index.html` in browser

## Architecture

```
User Browser
    ↓
Static Web App (Azure)
    ↓
Azure Functions (this backend)
    ↓
Databricks Genie API
    ↓
F1 Historical Data
```

## API Endpoints

- `POST /api/startChat` - Start new conversation
  - Body: `{ "message": "your question" }`
  - Returns: `{ "conversationId", "messageId", "response": {...} }`

- `POST /api/sendMessage` - Continue conversation
  - Body: `{ "conversationId": "...", "message": "follow-up question" }`
  - Returns: `{ "conversationId", "messageId", "response": {...} }`

- `GET /api/getStatus` - Check message status
  - Query: `?conversationId=...&messageId=...`
  - Returns: `{ "status", "response": {...} }`

## Cost Considerations

- **Azure Functions**: Consumption plan - first 1M executions free/month
- **Storage Account**: ~$0.05/month for minimal usage
- **Databricks Genie**: Currently in public preview (free tier available)
- **Static Web App**: Free tier

Estimated monthly cost: < $5 for light usage
