require('dotenv').config()
const fs = require('fs');
const restify = require('restify');
const axios = require('axios').default;
const crypto = require('crypto');

const GoogleSheetsService = require('./googleSheetsService');

// Initialize Google Sheets service
const sheetsService = new GoogleSheetsService();
sheetsService.initialize().catch(console.error);

// Configuration validation
function validateConfig() {
    const requiredEnvVars = ['GOOGLE_SHEET_ID'];
    const missing = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missing.length > 0) {
        console.error('Missing required environment variables:', missing);
        process.exit(1);
    }
}

validateConfig();

// Generic function to get entries from a sheet
async function getEntries(req, res, next) {
    try {
        const { spreadsheetId, sheetName, range } = req.query;

        if (!spreadsheetId || !sheetName) {
            return res.send(400, {
                error: 'Missing required parameters: spreadsheetId and sheetName'
            });
        }

        const targetRange = range || `${sheetName}!A:Z`;
        const result = await sheetsService.getSheetData(spreadsheetId, targetRange);

        res.send({
            success: true,
            data: result.values,
            range: result.range
        });
    } catch (error) {
        console.error('Error getting entries:', error);
        res.send(500, {
            error: 'Failed to retrieve entries',
            message: error.message
        });
    }
    next();
}

// Generic function to create/add an entry to a sheet
async function createEntry(req, res, next) {
    try {
        const {
            spreadsheetId = process.env.GOOGLE_SHEET_ID,
            sheetName = process.env.GOOGLE_SHEET_SHEET || 'Sheet1',
            data,
            options = {}
        } = req.body;

        if (!spreadsheetId || !sheetName) {
            return res.send(400, {
                error: 'Missing required parameters: spreadsheetId and sheetName'
            });
        }

        if (!data || !Array.isArray(data)) {
            return res.send(400, {
                error: 'Data must be provided as an array'
            });
        }

        const result = await sheetsService.appendRow(spreadsheetId, sheetName, data, options);

        res.send({
            success: true,
            message: 'Entry added successfully',
            updatedCells: result.updatedCells,
            updatedRange: result.updatedRange
        });
    } catch (error) {
        console.error('Error creating entry:', error);
        res.send(500, {
            error: 'Failed to create entry',
            message: error.message
        });
    }
    next();
}

// Function to create a new sheet
async function createSheet(req, res, next) {
    try {
        const {
            spreadsheetId = process.env.GOOGLE_SHEET_ID,
            sheetName,
            headers = []
        } = req.body;

        if (!spreadsheetId || !sheetName) {
            return res.send(400, {
                error: 'Missing required parameters: spreadsheetId and sheetName'
            });
        }

        const result = await sheetsService.createSheet(spreadsheetId, sheetName, headers);

        res.send({
            success: true,
            message: result.message
        });
    } catch (error) {
        console.error('Error creating sheet:', error);
        res.send(500, {
            error: 'Failed to create sheet',
            message: error.message
        });
    }
    next();
}

function oauthRedirect(req, res, next) {
    const code = req.query.code
    res.send(`OAuth Code: ${code}`)
    next()
}

// Health check endpoint
function healthCheck(req, res, next) {
    res.send({
        status: 'healthy',
        service: 'Google Sheets API Proxy',
        timestamp: new Date().toISOString()
    });
    next();
}

// Determine if we're in development mode
const isDev = process.env.NODE_ENV === 'development' || process.env.DEV_MODE === 'true';
const port = process.env.PORT || (isDev ? 8080 : 443);

let server;

if (isDev) {
    console.log('Starting server in development mode (HTTP)...');
    server = restify.createServer();
} else {
    console.log('Starting server in production mode (HTTPS)...');
    try {
        const https_options = {
            key: fs.readFileSync('/etc/letsencrypt/live/your-domain.com/privkey.pem'),
            certificate: fs.readFileSync('/etc/letsencrypt/live/your-domain.com/fullchain.pem')
        };
        server = restify.createServer(https_options);
    } catch (error) {
        console.error('Failed to load SSL certificates. Make sure certificates exist or run in dev mode.');
        console.error('To run in dev mode, set NODE_ENV=development or DEV_MODE=true');
        process.exit(1);
    }
}

server.use(restify.plugins.bodyParser({ mapParams: false }));
server.use(restify.plugins.queryParser());

// Add CORS support
server.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

    if (req.method === 'OPTIONS') {
        res.send(200);
        return next(false);
    }

    return next();
});

// Routes
server.get('/health', healthCheck);
server.get('/oauth', oauthRedirect);
server.get('/', function (req, res, next) {
    res.send({
        service: 'Google Sheets API Proxy',
        version: '1.0.0',
        endpoints: {
            'GET /health': 'Health check',
            'GET /entries': 'Get entries from a sheet (query params: spreadsheetId, sheetName, range)',
            'POST /entries': 'Add entry to a sheet (body: { spreadsheetId, sheetName, data, options })',
            'POST /sheets': 'Create a new sheet (body: { spreadsheetId, sheetName, headers })'
        }
    });
    next();
});
server.get('/entries', getEntries);
server.post('/entries', createEntry);
server.post('/sheets', createSheet);
// server.post('/shopify-order', handleShopifyOrder);

server.listen(port, function () {
    console.log('%s listening at %s', server.name, server.url);
    console.log(`Google Sheets API Proxy is ready to accept requests`);
    console.log(`Mode: ${isDev ? 'Development (HTTP)' : 'Production (HTTPS)'}`);
    console.log(`Port: ${port}`);
    if (isDev) {
        console.log('Access the API at: http://localhost:' + port);
    }
});
