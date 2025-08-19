const { google } = require('googleapis');

// Initialize Google Sheets service for serverless
async function initializeGoogleSheets() {
    try {
        const credentials = {
            type: "service_account",
            project_id: process.env.GOOGLE_PROJECT_ID,
            private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            client_id: process.env.GOOGLE_CLIENT_ID,
            auth_uri: "https://accounts.google.com/o/oauth2/auth",
            token_uri: "https://oauth2.googleapis.com/token",
            auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
            client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
            universe_domain: "googleapis.com"
        };

        const jwtClient = new google.auth.JWT(
            credentials.client_email, 
            null, 
            credentials.private_key, 
            ['https://www.googleapis.com/auth/spreadsheets']
        );

        await jwtClient.authorize();
        const sheets = google.sheets({ version: 'v4', auth: jwtClient });
        
        return sheets;
    } catch (error) {
        console.error('Failed to initialize Google Sheets service:', error);
        throw error;
    }
}

exports.handler = async (event, context) => {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const sheets = await initializeGoogleSheets();
        const body = JSON.parse(event.body);
        
        const { spreadsheetId, sheetName } = body;

        if (!spreadsheetId || !sheetName) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Missing required parameters: spreadsheetId and sheetName'
                })
            };
        }

        const request = {
            spreadsheetId,
            resource: {
                requests: [{
                    addSheet: {
                        properties: {
                            title: sheetName
                        }
                    }
                }]
            }
        };

        const response = await sheets.spreadsheets.batchUpdate(request);
        const newSheet = response.data.replies[0].addSheet;
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                sheetId: newSheet.properties.sheetId,
                sheetName: newSheet.properties.title,
                message: `Sheet "${sheetName}" created successfully`
            })
        };

    } catch (error) {
        console.error('Error creating sheet:', error);
        
        // Handle case where sheet already exists
        if (error.message && error.message.includes('already exists')) {
            return {
                statusCode: 409,
                headers,
                body: JSON.stringify({
                    error: `Sheet "${sheetName}" already exists`,
                    details: error.message
                })
            };
        }

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to create sheet',
                details: error.message
            })
        };
    }
};
