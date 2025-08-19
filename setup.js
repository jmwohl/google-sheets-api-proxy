#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Google Sheets API Proxy Setup Helper\n');

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
    console.error('❌ Please run this script from the project root directory');
    process.exit(1);
}

// Check for credentials.json
if (!fs.existsSync('credentials.json')) {
    console.log('❌ credentials.json not found');
    console.log('\n📋 Google Service Account Setup Instructions:');
    console.log('1. Go to Google Cloud Console (https://console.cloud.google.com)');
    console.log('2. Create a new project or select existing one');
    console.log('3. Enable Google Sheets API');
    console.log('4. Go to "Credentials" -> "Create Credentials" -> "Service Account"');
    console.log('5. Download the JSON key file');
    console.log('6. Rename it to "credentials.json" and place it in this directory');
    console.log('7. Re-run this setup script\n');
    process.exit(1);
} else {
    console.log('✅ credentials.json found');

    // Read and validate credentials
    try {
        const credentials = JSON.parse(fs.readFileSync('credentials.json', 'utf8'));
        if (credentials.client_email && credentials.private_key) {
            console.log('✅ Valid service account credentials');
            console.log(`   Service Account Email: ${credentials.client_email}`);
            console.log('\n📋 Make sure to share your Google Sheet with this email address!');
        } else {
            console.log('⚠️  credentials.json exists but may be invalid');
        }
    } catch (error) {
        console.log('⚠️  credentials.json exists but is not valid JSON');
    }
}

// Check for .env file
if (!fs.existsSync('.env')) {
    console.log('\n📝 Creating .env file...');
    const envContent = `# Google Sheets Configuration
GOOGLE_SHEET_ID=your_spreadsheet_id_here
GOOGLE_SHEET_SHEET=Sheet1

# Development mode (HTTP, no SSL required)
NODE_ENV=development
DEV_MODE=true
PORT=8080
`;
    fs.writeFileSync('.env', envContent);
    console.log('✅ .env file created');
    console.log('📝 Please edit .env and set your GOOGLE_SHEET_ID');
} else {
    console.log('✅ .env file exists');

    // Check if GOOGLE_SHEET_ID is set
    const envContent = fs.readFileSync('.env', 'utf8');
    if (envContent.includes('GOOGLE_SHEET_ID=your_spreadsheet_id_here') ||
        !envContent.includes('GOOGLE_SHEET_ID=')) {
        console.log('⚠️  GOOGLE_SHEET_ID not configured in .env file');
        console.log('📝 Please edit .env and set your actual spreadsheet ID');
    }
}

console.log('\n🎯 Next Steps:');
console.log('1. Create a Google Sheet or use existing one');
console.log('2. Copy the spreadsheet ID from the URL:');
console.log('   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit');
console.log('3. Share the spreadsheet with your service account email (see above)');
console.log('4. Give "Editor" permissions to the service account');
console.log('5. Update GOOGLE_SHEET_ID in .env file');
console.log('6. Run: npm run dev');
console.log('7. Test: npm test');

console.log('\n🔧 Development Commands:');
console.log('  npm run dev       - Start server in development mode (HTTP)');
console.log('  npm run dev:watch - Start with auto-restart on changes');
console.log('  npm test          - Run API tests');
console.log('  npm run prod      - Start in production mode (HTTPS)');

console.log('\n✨ Setup complete! Happy coding!');
