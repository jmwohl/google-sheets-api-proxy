const fs = require('fs');
const { google } = require('googleapis');

class GoogleSheetsService {
    constructor(credentialsPath = 'credentials.json') {
        this.credentialsPath = credentialsPath;
        this.sheets = null;
        this.jwtClient = null;
    }

    async initialize() {
        try {
            const keyFile = fs.readFileSync(this.credentialsPath);
            const credentials = JSON.parse(keyFile);

            const client_email = credentials.client_email;
            const private_key = credentials.private_key;

            // Create a JWT (JSON Web Token) client
            this.jwtClient = new google.auth.JWT(client_email, null, private_key, [
                'https://www.googleapis.com/auth/spreadsheets',
            ]);

            // Authenticate the client
            await this.jwtClient.authorize();

            // Create an instance of the sheets API
            this.sheets = google.sheets({ version: 'v4', auth: this.jwtClient });

            console.log('Google Sheets service initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Google Sheets service:', error);
            throw error;
        }
    }

    async appendRow(spreadsheetId, sheetName, data, options = {}) {
        if (!this.sheets) {
            throw new Error('Google Sheets service not initialized. Call initialize() first.');
        }

        try {
            const {
                includeTimestamp = false,
                timestampColumn = 0,
                valueInputOption = 'USER_ENTERED',
                range = null,
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
                if (timestampColumn === 0) {
                    rowData.unshift(timestamp);
                } else if (timestampColumn === -1) {
                    rowData.push(timestamp);
                } else {
                    rowData.splice(timestampColumn, 0, timestamp);
                }
            }

            // Determine the range if not provided
            const targetRange = range || `${sheetName}!A1:${this.getColumnLetter(rowData.length - 1)}1`;

            const writeRequest = {
                spreadsheetId,
                range: targetRange,
                valueInputOption,
                resource: {
                    values: [rowData],
                },
            };

            const response = await this.sheets.spreadsheets.values.append(writeRequest);

            console.log('Successfully added row to Google Sheet');
            console.log('Updated cells:', response.data.updatedCells);

            return {
                success: true,
                updatedCells: response.data.updatedCells,
                updatedRange: response.data.updates.updatedRange
            };
        } catch (error) {
            console.error('Error writing to Google Sheet:', error);
            throw error;
        }
    }

    async getSheetData(spreadsheetId, range) {
        if (!this.sheets) {
            throw new Error('Google Sheets service not initialized. Call initialize() first.');
        }

        try {
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId,
                range,
            });

            return {
                success: true,
                values: response.data.values || [],
                range: response.data.range
            };
        } catch (error) {
            console.error('Error reading from Google Sheet:', error);
            throw error;
        }
    }

    async createSheet(spreadsheetId, sheetName, headers = []) {
        if (!this.sheets) {
            throw new Error('Google Sheets service not initialized. Call initialize() first.');
        }

        try {
            // First, create the sheet
            const addSheetRequest = {
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

            await this.sheets.spreadsheets.batchUpdate(addSheetRequest);

            // If headers are provided, add them
            if (headers.length > 0) {
                await this.appendRow(spreadsheetId, sheetName, headers);
            }

            return { success: true, message: `Sheet '${sheetName}' created successfully` };
        } catch (error) {
            console.error('Error creating sheet:', error);
            throw error;
        }
    }

    // Helper method to convert column number to letter (A, B, C, ...)
    getColumnLetter(columnNumber) {
        let columnName = '';
        while (columnNumber >= 0) {
            columnName = String.fromCharCode((columnNumber % 26) + 65) + columnName;
            columnNumber = Math.floor(columnNumber / 26) - 1;
        }
        return columnName;
    }
}

module.exports = GoogleSheetsService;
