#!/usr/bin/env node

/**
 * Test script for the PostgreSQL MCP Server Development Environment
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🧪 Testing PostgreSQL MCP Server (Development Environment)...\n');

// Check if .env file exists
if (!fs.existsSync('.env')) {
  console.log('⚠️  No .env file found. Copying from .env.example...');
  fs.copyFileSync('.env.example', '.env');
  console.log('✅ Created .env file. Please edit it with your configuration.');
  console.log('📝 Minimum required: DATABASE_URL\n');
}

// Check if node_modules exists
if (!fs.existsSync('node_modules')) {
  console.log('📦 Installing dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed\n');
  } catch (error) {
    console.error('❌ Failed to install dependencies');
    process.exit(1);
  }
}

// Build TypeScript
console.log('🔨 Building TypeScript...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ TypeScript build successful\n');
} catch (error) {
  console.error('❌ TypeScript build failed');
  process.exit(1);
}

console.log('🎉 Development environment is ready!\n');
console.log('📋 Next steps:');
console.log('   1. Edit .env file with your database configuration');
console.log('   2. Ensure PostgreSQL is running');
console.log('   3. Run "npm run dev" to start the development server');
console.log('   4. Test with: curl http://localhost:3000/health');
console.log('\n🔗 Example commands:');
console.log('   npm run dev          # Start with auto-reload');
console.log('   npm start            # Start production build');
console.log('   npm run db:setup     # Set up test database schema');
console.log('\n📖 See README.md for detailed testing instructions.');
