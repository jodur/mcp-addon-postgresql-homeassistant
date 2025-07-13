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
exports.initializeDatabase = initializeDatabase;
exports.getPool = getPool;
exports.withDatabase = withDatabase;
exports.executeQuery = executeQuery;
exports.closeDatabase = closeDatabase;
exports.isDatabaseConnected = isDatabaseConnected;
exports.getDatabaseInfo = getDatabaseInfo;
exports.getTableInfo = getTableInfo;
exports.getForeignKeys = getForeignKeys;
exports.getIndexes = getIndexes;
var pg_1 = require("pg");
var types_js_1 = require("../types.js");
var pool = null;
/**
 * Initialize database connection pool
 */
function initializeDatabase(databaseUrl_1) {
    return __awaiter(this, arguments, void 0, function (databaseUrl, maxConnections) {
        var client, error_1;
        if (maxConnections === void 0) { maxConnections = 10; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, , 6]);
                    if (!pool) return [3 /*break*/, 2];
                    return [4 /*yield*/, pool.end()];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2:
                    pool = new pg_1.Pool({
                        connectionString: databaseUrl,
                        max: maxConnections,
                        idleTimeoutMillis: 30000,
                        connectionTimeoutMillis: 10000,
                        ssl: databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : false
                    });
                    return [4 /*yield*/, pool.connect()];
                case 3:
                    client = _a.sent();
                    return [4 /*yield*/, client.query('SELECT 1')];
                case 4:
                    _a.sent();
                    client.release();
                    console.log('Database connection pool initialized successfully');
                    return [3 /*break*/, 6];
                case 5:
                    error_1 = _a.sent();
                    console.error('Failed to initialize database:', error_1);
                    throw error_1;
                case 6: return [2 /*return*/];
            }
        });
    });
}
/**
 * Get database connection pool
 */
function getPool() {
    if (!pool) {
        throw new Error('Database not initialized. Call initializeDatabase first.');
    }
    return pool;
}
/**
 * Execute database operation with connection management
 */
function withDatabase(operation) {
    return __awaiter(this, void 0, void 0, function () {
        var client;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!pool) {
                        throw new Error('Database not initialized');
                    }
                    return [4 /*yield*/, pool.connect()];
                case 1:
                    client = _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, , 4, 5]);
                    return [4 /*yield*/, operation(client)];
                case 3: return [2 /*return*/, _a.sent()];
                case 4:
                    client.release();
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Execute a query with error handling and timing
 */
function executeQuery(sql_1) {
    return __awaiter(this, arguments, void 0, function (sql, params) {
        var startTime, result, executionTime, error_2, executionTime;
        var _this = this;
        if (params === void 0) { params = []; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    startTime = Date.now();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, withDatabase(function (client) { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, client.query(sql, params)];
                                    case 1: return [2 /*return*/, _a.sent()];
                                }
                            });
                        }); })];
                case 2:
                    result = _a.sent();
                    executionTime = Date.now() - startTime;
                    return [2 /*return*/, {
                            rows: result.rows,
                            rowCount: result.rowCount || 0,
                            executionTime: executionTime
                        }];
                case 3:
                    error_2 = _a.sent();
                    executionTime = Date.now() - startTime;
                    console.error('Database query error:', {
                        sql: sql.substring(0, 200),
                        error: error_2,
                        executionTime: executionTime
                    });
                    throw new Error((0, types_js_1.formatDatabaseError)(error_2));
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Close database connection pool
 */
function closeDatabase() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!pool) return [3 /*break*/, 2];
                    return [4 /*yield*/, pool.end()];
                case 1:
                    _a.sent();
                    pool = null;
                    console.log('Database connection pool closed');
                    _a.label = 2;
                case 2: return [2 /*return*/];
            }
        });
    });
}
/**
 * Check if database is connected
 */
