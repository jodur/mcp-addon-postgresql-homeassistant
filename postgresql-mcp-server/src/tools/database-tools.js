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
exports.registerDatabaseTools = registerDatabaseTools;
var types_js_1 = require("../types.js");
var connection_js_1 = require("../database/connection.js");
/**
 * Register database tools with the MCP server
 */
function registerDatabaseTools(server, config) {
    var _this = this;
    // List tables tool - available to all authenticated users
    server.tool('listTables', 'List all tables in the database with their schema information', types_js_1.ListTablesSchema.shape, function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
        var tables, foreignKeys, indexes, tableMap_1, indexMap_1, result, error_1;
        var _c = _b.schema, schema = _c === void 0 ? 'public' : _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 4, , 5]);
                    return [4 /*yield*/, (0, connection_js_1.getTableInfo)(schema)];
                case 1:
                    tables = _d.sent();
                    return [4 /*yield*/, (0, connection_js_1.getForeignKeys)(schema)];
                case 2:
                    foreignKeys = _d.sent();
                    return [4 /*yield*/, (0, connection_js_1.getIndexes)(schema)];
                case 3:
                    indexes = _d.sent();
                    tableMap_1 = new Map();
                    tables.forEach(function (row) {
                        var tableName = row.table_name;
                        if (!tableMap_1.has(tableName)) {
                            tableMap_1.set(tableName, {
                                tableName: tableName,
                                schemaName: row.table_schema,
                                tableType: row.table_type,
                                columns: [],
                                primaryKeys: [],
                                foreignKeys: [],
                                indexes: []
                            });
                        }
                        var table = tableMap_1.get(tableName);
                        if (row.column_name) {
                            table.columns.push({
                                columnName: row.column_name,
                                dataType: row.data_type,
                                isNullable: row.is_nullable === 'YES',
                                defaultValue: row.column_default,
                                maxLength: row.character_maximum_length,
                                isPrimaryKey: row.is_primary_key,
                                isForeignKey: row.is_foreign_key
                            });
                            if (row.is_primary_key) {
                                table.primaryKeys.push(row.column_name);
                            }
                        }
                    });
                    // Add foreign keys
                    foreignKeys.forEach(function (fk) {
                        var table = tableMap_1.get(fk.table_name);
                        if (table) {
                            table.foreignKeys.push({
                                columnName: fk.column_name,
                                referencedTable: fk.foreign_table_name,
                                referencedColumn: fk.foreign_column_name,
                                constraintName: fk.constraint_name
                            });
                        }
                    });
                    indexMap_1 = new Map();
                    indexes.forEach(function (idx) {
                        var key = "".concat(idx.table_name, ".").concat(idx.index_name);
                        if (!indexMap_1.has(key)) {
                            indexMap_1.set(key, {
                                tableName: idx.table_name,
                                indexName: idx.index_name,
                                isUnique: idx.is_unique,
                                isPrimary: idx.is_primary,
                                columnNames: []
                            });
                        }
                        indexMap_1.get(key).columnNames.push(idx.column_name);
                    });
                    indexMap_1.forEach(function (idx) {
                        var table = tableMap_1.get(idx.tableName);
                        if (table) {
                            table.indexes.push({
                                indexName: idx.indexName,
                                columnNames: idx.columnNames,
                                isUnique: idx.isUnique,
                                indexType: idx.isPrimary ? 'PRIMARY' : 'INDEX'
                            });
                        }
                    });
                    result = Array.from(tableMap_1.values());
                    return [2 /*return*/, {
                            content: [{
                                    type: 'text',
                                    text: "Found ".concat(result.length, " tables in schema '").concat(schema, "':\n\n").concat(formatTableList(result))
                                }]
                        }];
                case 4:
                    error_1 = _d.sent();
                    return [2 /*return*/, {
                            content: [{
                                    type: 'text',
                                    text: "Error listing tables: ".concat((0, types_js_1.formatDatabaseError)(error_1)),
                                    isError: true
                                }]
                        }];
                case 5: return [2 /*return*/];
            }
        });
    }); });
    // Query database tool - available to all authenticated users
    server.tool('queryDatabase', 'Execute a read-only SQL query against the PostgreSQL database', types_js_1.QueryDatabaseSchema.shape, function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
        var validation, result, error_2;
        var sql = _b.sql, _c = _b.schema, schema = _c === void 0 ? 'public' : _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 2, , 3]);
                    validation = (0, types_js_1.validateSqlQuery)(sql);
                    if (!validation.isValid) {
                        return [2 /*return*/, {
                                content: [{
                                        type: 'text',
                                        text: "Invalid SQL query: ".concat(validation.error),
                                        isError: true
                                    }]
                            }];
                    }
                    // Check if it's a write operation
                    if ((0, types_js_1.isWriteOperation)(sql)) {
                        return [2 /*return*/, {
                                content: [{
                                        type: 'text',
                                        text: 'Write operations are not allowed with this tool. Use executeDatabase for write operations.',
                                        isError: true
                                    }]
                            }];
                    }
                    return [4 /*yield*/, (0, connection_js_1.executeQuery)(sql)];
                case 1:
                    result = _d.sent();
                    return [2 /*return*/, {
                            content: [{
                                    type: 'text',
                                    text: formatQueryResult(result)
                                }]
                        }];
                case 2:
                    error_2 = _d.sent();
                    return [2 /*return*/, {
                            content: [{
                                    type: 'text',
                                    text: "Query execution error: ".concat((0, types_js_1.formatDatabaseError)(error_2)),
                                    isError: true
                                }]
                        }];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    // Execute database tool - available to privileged users only
    if (config.enableWriteOperations) {
        server.tool('executeDatabase', 'Execute a write SQL statement (INSERT, UPDATE, DELETE, DDL) against the PostgreSQL database', types_js_1.ExecuteDatabaseSchema.shape, function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
            var validation, result, error_3;
            var sql = _b.sql, _c = _b.schema, schema = _c === void 0 ? 'public' : _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 2, , 3]);
                        // For now, we'll allow write operations based on config
                        // In a full implementation, we would need to pass user context
                        // through the MCP call context
                        if (!config.enableWriteOperations) {
                            return [2 /*return*/, {
                                    content: [{
                                            type: 'text',
                                            text: 'Write operations are disabled in the configuration',
                                            isError: true
                                        }]
                                }];
                        }
                        validation = (0, types_js_1.validateSqlQuery)(sql);
                        if (!validation.isValid) {
                            return [2 /*return*/, {
                                    content: [{
                                            type: 'text',
                                            text: "Invalid SQL statement: ".concat(validation.error),
                                            isError: true
                                        }]
                                }];
                        }
                        return [4 /*yield*/, (0, connection_js_1.executeQuery)(sql)];
                    case 1:
                        result = _d.sent();
                        return [2 /*return*/, {
                                content: [{
                                        type: 'text',
                                        text: formatExecuteResult(result, sql)
                                    }]
                            }];
                    case 2:
                        error_3 = _d.sent();
                        return [2 /*return*/, {
                                content: [{
                                        type: 'text',
                                        text: "Statement execution error: ".concat((0, types_js_1.formatDatabaseError)(error_3)),
                                        isError: true
                                    }]
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        }); });
    }
}
/**
 * Format table list for display
 */
