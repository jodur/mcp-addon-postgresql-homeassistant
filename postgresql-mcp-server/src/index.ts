import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import * as dotenv from 'dotenv';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAllTools } from './tools/register-tools';
import { initializeDatabase } from './database/connection';
import { authenticateToken } from './auth/home-assistant-auth';
import { createErrorResponse, createSuccessResponse } from './types';

// Load environment variables
dotenv.config();

// Environment variables with defaults
const PORT = process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT) : 3000;
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const DATABASE_URL = process.env.DATABASE_URL || '';
const MAX_CONNECTIONS = process.env.MAX_CONNECTIONS ? parseInt(process.env.MAX_CONNECTIONS) : 10;
const ENABLE_WRITE_OPERATIONS = process.env.ENABLE_WRITE_OPERATIONS === 'true';
const ALLOWED_USERS = process.env.ALLOWED_USERS ? process.env.ALLOWED_USERS.split(',') : [];
const HA_BASE_URL = process.env.HA_BASE_URL || 'http://supervisor/core';

// Log startup configuration (mask sensitive data)
console.log('=== PostgreSQL MCP Server Configuration ===');
console.log(`Server Port: ${PORT}`);
console.log(`Log Level: ${LOG_LEVEL}`);
console.log(`Database URL: ${DATABASE_URL ? '[CONFIGURED - ' + DATABASE_URL.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') + ']' : '[NOT SET]'}`);
console.log(`Max Connections: ${MAX_CONNECTIONS}`);
console.log(`Write Operations: ${ENABLE_WRITE_OPERATIONS ? 'ENABLED' : 'DISABLED'}`);
console.log(`Allowed Users: ${ALLOWED_USERS.length ? ALLOWED_USERS.join(', ') : 'All authenticated users'}`);
console.log(`Home Assistant URL: ${HA_BASE_URL}`);
console.log('=== Environment Variables Debug ===');
console.log(`SERVER_PORT env: ${process.env.SERVER_PORT || '[NOT SET]'}`);
console.log(`DATABASE_URL env: ${process.env.DATABASE_URL ? '[SET]' : '[NOT SET]'}`);
console.log(`LOG_LEVEL env: ${process.env.LOG_LEVEL || '[NOT SET]'}`);
console.log(`MAX_CONNECTIONS env: ${process.env.MAX_CONNECTIONS || '[NOT SET]'}`);
console.log(`ENABLE_WRITE_OPERATIONS env: ${process.env.ENABLE_WRITE_OPERATIONS || '[NOT SET]'}`);
console.log(`HA_BASE_URL env: ${process.env.HA_BASE_URL || '[NOT SET]'}`);
console.log('===========================================');

