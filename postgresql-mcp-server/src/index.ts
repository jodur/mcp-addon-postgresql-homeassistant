import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import * as dotenv from 'dotenv';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod/v3';
import { authenticateToken } from './auth/home-assistant-auth';
import { createOAuthRouter } from './auth/oauth-provider';
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
const ENABLE_TIMESCALE = process.env.ENABLE_TIMESCALE === 'true';
const ALLOWED_USERS = process.env.ALLOWED_USERS ? process.env.ALLOWED_USERS.split(',') : [];
const HA_BASE_URL = process.env.HA_BASE_URL || 'http://supervisor/core';
// Browser-reachable URLs (via e.g. the Cloudflare tunnel), required only for
// the OAuth flow. The existing bearer-token flow (HA_BASE_URL, above) keeps
// working exactly as before and does not need these.
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
const HA_PUBLIC_URL = (process.env.HA_PUBLIC_URL || '').replace(/\/$/, '');
const OAUTH_ALLOWED_REDIRECT_URIS = process.env.OAUTH_ALLOWED_REDIRECT_URIS
  ? process.env.OAUTH_ALLOWED_REDIRECT_URIS.split(',').map((s) => s.trim()).filter(Boolean)
  : [];

// Debug mode helper
const isDebugMode = LOG_LEVEL === 'debug';

// Log startup configuration
console.log('=== PostgreSQL MCP Server (SDK Compliant) ===');
console.log(`Server Port: ${PORT}`);
console.log(`Database URL: ${DATABASE_URL ? '[CONFIGURED]' : '[NOT SET]'}`);
console.log(`Write Operations: ${ENABLE_WRITE_OPERATIONS ? 'ENABLED' : 'DISABLED'}`);
console.log(`TimescaleDB Support: ${ENABLE_TIMESCALE ? 'ENABLED' : 'DISABLED'}`);
console.log(`Home Assistant URL: ${HA_BASE_URL}`);
console.log(`OAuth (for claude.ai): always enabled — public_url ${PUBLIC_URL || '[auto-detect per request]'}, ha_public_url ${HA_PUBLIC_URL || '[auto-detect via Supervisor API]'}`);
console.log(`Log Level: ${LOG_LEVEL}`);
console.log(`Max Connections: ${MAX_CONNECTIONS}`);
console.log(`Allowed Users: ${ALLOWED_USERS.length ? ALLOWED_USERS.join(', ') : '[ALL AUTHENTICATED]'}`);
console.log(`Node Environment: ${process.env.NODE_ENV || 'production'}`);

if (isDebugMode) {
  console.log('');
  console.log('🔐 Authentication Configuration:');
  console.log(`  📡 HA Base URL: ${HA_BASE_URL}`);
  console.log(`  🔧 Development Mode: ${process.env.NODE_ENV === 'development' ? 'YES' : 'NO'}`);
  console.log(`  🔒 Security: ${process.env.NODE_ENV === 'development' ? 'RELAXED' : 'STRICT'}`);
  console.log(`  ⏱️  Token Timeout: 5 seconds`);
}
console.log('============================================');

// Create Express app
const app = express();
// Required so req.protocol/req.get('host') reflect X-Forwarded-Proto/Host from
// the Cloudflare Tunnel (or any reverse proxy) in front of the addon, rather
// than the internal http://<container>:3000 the addon itself sees. Used by
// the OAuth router to auto-derive its own public URL per-request.
app.set('trust proxy', true);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: '*',
  exposedHeaders: ['Mcp-Session-Id'],
  allowedHeaders: ['Content-Type', 'Authorization', 'mcp-session-id'],
}));

app.use(express.json({ limit: '10mb' }));
// OAuth token requests are application/x-www-form-urlencoded per RFC 6749 4.1.3.
app.use(express.urlencoded({ extended: false }));

// OAuth 2.1 endpoints for clients that require it (e.g. claude.ai web/mobile).
// Existing bearer-token clients (Claude Desktop/Code with --header, curl,
// SuperGateway, etc.) are entirely unaffected and keep working as before.
app.use(createOAuthRouter({
  publicUrlOverride: PUBLIC_URL,
  haPublicUrlOverride: HA_PUBLIC_URL,
  haBaseUrl: HA_BASE_URL,
  allowedRedirectUris: OAUTH_ALLOWED_REDIRECT_URIS,
}));

// Store transports by session ID
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

// Authentication tracking
let authAttempts = 0;
let authSuccesses = 0;
let authFailures = 0;

