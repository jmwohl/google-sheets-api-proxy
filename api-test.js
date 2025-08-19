require('dotenv').config()
const axios = require('axios');

// Configuration - automatically detect if we're testing dev or prod mode
const isDev = process.env.NODE_ENV === 'development' || process.env.DEV_MODE === 'true';
const port = process.env.PORT || (isDev ? 8080 : 443);
const protocol = isDev ? 'http' : 'https';
const BASE_URL = `${protocol}://localhost:${port}`;
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || 'your_spreadsheet_id_here';
const SHEET_NAME = 'TestSheet';

// Disable SSL verification for local HTTPS testing (remove in production)
if (!isDev) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

console.log(`Testing against: ${BASE_URL}`);
console.log(`Mode: ${isDev ? 'Development (HTTP)' : 'Production (HTTPS)'}`);

async function testAPI() {
    console.log('Testing Google Sheets API Proxy...\n');

    // Check configuration first
    if (!checkConfiguration()) {
        return;
    }

    try {
        // Test 1: Health Check
        console.log('1. Testing health check...');
        const healthResponse = await axios.get(`${BASE_URL}/health`);
        console.log('Health:', healthResponse.data);
        console.log('✅ Health check passed\n');

        // Test 2: Create a new sheet (with better error handling)
        console.log('2. Creating a new sheet...');
        try {
            const createSheetResponse = await axios.post(`${BASE_URL}/sheets`, {
                spreadsheetId: SPREADSHEET_ID,
                sheetName: SHEET_NAME,
                headers: ['Timestamp', 'Name', 'Email', 'Message']
            });
            console.log('Create sheet:', createSheetResponse.data);
            console.log('✅ Sheet creation passed\n');
        } catch (sheetError) {
            if (sheetError.response?.status === 400) {
                const errorMsg = sheetError.response?.data?.message || '';
                if (errorMsg.includes('already exists') || errorMsg.includes('duplicate')) {
                    console.log('ℹ️ Sheet already exists, continuing...\n');
                } else if (errorMsg.includes('not found') || errorMsg.includes('Requested entity was not found')) {
                    console.error('❌ Spreadsheet not found or not accessible!');
                    console.log('\n💡 Check:');
                    console.log('1. Spreadsheet ID is correct:', SPREADSHEET_ID);
                    console.log('2. Spreadsheet is shared with service account email');
                    console.log('3. Service account has edit permissions');
                    return;
                } else {
                    console.log('⚠️ Sheet creation failed:', errorMsg);
                }
            } else {
                console.log('⚠️ Sheet creation failed:', sheetError.response?.data || sheetError.message);
            }
        }

        // Test 3: Add an entry with timestamp
        console.log('3. Adding entry with timestamp...');
        try {
            const addEntryResponse = await axios.post(`${BASE_URL}/entries`, {
                spreadsheetId: SPREADSHEET_ID,
                sheetName: SHEET_NAME,
                data: ['John Doe', 'john@example.com', 'Test message from API'],
                options: {
                    includeTimestamp: true,
                    timestampColumn: 0
                }
            });
            console.log('Add entry:', addEntryResponse.data);
            console.log('✅ Entry addition passed\n');
        } catch (entryError) {
            console.error('❌ Failed to add entry:', entryError.response?.data || entryError.message);

            if (entryError.response?.data?.message?.includes('not found') ||
                entryError.response?.data?.message?.includes('Requested entity was not found')) {
                console.log('\n💡 This error suggests:');
                console.log('1. Spreadsheet ID is incorrect:', SPREADSHEET_ID);
                console.log('2. Sheet name doesn\'t exist:', SHEET_NAME);
                console.log('3. Service account doesn\'t have access to the spreadsheet');
                console.log('4. Check that credentials.json is properly configured');
                return;
            }
        }

        // Test 4: Add another entry without explicit timestamp
        console.log('4. Adding entry without timestamp...');
        try {
            const addEntry2Response = await axios.post(`${BASE_URL}/entries`, {
                spreadsheetId: SPREADSHEET_ID,
                sheetName: SHEET_NAME,
                data: [new Date().toISOString(), 'Jane Smith', 'jane@example.com', 'Another test message']
            });
            console.log('Add entry 2:', addEntry2Response.data);
            console.log('✅ Second entry addition passed\n');
        } catch (entry2Error) {
            console.error('❌ Failed to add second entry:', entry2Error.response?.data || entry2Error.message);
        }

        // Test 5: Retrieve entries
        console.log('5. Retrieving entries...');
        try {
            const getEntriesResponse = await axios.get(`${BASE_URL}/entries`, {
                params: {
                    spreadsheetId: SPREADSHEET_ID,
                    sheetName: SHEET_NAME,
                    range: 'A:D'
                }
            });
            console.log('Retrieved entries:');
            console.log(JSON.stringify(getEntriesResponse.data, null, 2));
            console.log('✅ Entry retrieval passed\n');
        } catch (retrieveError) {
            console.error('❌ Failed to retrieve entries:', retrieveError.response?.data || retrieveError.message);
        }

        console.log('🎉 Tests completed!');

    } catch (error) {
        console.error('❌ Unexpected error:', error.response?.data || error.message);

        if (error.response?.status === 400) {
            console.log('\n💡 General troubleshooting:');
            console.log('1. Update SPREADSHEET_ID in this test file or .env');
            console.log('2. Ensure the spreadsheet is shared with your service account');
            console.log('3. Check that credentials.json is properly configured');
            console.log('4. Verify the service account has edit permissions');
        }
    }
}

