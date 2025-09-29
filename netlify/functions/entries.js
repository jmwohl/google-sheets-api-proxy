const { google } = require('googleapis');

// Initialize Google Sheets service for serverless
async function initializeGoogleSheets() {
    try {
        // In Netlify, credentials should be stored as environment variables
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

// Function to get row data from Google Sheets
async function getRowData(sheets, spreadsheetId, sheetName, options = {}) {
    const { 
        includeHeader = true, 
        range = null,
        startRow = null,
        endRow = null 
    } = options;

    // Build the range string
    let rangeString;
    if (range) {
        rangeString = `${sheetName}!${range}`;
    } else if (startRow !== null && endRow !== null) {
        rangeString = `${sheetName}!A${startRow}:Z${endRow}`;
    } else if (startRow !== null) {
        rangeString = `${sheetName}!A${startRow}:Z`;
    } else {
        rangeString = `${sheetName}!A:Z`;
    }

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: rangeString
    });

    const rows = response.data.values || [];
    
    if (rows.length === 0) {
        return {
            headers: [],
            data: [],
            totalRows: 0,
            message: 'No data found'
        };
    }

    let headers = [];
    let data = [];

    if (includeHeader && rows.length > 0) {
        headers = rows[0];
        data = rows.slice(1);
    } else {
        data = rows;
    }

    return {
        headers: includeHeader ? headers : null,
        data,
        totalRows: data.length,
        range: response.data.range
    };
}

// Function to delete rows by row number
async function deleteRowsByNumber(sheets, spreadsheetId, sheetName, rowNumbers) {
    // Get sheet ID for batch delete
    const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = sheetMetadata.data.sheets.find(s => s.properties.title === sheetName);
    
    if (!sheet) {
        throw new Error(`Sheet "${sheetName}" not found`);
    }
    
    const sheetId = sheet.properties.sheetId;

    // Sort row numbers in descending order to maintain indices during deletion
    const sortedRows = [...rowNumbers].sort((a, b) => b - a);

    // Create delete requests
    const deleteRequests = sortedRows.map(rowNumber => ({
        deleteDimension: {
            range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: rowNumber - 1, // Convert to 0-based index
                endIndex: rowNumber // End index is exclusive
            }
        }
    }));

    // Execute batch delete
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
            requests: deleteRequests
        }
    });

    return {
        deletedCount: rowNumbers.length,
        deletedRows: rowNumbers,
        message: `Successfully deleted ${rowNumbers.length} row(s): ${rowNumbers.join(', ')}`
    };
}

exports.handler = async (event, context) => {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (!['GET', 'POST', 'DELETE'].includes(event.httpMethod)) {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const sheets = await initializeGoogleSheets();

        // Handle GET requests
        if (event.httpMethod === 'GET') {
            const { spreadsheetId, sheetName, includeHeader, range, startRow, endRow } = event.queryStringParameters || {};

            if (!spreadsheetId || !sheetName) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        error: 'Missing required query parameters: spreadsheetId and sheetName'
                    })
                };
            }

            const options = {
                includeHeader: includeHeader !== 'false', // Default to true unless explicitly false
                range: range || null,
                startRow: startRow ? parseInt(startRow) : null,
                endRow: endRow ? parseInt(endRow) : null
            };

            const result = await getRowData(sheets, spreadsheetId, sheetName, options);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    ...result
                })
            };
        }

        // For POST and DELETE, get parameters from body
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

        // Handle DELETE requests
        if (event.httpMethod === 'DELETE') {
            const { rowNumbers } = body;

            if (!rowNumbers || !Array.isArray(rowNumbers) || rowNumbers.length === 0) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        error: 'Missing or invalid rowNumbers parameter. Must be an array of row numbers.'
                    })
                };
            }

            // Validate row numbers
            const invalidRows = rowNumbers.filter(row => !Number.isInteger(row) || row < 1);
            if (invalidRows.length > 0) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        error: `Invalid row numbers: ${invalidRows.join(', ')}. Row numbers must be positive integers.`
                    })
                };
            }

            const deleteResult = await deleteRowsByNumber(sheets, spreadsheetId, sheetName, rowNumbers);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    ...deleteResult
                })
            };
        }

        // Handle POST requests (existing functionality)
        const { data, options = {} } = body;

        if (!data) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Missing required parameter: data'
                })
            };
        }

        const {
            includeTimestamp = false,
            timestampColumn = 0,
            valueInputOption = 'USER_ENTERED',
            timezone = 'America/Chicago'
        } = options;

        let rowData = [...data];

        // Add timestamp if requested
        if (includeTimestamp) {
            // Create timestamp in the specified timezone (default: Chicago)
            const now = new Date();
            const timestamp = now.toLocaleString('en-US', {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
            rowData.splice(timestampColumn, 0, timestamp);
        }

        const range = `${sheetName}!A:Z`;
        const request = {
            spreadsheetId,
            range,
            valueInputOption,
            resource: {
                values: [rowData],
            },
        };

        const response = await sheets.spreadsheets.values.append(request);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                updatedCells: response.data.updatedCells,
                updatedRange: response.data.updatedRange,
                data: rowData
            })
        };

    } catch (error) {
        console.error('Error processing request:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to process request',
                details: error.message
            })
        };
    }
};