// Helper function for debug logging
function debugLog(message: string, ...args: any[]) {
  if (isDebugMode) {
    console.log(message, ...args);
  }
}

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
    version: '1.5.6',
  });

  // Create configuration object for database tools
  const config = {
    enableWriteOperations: ENABLE_WRITE_OPERATIONS,
    allowedUsers: ALLOWED_USERS,
    databaseUrl: DATABASE_URL,
    maxConnections: MAX_CONNECTIONS,
    enable_timescale: ENABLE_TIMESCALE
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
    version: '1.5.6',
    sdk_compliant: true,
    auth_stats: {
      total_attempts: authAttempts,
      successful: authSuccesses,
      failed: authFailures,
      success_rate: authAttempts > 0 ? ((authSuccesses / authAttempts) * 100).toFixed(1) + '%' : '0%'
    },
    active_sessions: Object.keys(transports).length
  });
});

// MCP endpoint with proper SDK transport
app.post('/mcp', async (req, res) => {
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';
  const authHeader = req.headers.authorization;
  
  authAttempts++;
  
  if (isDebugMode) {
    console.log('');
    console.log('🔐 === MCP Authentication Request ===');
    console.log(`📊 Attempt #${authAttempts} (Success: ${authSuccesses}, Failed: ${authFailures})`);
    console.log(`📍 Client IP: ${clientIp}`);
    console.log(`🌐 User Agent: ${userAgent}`);
    console.log(`🔑 Auth Header: ${authHeader ? `Bearer ${authHeader.substring(7, 17)}...` : 'MISSING'}`);
    console.log(`📋 Request Method: ${req.method}`);
    console.log(`🎯 Endpoint: ${req.path}`);
    console.log('=====================================');
  }

  // Home Assistant authentication middleware
  const authResult = await new Promise<boolean>((resolve) => {
    authenticateToken(req, res, (error?: any) => {
      if (error) {
        authFailures++;
        if (isDebugMode) {
          console.log(`❌ Authentication failed (${authFailures}/${authAttempts}):`, error.message || error);
        }
      } else {
        authSuccesses++;
        if (isDebugMode) {
          console.log(`✅ Authentication successful (${authSuccesses}/${authAttempts})`);
          if (req.user) {
            console.log(`👤 User Context: ${req.user.username} (${req.user.userId})`);
            console.log(`🔓 Permissions: ${req.user.permissions.join(', ')}`);
            console.log(`👑 Admin: ${req.user.isAdmin ? 'YES' : 'NO'}`);
          }
        }
      }
      if (isDebugMode) {
        console.log('=====================================');
      }
      resolve(!error);
    });
  });

  if (!authResult) {
    debugLog('🚫 Request rejected due to authentication failure');
    return; // Response already sent by auth middleware
  }

  // Check for existing session ID
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  if (isDebugMode) {
    console.log('🔗 === MCP Session Management ===');
    console.log(`📋 Session ID: ${sessionId || 'NEW SESSION'}`);
    console.log(`🔍 Existing Sessions: ${Object.keys(transports).length}`);
  }

  if (sessionId && transports[sessionId]) {
    // Reuse existing transport
    transport = transports[sessionId];
    debugLog(`♻️  Reusing existing session: ${sessionId}`);
  } else if (!sessionId && isInitializeRequest(req.body)) {
    // New initialization request
    debugLog('🆕 Creating new MCP session...');
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        transports[sessionId] = transport;
        console.log(`✓ New MCP session initialized: ${sessionId}`);
        debugLog(`📊 Total active sessions: ${Object.keys(transports).length}`);
      },
      enableDnsRebindingProtection: false,
    });

    // Clean up transport when closed
    transport.onclose = () => {
      if (transport.sessionId) {
        console.log(`✓ MCP session closed: ${transport.sessionId}`);
        debugLog(`📊 Remaining active sessions: ${Object.keys(transports).length}`);
      }
    };

    const server = createMCPServer();
    await server.connect(transport);
    debugLog('🔌 MCP server connected to transport');
  } else {
    // Invalid request
    debugLog('❌ Invalid MCP request - no session ID and not an initialize request');
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

  if (isDebugMode) {
    console.log('===============================');
    console.log('');
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
      if (isDebugMode) {
        console.log(`  📊 Auth Stats: ${authSuccesses} success, ${authFailures} failed, ${authAttempts} total`);
      }
      console.log('================================================');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
