# Netlify Deployment Guide

This guide will help you deploy the Google Sheets API Proxy to Netlify as serverless functions.

## Prerequisites

1. A Netlify account (free tier available)
2. Google Cloud Project with Sheets API enabled
3. Google Service Account credentials
4. Your repository pushed to GitHub

## Deployment Steps

### 1. Prepare Your Repository

Make sure all files are committed and pushed to GitHub:

```bash
git add .
git commit -m "Add Netlify deployment configuration"
git push origin main
```

### 2. Connect to Netlify

1. Go to [Netlify](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Choose "Deploy with GitHub"
4. Select your `google-sheets-api-proxy` repository
5. Configure build settings:
   - **Branch**: `main`
   - **Build command**: `npm run build`
   - **Publish directory**: `public`
   - **Functions directory**: `netlify/functions`

### 3. Set Environment Variables

In your Netlify dashboard, go to **Site settings** → **Environment variables** and add:

```
GOOGLE_PROJECT_ID=your-google-project-id
GOOGLE_PRIVATE_KEY_ID=your-private-key-id
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key-content\n-----END PRIVATE KEY-----"
GOOGLE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com
```

**Important**: For `GOOGLE_PRIVATE_KEY`, make sure to include the full key with `\n` for line breaks.

### 4. Deploy

Click **"Deploy site"** in Netlify. The deployment will:
1. Install dependencies
2. Build the static site
3. Deploy your serverless functions

### 5. Test Your Deployment

Once deployed, your API will be available at:
- **Site URL**: `https://your-site-name.netlify.app`
- **API Endpoints**: `https://your-site-name.netlify.app/api/[endpoint]`

Test the health check:
```bash
curl https://your-site-name.netlify.app/api/health
```

## API Endpoints

All endpoints are now serverless functions:

- `GET /api/health` - Health check
- `POST /api/entries` - Add entries to a sheet
- `GET /api/get-entries?spreadsheetId=...&sheetName=...` - Get entries from a sheet
- `POST /api/sheets` - Create a new sheet

## Local Development

To test locally with Netlify dev environment:

```bash
npm install
npm run netlify:dev
```

This will start a local server that simulates the Netlify environment.

## Differences from Server Version

- **Serverless Functions**: Each endpoint is now a separate function
- **Environment Variables**: Credentials are stored as environment variables instead of files
- **No Persistent State**: Each function execution is independent
- **CORS Enabled**: All functions include CORS headers for web usage

## Troubleshooting

1. **Function Timeout**: Netlify functions have a 10-second timeout on free tier
2. **Environment Variables**: Make sure all Google credentials are properly set
3. **CORS Issues**: All functions include CORS headers, but test with actual domains
4. **Build Errors**: Check the Netlify build logs for dependency issues

## Costs

- **Netlify Free Tier**: 125,000 function invocations per month
- **Netlify Pro**: $19/month for more invocations and features
- **Google Sheets API**: Free quota should be sufficient for most use cases

Your Google Sheets API Proxy is now ready for production use on Netlify! 🎉