// Configuration validation and setup helper
function checkConfiguration() {
    console.log('🔍 Configuration Check:\n');

    console.log('Spreadsheet ID:', SPREADSHEET_ID);
    console.log('Sheet Name:', SHEET_NAME);
    console.log('Base URL:', BASE_URL);
    console.log('Mode:', isDev ? 'Development' : 'Production');

    if (SPREADSHEET_ID === 'your_spreadsheet_id_here') {
        console.log('\n❌ SPREADSHEET_ID not configured!');
        console.log('\n📋 Setup Instructions:');
        console.log('1. Go to Google Sheets and create or open your spreadsheet');
        console.log('2. Copy the spreadsheet ID from the URL:');
        console.log('   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit');
        console.log('3. Either:');
        console.log('   a) Set GOOGLE_SHEET_ID in your .env file, OR');
        console.log('   b) Update SPREADSHEET_ID in api-test.js');
        console.log('4. Share the spreadsheet with your service account email');
        console.log('   (found in credentials.json as client_email)');
        console.log('5. Give the service account "Editor" permissions\n');
        return false;
    }

    // Check if credentials file exists
    const fs = require('fs');
    if (!fs.existsSync('credentials.json')) {
        console.log('\n❌ credentials.json file not found!');
        console.log('\n📋 Google Service Account Setup:');
        console.log('1. Go to Google Cloud Console');
        console.log('2. Enable Google Sheets API');
        console.log('3. Create a Service Account');
        console.log('4. Download the JSON key file');
        console.log('5. Rename it to credentials.json');
        console.log('6. Place it in the project root\n');
        return false;
    }

    console.log('✅ Configuration looks good!\n');
    return true;
}

// Example usage patterns
function showExampleUsage() {
    console.log('\n📚 Example Usage Patterns:');
    console.log('\n1. Simple data logging:');
    console.log(`
POST ${BASE_URL}/entries
{
  "data": ["Event Name", "Description", "Value"],
  "options": { "includeTimestamp": true }
}
    `);

    console.log('\n2. Form submission logging:');
    console.log(`
POST ${BASE_URL}/entries
{
  "spreadsheetId": "${SPREADSHEET_ID}",
  "sheetName": "FormSubmissions",
  "data": ["John Doe", "john@example.com", "Contact Form", "Please call me"],
  "options": {
    "includeTimestamp": true,
    "timestampColumn": 0
  }
}
    `);

    console.log('\n3. Creating a new data sheet:');
    console.log(`
POST ${BASE_URL}/sheets
{
  "sheetName": "UserFeedback",
  "headers": ["Date", "User", "Rating", "Comments", "Status"]
}
    `);
}

// Run tests if this file is executed directly
if (require.main === module) {
    const configIsValid = checkConfiguration();
    if (configIsValid) {
        testAPI().then(() => {
            showExampleUsage();
        }).catch(console.error);
    }
}

module.exports = { testAPI, showExampleUsage, checkConfiguration };
