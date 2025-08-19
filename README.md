# Google Sheets API Proxy

A generic REST API that serves as an intermediary for adding and retrieving entries from Google Sheets. This service allows you to interact with Google Sheets through simple HTTP requests without needing to handle Google API authentication in your client applications.

## Features

- Add entries to any Google Sheet
- Retrieve entries from Google Sheets
- Create new sheets within a spreadsheet
- Automatic timestamp insertion
- Flexible data structure support
- CORS enabled for web applications
- HTTPS support with SSL certificates

## Prerequisites

1. Google Cloud Project with Sheets API enabled
2. Service Account with credentials (JSON key file)
3. SSL certificates for HTTPS (Let's Encrypt recommended)

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Google Sheets Setup
1. Create a Google Cloud Project
2. Enable the Google Sheets API
3. Create a Service Account and download the JSON key file
4. Rename the key file to `credentials.json` and place it in the project root
5. Share your Google Sheets with the service account email (found in credentials.json)

### 3. Environment Variables
Create a `.env` file in the project root:
```env
GOOGLE_SHEET_ID=your_default_spreadsheet_id
GOOGLE_SHEET_SHEET=your_default_sheet_name

# For development mode (HTTP)
NODE_ENV=development
# OR
DEV_MODE=true

# Optional: Custom port (defaults: 8080 for dev, 443 for production)
PORT=8080
```

### 4. Running the Server

#### Development Mode (HTTP - Recommended for local testing)
```bash
npm run dev
# OR
npm run dev:watch  # Auto-restart on file changes
```
This runs the server on HTTP at `http://localhost:8080` (no SSL certificates required).

#### Production Mode (HTTPS)
For production deployment with SSL certificates:

1. Update the SSL certificate paths in `index.js` or set them via environment variables
2. Run:
```bash
npm run prod
# OR
npm start  # Uses forever for process management
```

## Quick Start (Development)

1. Clone the repository
2. Install dependencies: `npm install`
3. Add your Google credentials: `credentials.json`
4. Create `.env` file with your spreadsheet ID
5. Start in dev mode: `npm run dev`
6. Test the API: `npm test`

The server will be available at `http://localhost:8080`

### 5. SSL Certificates (Production Only)
For production HTTPS mode, ensure SSL certificates are available:
```javascript
// The server automatically looks for certificates at:
key: fs.readFileSync('/etc/letsencrypt/live/your-domain.com/privkey.pem'),
certificate: fs.readFileSync('/etc/letsencrypt/live/your-domain.com/fullchain.pem')
```

### 5. Start the Server
```bash
npm start
```

## API Endpoints

### Health Check
```
GET /health
```
Returns service status and timestamp.

### Get Entries
```
GET /entries?spreadsheetId=SHEET_ID&sheetName=SHEET_NAME&range=A:Z
```

**Query Parameters:**
- `spreadsheetId` (required): The Google Sheets spreadsheet ID
- `sheetName` (required): The name of the sheet/tab
- `range` (optional): Cell range to retrieve (default: A:Z)

**Response:**
```json
{
  "success": true,
  "data": [
    ["Header1", "Header2", "Header3"],
    ["Value1", "Value2", "Value3"]
  ],
  "range": "Sheet1!A1:C2"
}
```

### Add Entry
```
POST /entries
```

**Request Body:**
```json
{
  "spreadsheetId": "your_spreadsheet_id",
  "sheetName": "Sheet1",
  "data": ["value1", "value2", "value3"],
  "options": {
    "includeTimestamp": true,
    "timestampColumn": 0,
    "valueInputOption": "USER_ENTERED"
  }
}
```

**Parameters:**
- `spreadsheetId` (optional): Uses default from env if not provided
- `sheetName` (optional): Uses default from env if not provided
- `data` (required): Array of values to add as a new row
- `options` (optional): Additional options for the operation
  - `includeTimestamp`: Add current timestamp (default: false)
  - `timestampColumn`: Position for timestamp (0=beginning, -1=end, number=specific position)
  - `valueInputOption`: How to interpret input values (default: "USER_ENTERED")

**Response:**
```json
{
  "success": true,
  "message": "Entry added successfully",
  "updatedCells": 3,
  "updatedRange": "Sheet1!A2:C2"
}
```

### Create Sheet
```
POST /sheets
```

**Request Body:**
```json
{
  "spreadsheetId": "your_spreadsheet_id",
  "sheetName": "NewSheet",
  "headers": ["Column1", "Column2", "Column3"]
}
```

**Parameters:**
- `spreadsheetId` (optional): Uses default from env if not provided
- `sheetName` (required): Name for the new sheet
- `headers` (optional): Array of header values for the first row

**Response:**
```json
{
  "success": true,
  "message": "Sheet 'NewSheet' created successfully"
}
```

## Usage Examples

### Adding a Simple Entry
```bash
curl -X POST https://your-domain.com/entries \
  -H "Content-Type: application/json" \
  -d '{
    "data": ["2023-08-18", "Example", "Test data"]
  }'
```

### Adding an Entry with Timestamp
```bash
curl -X POST https://your-domain.com/entries \
  -H "Content-Type: application/json" \
  -d '{
    "spreadsheetId": "1ABC123...",
    "sheetName": "DataLog",
    "data": ["Event", "Description", "Value"],
    "options": {
      "includeTimestamp": true,
      "timestampColumn": 0
    }
  }'
```

### Creating a New Sheet
```bash
curl -X POST https://your-domain.com/sheets \
  -H "Content-Type: application/json" \
  -d '{
    "sheetName": "MonthlyData",
    "headers": ["Date", "Category", "Amount", "Notes"]
  }'
```

### Retrieving Data
```bash
curl "https://your-domain.com/entries?spreadsheetId=1ABC123...&sheetName=DataLog&range=A1:D10"
```

## Migration from Previous Version

If you're migrating from the mileage-specific version, here's how to adapt your existing calls:

**Old format:**
```json
{
  "miles": 120,
  "memo": "Trip to store",
  "vehicle": "Van"
}
```

**New format:**
```json
{
  "data": ["Van", "120", "Trip to store"],
  "options": {
    "includeTimestamp": true,
    "timestampColumn": 0
  }
}
```

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200`: Success
- `400`: Bad Request (missing parameters)
- `500`: Internal Server Error

Error responses include details:
```json
{
  "error": "Missing required parameters: spreadsheetId and sheetName",
  "message": "Additional error details"
}
```

## Security Considerations

1. The service account should have minimal necessary permissions
2. Use HTTPS in production
3. Consider implementing API authentication for production use
4. Validate and sanitize input data
5. Monitor API usage and implement rate limiting if needed

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

ISC