function formatTableList(tables) {
    if (tables.length === 0) {
        return 'No tables found';
    }
    return tables.map(function (table) {
        var columnList = table.columns.map(function (col) {
            var constraints = [];
            if (col.isPrimaryKey)
                constraints.push('PK');
            if (col.isForeignKey)
                constraints.push('FK');
            if (!col.isNullable)
                constraints.push('NOT NULL');
            var constraintStr = constraints.length > 0 ? " (".concat(constraints.join(', '), ")") : '';
            return "  - ".concat(col.columnName, ": ").concat(col.dataType).concat(constraintStr);
        }).join('\n');
        var pkStr = table.primaryKeys.length > 0 ? "\nPrimary Keys: ".concat(table.primaryKeys.join(', ')) : '';
        var fkStr = table.foreignKeys.length > 0 ?
            "\nForeign Keys:\n".concat(table.foreignKeys.map(function (fk) {
                return "  - ".concat(fk.columnName, " -> ").concat(fk.referencedTable, ".").concat(fk.referencedColumn);
            }).join('\n')) : '';
        return "**".concat(table.tableName, "**\nColumns:\n").concat(columnList).concat(pkStr).concat(fkStr);
    }).join('\n\n');
}
/**
 * Format query result for display
 */
function formatQueryResult(result) {
    if (result.rows.length === 0) {
        return "Query executed successfully. No rows returned. (".concat(result.executionTime, "ms)");
    }
    var columns = Object.keys(result.rows[0]);
    var maxRows = 50; // Limit display to prevent overwhelming output
    var output = "Query executed successfully. Found ".concat(result.rowCount, " rows. (").concat(result.executionTime, "ms)\n\n");
    if (result.rowCount > maxRows) {
        output += "Showing first ".concat(maxRows, " rows:\n\n");
    }
    // Create table header
    var separator = columns.map(function () { return '---'; }).join(' | ');
    output += columns.join(' | ') + '\n';
    output += separator + '\n';
    // Add rows
    var displayRows = result.rows.slice(0, maxRows);
    displayRows.forEach(function (row) {
        var values = columns.map(function (col) {
            var value = row[col];
            if (value === null)
                return 'NULL';
            if (typeof value === 'object')
                return JSON.stringify(value);
            return String(value);
        });
        output += values.join(' | ') + '\n';
    });
    if (result.rowCount > maxRows) {
        output += "\n... and ".concat(result.rowCount - maxRows, " more rows");
    }
    return output;
}
/**
 * Format execute result for display
 */
function formatExecuteResult(result, sql) {
    var operation = sql.trim().split(' ')[0].toUpperCase();
    var message = "".concat(operation, " executed successfully. ");
    if (result.rowCount > 0) {
        message += "".concat(result.rowCount, " row(s) affected. ");
    }
    message += "(".concat(result.executionTime, "ms)");
    // For SELECT statements that might be included in DDL
    if (result.rows && result.rows.length > 0) {
        message += '\n\nResult:\n' + formatQueryResult(result);
    }
    return message;
}
