import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import * as dotenv from 'dotenv';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { authenticateToken } from './auth/home-assistant-auth';
import { initializeDatabase } from './database/connection';
import { registerDatabaseTools } from './tools/database-tools';

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

// Log startup configuration
console.log('=== PostgreSQL MCP Server (SDK Compliant) ===');
console.log(`Server Port: ${PORT}`);
console.log(`Database URL: ${DATABASE_URL ? '[CONFIGURED]' : '[NOT SET]'}`);
console.log(`Write Operations: ${ENABLE_WRITE_OPERATIONS ? 'ENABLED' : 'DISABLED'}`);
console.log(`Home Assistant URL: ${HA_BASE_URL}`);
console.log('============================================');

// Create Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: '*',
  exposedHeaders: ['Mcp-Session-Id'],
  allowedHeaders: ['Content-Type', 'Authorization', 'mcp-session-id'],
}));

app.use(express.json({ limit: '10mb' }));

// Store transports by session ID
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

// Initialize database
let dbInitialized = false;

async function initializeApp(): Promise<void> {
  try {
    if (DATABASE_URL) {
      console.log('Initializing database connection...');
      await initializeDatabase(DATABASE_URL, MAX_CONNECTIONS);
      dbInitialized = true;
      console.log('✓ Database initialized successfully');
    } else {
      console.warn('⚠️  DATABASE_URL not provided, database features will be disabled');
    }
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
  }
}

// Create MCP Server with proper SDK usage
function createMCPServer(): McpServer {
  const server = new McpServer({
    name: 'PostgreSQL MCP Server for Home Assistant',
    version: '1.4.0',
  });

  // Create configuration object for database tools
  const config = {
    enableWriteOperations: ENABLE_WRITE_OPERATIONS,
    allowedUsers: ALLOWED_USERS,
    databaseUrl: DATABASE_URL,
    maxConnections: MAX_CONNECTIONS
  };

  // Register comprehensive database tools
  registerDatabaseTools(server, config);

  // Register database schema resource
  server.registerResource(
    'database-schema',
    'schema://database',
    {
      title: 'Database Schema',
      description: 'PostgreSQL database schema information',
      mimeType: 'text/plain'
    },
    async (uri) => {
      if (!dbInitialized) {
        return {
          contents: [{
            uri: uri.href,
            text: 'Database not connected. Please configure DATABASE_URL.',
            mimeType: 'text/plain'
          }]
        };
      }

      return {
        contents: [{
          uri: uri.href,
          text: 'Database schema information would be here...',
          mimeType: 'text/plain'
        }]
      };
    }
  );

  // Register a SQL prompt template
  server.registerPrompt(
    'generate-query',
    {
      title: 'Generate SQL Query',
      description: 'Generate a SQL query based on requirements',
      argsSchema: {
        table: z.string().describe('Table name'),
        operation: z.enum(['SELECT', 'INSERT', 'UPDATE', 'DELETE']).describe('SQL operation'),
        conditions: z.string().optional().describe('WHERE conditions')
      }
    },
    ({ table, operation, conditions }) => {
      let queryTemplate = '';
      switch (operation) {
        case 'SELECT':
          queryTemplate = `SELECT * FROM ${table}${conditions ? ` WHERE ${conditions}` : ''}`;
          break;
        case 'INSERT':
          queryTemplate = `INSERT INTO ${table} (column1, column2) VALUES (value1, value2)`;
          break;
        case 'UPDATE':
          queryTemplate = `UPDATE ${table} SET column1 = value1${conditions ? ` WHERE ${conditions}` : ''}`;
          break;
        case 'DELETE':
          queryTemplate = `DELETE FROM ${table}${conditions ? ` WHERE ${conditions}` : ''}`;
          break;
      }

      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `Generate a ${operation} query for table '${table}'. Here's a template:\n\n${queryTemplate}\n\nPlease modify as needed.`
          }
        }]
      };
    }
  );

  return server;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: dbInitialized ? 'connected' : 'disconnected',
    version: '1.4.0',
    sdk_compliant: true
  });
});

// MCP endpoint with proper SDK transport
app.post('/mcp', async (req, res) => {
  // Home Assistant authentication middleware
  const authResult = await new Promise<boolean>((resolve) => {
    authenticateToken(req, res, (error?: any) => {
      resolve(!error);
    });
  });

  if (!authResult) {
    return; // Response already sent by auth middleware
  }

  // Check for existing session ID
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports[sessionId]) {
    // Reuse existing transport
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    // New initialization request
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        transports[sessionId] = transport;
        console.log(`✓ New MCP session initialized: ${sessionId}`);
      },
      enableDnsRebindingProtection: false,
    });

    // Clean up transport when closed
    transport.onclose = () => {
      if (transport.sessionId) {
        console.log(`✓ MCP session closed: ${transport.sessionId}`);
        delete transports[transport.sessionId];
      }
    };

    const server = createMCPServer();
    await server.connect(transport);
  } else {
    // Invalid request
    res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Bad Request: No valid session ID provided',
      },
      id: null,
    });
    return;
  }

  // Handle the request using SDK transport
  await transport.handleRequest(req, res, req.body);
});

// Handle GET requests for server-to-client notifications via SSE
app.get('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  
  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
});

// Handle DELETE requests for session termination
app.delete('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  
  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    jsonrpc: '2.0',
    error: {
      code: -32000,
      message: 'Endpoint not found'
    },
    id: null
  });
});

// Start server
async function startServer(): Promise<void> {
  try {
    await initializeApp();
    
    app.listen(PORT, () => {
      console.log('');
      console.log('🚀 PostgreSQL MCP Server (SDK Compliant) Started!');
      console.log('================================================');
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
      console.log(`  🛠️  SDK Compliant: ✅ YES`);
      console.log('================================================');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
