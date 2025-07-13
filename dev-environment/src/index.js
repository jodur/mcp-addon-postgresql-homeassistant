"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var cors_1 = require("cors");
var helmet_1 = require("helmet");
var morgan_1 = require("morgan");
var dotenv_1 = require("dotenv");
var mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
var register_tools_js_1 = require("./tools/register-tools.js");
var connection_js_1 = require("./database/connection.js");
var home_assistant_auth_js_1 = require("./auth/home-assistant-auth.js");
var types_js_1 = require("./types.js");
// Load environment variables
dotenv_1.default.config();
// Environment variables with defaults
var PORT = process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT) : 3000;
var LOG_LEVEL = process.env.LOG_LEVEL || 'info';
var DATABASE_URL = process.env.DATABASE_URL || '';
var MAX_CONNECTIONS = process.env.MAX_CONNECTIONS ? parseInt(process.env.MAX_CONNECTIONS) : 10;
var ENABLE_WRITE_OPERATIONS = process.env.ENABLE_WRITE_OPERATIONS === 'true';
var ALLOWED_USERS = process.env.ALLOWED_USERS ? process.env.ALLOWED_USERS.split(',') : [];
// Create Express app
var app = (0, express_1.default)();
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
// Logging middleware
app.use((0, morgan_1.default)(LOG_LEVEL === 'debug' ? 'combined' : 'short'));
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Create MCP Server instance
var mcpServer = new mcp_js_1.McpServer({
    name: 'PostgreSQL MCP Server for Home Assistant',
    version: '1.0.0',
    capabilities: {
        tools: {},
        resources: {},
        prompts: {}
    }
});
// Initialize database connection
var dbInitialized = false;
function initializeApp() {
    return __awaiter(this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, , 6]);
                    if (!DATABASE_URL) return [3 /*break*/, 2];
                    return [4 /*yield*/, (0, connection_js_1.initializeDatabase)(DATABASE_URL, MAX_CONNECTIONS)];
                case 1:
                    _a.sent();
                    dbInitialized = true;
                    console.log('Database initialized successfully');
                    return [3 /*break*/, 3];
                case 2:
                    console.warn('DATABASE_URL not provided, database features will be disabled');
                    _a.label = 3;
                case 3: 
                // Register MCP tools
                return [4 /*yield*/, (0, register_tools_js_1.registerAllTools)(mcpServer, {
                        databaseUrl: DATABASE_URL,
                        enableWriteOperations: ENABLE_WRITE_OPERATIONS,
                        allowedUsers: ALLOWED_USERS,
                        maxConnections: MAX_CONNECTIONS
                    })];
                case 4:
                    // Register MCP tools
                    _a.sent();
                    console.log('MCP tools registered successfully');
                    return [3 /*break*/, 6];
                case 5:
                    error_1 = _a.sent();
                    console.error('Failed to initialize app:', error_1);
                    process.exit(1);
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    });
}
// Health check endpoint
app.get('/health', function (req, res) {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: dbInitialized ? 'connected' : 'disconnected',
        version: '1.0.0'
    });
});
// MCP endpoint with Home Assistant authentication
app.post('/mcp', home_assistant_auth_js_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, method, params, _b, tools, result, resources, resource, prompts, prompt_1, error_2;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 16, , 17]);
                _a = req.body, method = _a.method, params = _a.params;
                if (!method) {
                    return [2 /*return*/, res.status(400).json((0, types_js_1.createErrorResponse)('Method is required'))];
                }
                _b = method;
                switch (_b) {
                    case 'initialize': return [3 /*break*/, 1];
                    case 'tools/list': return [3 /*break*/, 2];
                    case 'tools/call': return [3 /*break*/, 4];
                    case 'resources/list': return [3 /*break*/, 6];
                    case 'resources/read': return [3 /*break*/, 8];
                    case 'prompts/list': return [3 /*break*/, 10];
                    case 'prompts/get': return [3 /*break*/, 12];
                }
                return [3 /*break*/, 14];
            case 1:
                res.json((0, types_js_1.createSuccessResponse)({
                    protocolVersion: '2024-11-05',
                    capabilities: mcpServer.capabilities,
                    serverInfo: {
                        name: 'PostgreSQL MCP Server for Home Assistant',
                        version: '1.0.0'
                    }
                }));
                return [3 /*break*/, 15];
            case 2: return [4 /*yield*/, mcpServer.listTools()];
            case 3:
                tools = _c.sent();
                res.json((0, types_js_1.createSuccessResponse)(tools));
                return [3 /*break*/, 15];
            case 4:
                if (!params || !params.name) {
                    return [2 /*return*/, res.status(400).json((0, types_js_1.createErrorResponse)('Tool name is required'))];
                }
                return [4 /*yield*/, mcpServer.callTool(params.name, params.arguments || {})];
            case 5:
                result = _c.sent();
                res.json((0, types_js_1.createSuccessResponse)(result));
                return [3 /*break*/, 15];
            case 6: return [4 /*yield*/, mcpServer.listResources()];
            case 7:
                resources = _c.sent();
                res.json((0, types_js_1.createSuccessResponse)(resources));
                return [3 /*break*/, 15];
            case 8:
                if (!params || !params.uri) {
                    return [2 /*return*/, res.status(400).json((0, types_js_1.createErrorResponse)('Resource URI is required'))];
                }
                return [4 /*yield*/, mcpServer.readResource(params.uri)];
            case 9:
                resource = _c.sent();
                res.json((0, types_js_1.createSuccessResponse)(resource));
                return [3 /*break*/, 15];
            case 10: return [4 /*yield*/, mcpServer.listPrompts()];
            case 11:
                prompts = _c.sent();
                res.json((0, types_js_1.createSuccessResponse)(prompts));
                return [3 /*break*/, 15];
            case 12:
                if (!params || !params.name) {
                    return [2 /*return*/, res.status(400).json((0, types_js_1.createErrorResponse)('Prompt name is required'))];
                }
                return [4 /*yield*/, mcpServer.getPrompt(params.name, params.arguments || {})];
            case 13:
                prompt_1 = _c.sent();
                res.json((0, types_js_1.createSuccessResponse)(prompt_1));
                return [3 /*break*/, 15];
            case 14:
                res.status(400).json((0, types_js_1.createErrorResponse)("Unknown method: ".concat(method)));
                _c.label = 15;
            case 15: return [3 /*break*/, 17];
            case 16:
                error_2 = _c.sent();
                console.error('MCP request error:', error_2);
                res.status(500).json((0, types_js_1.createErrorResponse)(error_2 instanceof Error ? error_2.message : 'Internal server error'));
                return [3 /*break*/, 17];
            case 17: return [2 /*return*/];
        }
    });
}); });
// Error handling middleware
app.use(function (error, req, res, next) {
    console.error('Unhandled error:', error);
    res.status(500).json((0, types_js_1.createErrorResponse)('Internal server error'));
});
// 404 handler
app.use(function (req, res) {
    res.status(404).json((0, types_js_1.createErrorResponse)('Endpoint not found'));
});
// Start server
function startServer() {
    return __awaiter(this, void 0, void 0, function () {
        var error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, initializeApp()];
                case 1:
                    _a.sent();
                    app.listen(PORT, function () {
                        console.log("PostgreSQL MCP Server started on port ".concat(PORT));
                        console.log("Health check: http://localhost:".concat(PORT, "/health"));
                        console.log("MCP endpoint: http://localhost:".concat(PORT, "/mcp"));
                        console.log("Database: ".concat(dbInitialized ? 'Connected' : 'Disconnected'));
                        console.log("Write operations: ".concat(ENABLE_WRITE_OPERATIONS ? 'Enabled' : 'Disabled'));
                        console.log("Allowed users: ".concat(ALLOWED_USERS.length ? ALLOWED_USERS.join(', ') : 'All authenticated users'));
                    });
                    return [3 /*break*/, 3];
                case 2:
                    error_3 = _a.sent();
                    console.error('Failed to start server:', error_3);
                    process.exit(1);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// Graceful shutdown
process.on('SIGINT', function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        console.log('Shutting down gracefully...');
        process.exit(0);
        return [2 /*return*/];
    });
}); });
process.on('SIGTERM', function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        console.log('Shutting down gracefully...');
        process.exit(0);
        return [2 /*return*/];
    });
}); });
// Start the server
startServer().catch(function (error) {
    console.error('Fatal error:', error);
    process.exit(1);
});
