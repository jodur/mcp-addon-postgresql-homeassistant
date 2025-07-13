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
exports.registerAllTools = registerAllTools;
var database_tools_js_1 = require("./database-tools.js");
/**
 * Register all MCP tools with the server
 */
function registerAllTools(server, config) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            try {
                // Register database tools if database URL is provided
                if (config.databaseUrl) {
                    (0, database_tools_js_1.registerDatabaseTools)(server, config);
                    console.log('Database tools registered successfully');
                }
                else {
                    console.log('Database URL not provided, skipping database tools registration');
                }
                // Register health check tool
                server.tool('health', 'Check the health status of the MCP server', {}, function () { return __awaiter(_this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        return [2 /*return*/, {
                                content: [{
                                        type: 'text',
                                        text: JSON.stringify({
                                            status: 'healthy',
                                            timestamp: new Date().toISOString(),
                                            database: config.databaseUrl ? 'configured' : 'not configured',
                                            writeOperations: config.enableWriteOperations ? 'enabled' : 'disabled',
                                            allowedUsers: config.allowedUsers.length > 0 ? config.allowedUsers : 'all authenticated users',
                                            maxConnections: config.maxConnections
                                        }, null, 2)
                                    }]
                            }];
                    });
                }); });
                // Register server info tool
                server.tool('serverInfo', 'Get information about the MCP server configuration', {}, function () { return __awaiter(_this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        return [2 /*return*/, {
                                content: [{
                                        type: 'text',
                                        text: "PostgreSQL MCP Server for Home Assistant\n\nConfiguration:\n- Database: ".concat(config.databaseUrl ? 'Connected' : 'Not configured', "\n- Write Operations: ").concat(config.enableWriteOperations ? 'Enabled' : 'Disabled', "\n- Max Connections: ").concat(config.maxConnections, "\n- Allowed Users: ").concat(config.allowedUsers.length > 0 ? config.allowedUsers.join(', ') : 'All authenticated users', "\n\nAvailable Tools:\n- listTables: List all tables in the database\n- queryDatabase: Execute read-only SQL queries\n").concat(config.enableWriteOperations ? '- executeDatabase: Execute write SQL statements' : '', "\n- health: Check server health\n- serverInfo: Get server information\n\nAuthentication:\nThis server uses Home Assistant's authentication system. Ensure you have a valid Home Assistant access token.")
                                    }]
                            }];
                    });
                }); });
                console.log('All MCP tools registered successfully');
            }
            catch (error) {
                console.error('Error registering MCP tools:', error);
                throw error;
            }
            return [2 /*return*/];
        });
    });
}
