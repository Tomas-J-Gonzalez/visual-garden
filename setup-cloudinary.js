#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Cloudinary Setup for Visual Garden Upload Tool');
console.log('');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

if (!fs.existsSync(envPath)) {
    console.log('📝 Creating .env file for Cloudinary credentials...');
    
    const envContent = `# Cloudinary Configuration
# Get these from your Cloudinary dashboard: https://cloudinary.com/console
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
`;

    fs.writeFileSync(envPath, envContent);
    
    console.log('✅ Created .env file');
    console.log('');
    console.log('🔑 Please edit .env file with your Cloudinary credentials:');
    console.log('   1. Go to https://cloudinary.com/console');
    console.log('   2. Copy your API Key and API Secret');
    console.log('   3. Replace the placeholder values in .env file');
    console.log('');
    console.log('⚠️  Make sure .env is in your .gitignore to keep credentials secure!');
} else {
    console.log('✅ .env file already exists');
}

console.log('');
console.log('🚀 After setting up credentials, run: npm run upload:server');
