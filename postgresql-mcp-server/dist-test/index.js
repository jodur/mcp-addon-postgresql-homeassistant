"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const node_crypto_1 = require("node:crypto");
const dotenv = __importStar(require("dotenv"));
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const streamableHttp_js_1 = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const v3_1 = require("zod/v3");
const home_assistant_auth_1 = require("./auth/home-assistant-auth");
const oauth_provider_1 = require("./auth/oauth-provider");
const connection_1 = require("./database/connection");
const database_tools_1 = require("./tools/database-tools");
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
console.log(`OAuth (generic MCP clients): always enabled — public_url ${PUBLIC_URL || '[auto-detect per request]'}, ha_public_url ${HA_PUBLIC_URL || '[auto-detect via Supervisor API]'}`);
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
const app = (0, express_1.default)();
// Required so req.protocol/req.get('host') reflect X-Forwarded-Proto/Host from
// the Cloudflare Tunnel (or any reverse proxy) in front of the addon, rather
// than the internal http://<container>:3000 the addon itself sees. Used by
// the OAuth router to auto-derive its own public URL per-request.
// A permissive `true` lets clients spoof X-Forwarded-For and defeats per-IP
// rate limiting (express-rate-limit rejects it), so trust a bounded number of
// hops (default 1: the tunnel/reverse proxy) or an Express trust-proxy value.
const TRUST_PROXY_RAW = (process.env.TRUST_PROXY || '1').trim();
app.set('trust proxy', /^\d+$/.test(TRUST_PROXY_RAW) ? parseInt(TRUST_PROXY_RAW, 10) : TRUST_PROXY_RAW);
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: '*',
    exposedHeaders: ['Mcp-Session-Id', 'WWW-Authenticate'],
    allowedHeaders: ['Content-Type', 'Authorization', 'mcp-session-id', 'mcp-protocol-version', 'Accept', 'Last-Event-ID'],
}));
app.use(express_1.default.json({ limit: '10mb' }));
// OAuth token requests are application/x-www-form-urlencoded per RFC 6749 4.1.3.
app.use(express_1.default.urlencoded({ extended: false }));
// OAuth 2.1 endpoints for clients that require it (e.g. claude.ai web/mobile).
// Existing bearer-token clients (Claude Desktop/Code with --header, curl,
// SuperGateway, etc.) are entirely unaffected and keep working as before.
app.use((0, oauth_provider_1.createOAuthRouter)({
    publicUrlOverride: PUBLIC_URL,
    haPublicUrlOverride: HA_PUBLIC_URL,
    haBaseUrl: HA_BASE_URL,
    allowedRedirectUris: OAUTH_ALLOWED_REDIRECT_URIS,
    strictRedirectUris: process.env.OAUTH_STRICT_REDIRECT_URIS === 'true',
    clientsFile: process.env.OAUTH_CLIENTS_FILE || '/data/oauth-clients.json',
}));
// Store transports by session ID
const transports = {};
// Authentication tracking
let authAttempts = 0;
let authSuccesses = 0;
let authFailures = 0;
// Helper function for debug logging
function debugLog(message, ...args) {
    if (isDebugMode) {
        console.log(message, ...args);
    }
}
// Initialize database
let dbInitialized = false;
async function initializeApp() {
    try {
        if (DATABASE_URL) {
            console.log('Initializing database connection...');
            await (0, connection_1.initializeDatabase)(DATABASE_URL, MAX_CONNECTIONS);
            dbInitialized = true;
            console.log('✓ Database initialized successfully');
        }
        else {
            console.warn('⚠️  DATABASE_URL not provided, database features will be disabled');
        }
    }
    catch (error) {
        console.error('❌ Failed to initialize database:', error);
    }
}
// Create MCP Server with proper SDK usage
function createMCPServer() {
    const server = new mcp_js_1.McpServer({
        name: 'PostgreSQL MCP Server for Home Assistant',
        version: '1.6.1',
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
    (0, database_tools_1.registerDatabaseTools)(server, config);
    // Register database schema resource
    server.registerResource('database-schema', 'schema://database', {
        title: 'Database Schema',
        description: 'PostgreSQL database schema information',
        mimeType: 'text/plain'
    }, async (uri) => {
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
    });
    // Register a SQL prompt template
    server.registerPrompt('generate-query', {
        title: 'Generate SQL Query',
        description: 'Generate a SQL query based on requirements',
        argsSchema: {
            table: v3_1.z.string().describe('Table name'),
            operation: v3_1.z.enum(['SELECT', 'INSERT', 'UPDATE', 'DELETE']).describe('SQL operation'),
            conditions: v3_1.z.string().optional().describe('WHERE conditions')
        }
    }, ({ table, operation, conditions }) => {
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
    });
    return server;
}
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: dbInitialized ? 'connected' : 'disconnected',
        version: '1.6.1',
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
    const authResult = await new Promise((resolve) => {
        (0, home_assistant_auth_1.authenticateToken)(req, res, (error) => {
            if (error) {
                authFailures++;
                if (isDebugMode) {
                    console.log(`❌ Authentication failed (${authFailures}/${authAttempts}):`, error.message || error);
                }
            }
            else {
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
    const sessionId = req.headers['mcp-session-id'];
    let transport;
    if (isDebugMode) {
        console.log('🔗 === MCP Session Management ===');
        console.log(`📋 Session ID: ${sessionId || 'NEW SESSION'}`);
        console.log(`🔍 Existing Sessions: ${Object.keys(transports).length}`);
    }
    if (sessionId && transports[sessionId]) {
        // Reuse existing transport
        transport = transports[sessionId];
        debugLog(`♻️  Reusing existing session: ${sessionId}`);
    }
    else if (!sessionId && (0, types_js_1.isInitializeRequest)(req.body)) {
        // New initialization request
        debugLog('🆕 Creating new MCP session...');
        transport = new streamableHttp_js_1.StreamableHTTPServerTransport({
            sessionIdGenerator: () => (0, node_crypto_1.randomUUID)(),
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
    }
    else {
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
    const sessionId = req.headers['mcp-session-id'];
    if (!sessionId || !transports[sessionId]) {
        res.status(400).send('Invalid or missing session ID');
        return;
    }
    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
});
// Handle DELETE requests for session termination
app.delete('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'];
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
async function startServer() {
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
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=index.js.map