function isDatabaseConnected() {
    return __awaiter(this, void 0, void 0, function () {
        var client, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!pool) {
                        return [2 /*return*/, false];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, pool.connect()];
                case 2:
                    client = _a.sent();
                    return [4 /*yield*/, client.query('SELECT 1')];
                case 3:
                    _a.sent();
                    client.release();
                    return [2 /*return*/, true];
                case 4:
                    error_3 = _a.sent();
                    console.error('Database connection check failed:', error_3);
                    return [2 /*return*/, false];
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Get database information
 */
function getDatabaseInfo() {
    return __awaiter(this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, executeQuery("\n    SELECT \n      version() as version,\n      current_database() as current_database,\n      current_user as current_user,\n      (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) as total_connections\n  ")];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.rows[0]];
            }
        });
    });
}
/**
 * Get table information for a schema
 */
function getTableInfo() {
    return __awaiter(this, arguments, void 0, function (schemaName) {
        var query, result;
        if (schemaName === void 0) { schemaName = 'public'; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    query = "\n    SELECT \n      t.table_name,\n      t.table_schema,\n      t.table_type,\n      c.column_name,\n      c.data_type,\n      c.is_nullable,\n      c.column_default,\n      c.character_maximum_length,\n      CASE \n        WHEN pk.column_name IS NOT NULL THEN true \n        ELSE false \n      END as is_primary_key,\n      CASE \n        WHEN fk.column_name IS NOT NULL THEN true \n        ELSE false \n      END as is_foreign_key\n    FROM information_schema.tables t\n    LEFT JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema\n    LEFT JOIN (\n      SELECT ku.table_name, ku.column_name, ku.table_schema\n      FROM information_schema.table_constraints tc\n      JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name\n      WHERE tc.constraint_type = 'PRIMARY KEY'\n    ) pk ON t.table_name = pk.table_name AND t.table_schema = pk.table_schema AND c.column_name = pk.column_name\n    LEFT JOIN (\n      SELECT ku.table_name, ku.column_name, ku.table_schema\n      FROM information_schema.table_constraints tc\n      JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name\n      WHERE tc.constraint_type = 'FOREIGN KEY'\n    ) fk ON t.table_name = fk.table_name AND t.table_schema = fk.table_schema AND c.column_name = fk.column_name\n    WHERE t.table_schema = $1\n      AND t.table_type = 'BASE TABLE'\n    ORDER BY t.table_name, c.ordinal_position\n  ";
                    return [4 /*yield*/, executeQuery(query, [schemaName])];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.rows];
            }
        });
    });
}
/**
 * Get foreign key relationships
 */
function getForeignKeys() {
    return __awaiter(this, arguments, void 0, function (schemaName) {
        var query, result;
        if (schemaName === void 0) { schemaName = 'public'; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    query = "\n    SELECT \n      tc.constraint_name,\n      tc.table_name,\n      kcu.column_name,\n      ccu.table_name AS foreign_table_name,\n      ccu.column_name AS foreign_column_name\n    FROM information_schema.table_constraints AS tc\n    JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name\n    JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name\n    WHERE tc.constraint_type = 'FOREIGN KEY'\n      AND tc.table_schema = $1\n    ORDER BY tc.table_name, kcu.ordinal_position\n  ";
                    return [4 /*yield*/, executeQuery(query, [schemaName])];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.rows];
            }
        });
    });
}
/**
 * Get indexes for tables
 */
function getIndexes() {
    return __awaiter(this, arguments, void 0, function (schemaName) {
        var query, result;
        if (schemaName === void 0) { schemaName = 'public'; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    query = "\n    SELECT \n      t.relname AS table_name,\n      i.relname AS index_name,\n      ix.indisunique AS is_unique,\n      ix.indisprimary AS is_primary,\n      a.attname AS column_name\n    FROM pg_class t\n    JOIN pg_index ix ON t.oid = ix.indrelid\n    JOIN pg_class i ON i.oid = ix.indexrelid\n    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)\n    JOIN pg_namespace n ON n.oid = t.relnamespace\n    WHERE n.nspname = $1\n      AND t.relkind = 'r'\n    ORDER BY t.relname, i.relname, a.attnum\n  ";
                    return [4 /*yield*/, executeQuery(query, [schemaName])];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.rows];
            }
        });
    });
}
