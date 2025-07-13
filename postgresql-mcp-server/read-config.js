#!/usr/bin/env node

// Simple configuration reader for debugging
const fs = require('fs');
const path = require('path');

console.log('=== Configuration Reader Debug ===');

// Check for options.json in various locations
const possiblePaths = [
  '/data/options.json',
  '/config/options.json',
  './options.json',
  '/app/options.json'
];

let configFound = false;
let config = {};

for (const configPath of possiblePaths) {
  try {
    if (fs.existsSync(configPath)) {
      console.log(`✓ Found config at: ${configPath}`);
      const content = fs.readFileSync(configPath, 'utf8');
      config = JSON.parse(content);
      configFound = true;
      console.log('Configuration content:', JSON.stringify(config, null, 2));
      break;
    } else {
      console.log(`✗ No config at: ${configPath}`);
    }
  } catch (error) {
    console.log(`✗ Error reading ${configPath}:`, error.message);
  }
}

if (!configFound) {
  console.log('❌ No configuration file found in any expected location');
  console.log('Environment variables:');
  Object.keys(process.env)
    .filter(key => key.includes('CONFIG') || key.includes('ADDON') || key.includes('DATABASE'))
    .forEach(key => console.log(`  ${key}=${process.env[key]}`));
} else {
  console.log('✓ Configuration successfully loaded');
  
  // Set environment variables from config
  if (config.database_url) process.env.DATABASE_URL = config.database_url;
  if (config.server_port) process.env.SERVER_PORT = config.server_port.toString();
  if (config.log_level) process.env.LOG_LEVEL = config.log_level;
  if (config.max_connections) process.env.MAX_CONNECTIONS = config.max_connections.toString();
  if (config.enable_write_operations !== undefined) process.env.ENABLE_WRITE_OPERATIONS = config.enable_write_operations.toString();
  if (config.ha_base_url) process.env.HA_BASE_URL = config.ha_base_url;
  
  console.log('Environment variables set from config');
}

console.log('=====================================');