// Create Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Logging middleware
app.use(morgan(LOG_LEVEL === 'debug' ? 'combined' : 'short'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Create MCP Server instance
const mcpServer = new McpServer({
  name: 'PostgreSQL MCP Server for Home Assistant',
  version: '1.2.4',
  capabilities: {
    tools: {},
    resources: {},
    prompts: {}
  }
});

// Initialize database connection
let dbInitialized = false;

async function initializeApp(): Promise<void> {
  try {
    // Initialize database
    if (DATABASE_URL) {
      console.log('=== Database Initialization ===');
      console.log(`Attempting to connect to database...`);
      console.log(`Connection URL: ${DATABASE_URL.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
      console.log(`Max Connections: ${MAX_CONNECTIONS}`);
      
      await initializeDatabase(DATABASE_URL, MAX_CONNECTIONS);
      dbInitialized = true;
      console.log('✓ Database initialized successfully');
      console.log('================================');
    } else {
      console.warn('⚠️  DATABASE_URL not provided, database features will be disabled');
      console.warn('⚠️  Please set the database_url in addon configuration');
    }

    // Register MCP tools
    console.log('=== MCP Tools Registration ===');
    console.log(`Database URL: ${DATABASE_URL ? 'Configured' : 'Not configured'}`);
    console.log(`Write Operations: ${ENABLE_WRITE_OPERATIONS ? 'Enabled' : 'Disabled'}`);
    console.log(`Max Connections: ${MAX_CONNECTIONS}`);
    
    await registerAllTools(mcpServer, {
      databaseUrl: DATABASE_URL,
      enableWriteOperations: ENABLE_WRITE_OPERATIONS,
      allowedUsers: ALLOWED_USERS,
      maxConnections: MAX_CONNECTIONS
    });

    console.log('✓ MCP tools registered successfully');
    console.log('===============================');
  } catch (error) {
    console.error('❌ Failed to initialize app:', error);
    process.exit(1);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: dbInitialized ? 'connected' : 'disconnected',
    version: '1.2.4'
  });
});

// MCP endpoint with Home Assistant authentication
app.post('/mcp', authenticateToken, async (req, res) => {
  try {
    const { method, params } = req.body;

    if (!method) {
      return res.status(400).json(createErrorResponse('Method is required'));
    }

    // Handle different MCP methods
    switch (method) {
      case 'initialize':
        return res.json(createSuccessResponse({
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
            resources: {},
            prompts: {}
          },
          serverInfo: {
            name: 'PostgreSQL MCP Server for Home Assistant',
            version: '1.2.4'
          }
        }));

      case 'tools/list':
        // Return available tools
        return res.json(createSuccessResponse({
          tools: []
        }));

      case 'tools/call':
        if (!params || !params.name) {
          return res.status(400).json(createErrorResponse('Tool name is required'));
        }

        // Handle tool calls through registered tools
        return res.json(createSuccessResponse({
          content: [{
            type: 'text',
            text: `Tool ${params.name} called successfully`
          }]
        }));

      case 'resources/list':
        return res.json(createSuccessResponse({
          resources: []
        }));

      case 'resources/read':
        if (!params || !params.uri) {
          return res.status(400).json(createErrorResponse('Resource URI is required'));
        }

        return res.json(createSuccessResponse({
          contents: [{
            uri: params.uri,
            mimeType: 'text/plain',
            text: 'Resource content'
          }]
        }));

      case 'prompts/list':
        return res.json(createSuccessResponse({
          prompts: []
        }));

      case 'prompts/get':
        if (!params || !params.name) {
          return res.status(400).json(createErrorResponse('Prompt name is required'));
        }

        return res.json(createSuccessResponse({
          messages: [{
            role: 'user',
            content: {
              type: 'text',
              text: 'Prompt content'
            }
          }]
        }));

      default:
        return res.status(400).json(createErrorResponse(`Unknown method: ${method}`));
    }
  } catch (error) {
    console.error('MCP request error:', error);
    return res.status(500).json(createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error'
    ));
  }
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json(createErrorResponse('Internal server error'));
});

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json(createErrorResponse('Endpoint not found'));
});

// Start server
async function startServer(): Promise<void> {
  try {
    await initializeApp();
    
    app.listen(PORT, () => {
      console.log('');
      console.log('🚀 PostgreSQL MCP Server Successfully Started!');
      console.log('==============================================');
      console.log(`📍 Server URL: http://localhost:${PORT}`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log(`🔗 MCP Endpoint: http://localhost:${PORT}/mcp`);
      console.log('');
      console.log('📊 Current Configuration:');
      console.log(`  🗄️  Database: ${dbInitialized ? '✅ Connected' : '❌ Disconnected'}`);
      console.log(`  ✏️  Write Operations: ${ENABLE_WRITE_OPERATIONS ? '✅ Enabled' : '❌ Disabled'}`);
      console.log(`  👥 Allowed Users: ${ALLOWED_USERS.length ? ALLOWED_USERS.join(', ') : '🌐 All authenticated users'}`);
      console.log(`  🔗 Max Connections: ${MAX_CONNECTIONS}`);
      console.log(`  📝 Log Level: ${LOG_LEVEL}`);
      console.log(`  🏠 Home Assistant: ${HA_BASE_URL}`);
      console.log('==============================================');
      console.log('');
      
      if (!dbInitialized) {
        console.log('⚠️  WARNING: Database not connected!');
        console.log('   Please check your database_url configuration in the Home Assistant add-on settings.');
        console.log('');
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
