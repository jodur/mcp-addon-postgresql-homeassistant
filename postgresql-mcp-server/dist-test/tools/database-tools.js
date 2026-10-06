"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDatabaseTools = registerDatabaseTools;
const types_1 = require("../types");
const connection_1 = require("../database/connection");
/**
 * Register database tools with the MCP server
 */
function registerDatabaseTools(server, config) {
    // Get TimescaleDB status for dynamic descriptions
    const enableTimescale = config.enable_timescale || false;
    // List tables tool - available to all authenticated users
    server.tool('listTables', 'List all tables in the database with their schema information', types_1.ListTablesSchema.shape, async ({ schema = 'public' }) => {
        try {
            const tables = await (0, connection_1.getTableInfo)(schema);
            const foreignKeys = await (0, connection_1.getForeignKeys)(schema);
            const indexes = await (0, connection_1.getIndexes)(schema);
            // Group by table name
            const tableMap = new Map();
            tables.forEach(row => {
                const tableName = row.table_name;
                if (!tableMap.has(tableName)) {
                    tableMap.set(tableName, {
                        tableName: tableName,
                        schemaName: row.table_schema,
                        tableType: row.table_type,
                        columns: [],
                        primaryKeys: [],
                        foreignKeys: [],
                        indexes: []
                    });
                }
                const table = tableMap.get(tableName);
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
            foreignKeys.forEach(fk => {
                const table = tableMap.get(fk.table_name);
                if (table) {
                    table.foreignKeys.push({
                        columnName: fk.column_name,
                        referencedTable: fk.foreign_table_name,
                        referencedColumn: fk.foreign_column_name,
                        constraintName: fk.constraint_name
                    });
                }
            });
            // Add indexes
            const indexMap = new Map();
            indexes.forEach(idx => {
                const key = `${idx.table_name}.${idx.index_name}`;
                if (!indexMap.has(key)) {
                    indexMap.set(key, {
                        tableName: idx.table_name,
                        indexName: idx.index_name,
                        isUnique: idx.is_unique,
                        isPrimary: idx.is_primary,
                        columnNames: []
                    });
                }
                indexMap.get(key).columnNames.push(idx.column_name);
            });
            indexMap.forEach(idx => {
                const table = tableMap.get(idx.tableName);
                if (table) {
                    table.indexes.push({
                        indexName: idx.indexName,
                        columnNames: idx.columnNames,
                        isUnique: idx.isUnique,
                        indexType: idx.isPrimary ? 'PRIMARY' : 'INDEX'
                    });
                }
            });
            const result = Array.from(tableMap.values());
            return {
                content: [{
                        type: 'text',
                        text: `Found ${result.length} tables in schema '${schema}':\n\n${formatTableList(result)}`
                    }]
            };
        }
        catch (error) {
            return {
                content: [{
                        type: 'text',
                        text: `Error listing tables: ${(0, types_1.formatDatabaseError)(error)}`,
                        isError: true
                    }]
            };
        }
    });
    // Query database tool - available to all authenticated users
    server.tool('queryDatabase', enableTimescale
        ? `Execute a read-only SQL query against the PostgreSQL database with TimescaleDB support. 
         TimescaleDB functions available: time_bucket(), first(), last(), histogram(), 
         time_bucket_gapfill(), locf(), interpolate(), and time-series specific aggregations.
         Example: SELECT time_bucket('1 hour', time) as hour, avg(value) FROM sensor_data 
         WHERE time >= NOW() - INTERVAL '1 day' GROUP BY hour ORDER BY hour;`
        : 'Execute a read-only SQL query against the PostgreSQL database', types_1.QueryDatabaseSchema.shape, async ({ sql, schema = 'public' }) => {
        try {
            // Validate SQL query
            const validation = (0, types_1.validateSqlQuery)(sql);
            if (!validation.isValid) {
                return {
                    content: [{
                            type: 'text',
                            text: `Invalid SQL query: ${validation.error}`,
                            isError: true
                        }]
                };
            }
            // Check if it's a write operation
            if ((0, types_1.isWriteOperation)(sql)) {
                return {
                    content: [{
                            type: 'text',
                            text: 'Write operations are not allowed with this tool. Use executeDatabase for write operations.',
                            isError: true
                        }]
                };
            }
            // Execute query
            const result = await (0, connection_1.executeQuery)(sql);
            return {
                content: [{
                        type: 'text',
                        text: formatQueryResult(result)
                    }]
            };
        }
        catch (error) {
            return {
                content: [{
                        type: 'text',
                        text: `Query execution error: ${(0, types_1.formatDatabaseError)(error)}`,
                        isError: true
                    }]
            };
        }
    });
    // Execute database tool - available to privileged users only
    if (config.enableWriteOperations) {
        server.tool('executeDatabase', enableTimescale
            ? `Execute a write SQL statement (INSERT, UPDATE, DELETE, DDL) against the PostgreSQL database with TimescaleDB support.
           TimescaleDB functions available for write operations: CREATE TABLE with hypertable conversion,
           time-series specific partitioning, and continuous aggregates.
           Example: SELECT create_hypertable('sensor_data', 'time'); or 
           INSERT INTO sensor_data (time, sensor_id, value) VALUES (NOW(), 'temp01', 23.5);`
            : 'Execute a write SQL statement (INSERT, UPDATE, DELETE, DDL) against the PostgreSQL database', types_1.ExecuteDatabaseSchema.shape, async ({ sql, schema = 'public' }) => {
            try {
                // For now, we'll allow write operations based on config
                // In a full implementation, we would need to pass user context
                // through the MCP call context
                if (!config.enableWriteOperations) {
                    return {
                        content: [{
                                type: 'text',
                                text: 'Write operations are disabled in the configuration',
                                isError: true
                            }]
                    };
                }
                // Validate SQL query
                const validation = (0, types_1.validateSqlQuery)(sql);
                if (!validation.isValid) {
                    return {
                        content: [{
                                type: 'text',
                                text: `Invalid SQL statement: ${validation.error}`,
                                isError: true
                            }]
                    };
                }
                // Execute statement
                const result = await (0, connection_1.executeQuery)(sql);
                return {
                    content: [{
                            type: 'text',
                            text: formatExecuteResult(result, sql)
                        }]
                };
            }
            catch (error) {
                return {
                    content: [{
                            type: 'text',
                            text: `Statement execution error: ${(0, types_1.formatDatabaseError)(error)}`,
                            isError: true
                        }]
                };
            }
        });
    }
}
/**
 * Format table list for display
 */
function formatTableList(tables) {
    if (tables.length === 0) {
        return 'No tables found';
    }
    return tables.map(table => {
        const columnList = table.columns.map((col) => {
            const constraints = [];
            if (col.isPrimaryKey)
                constraints.push('PK');
            if (col.isForeignKey)
                constraints.push('FK');
            if (!col.isNullable)
                constraints.push('NOT NULL');
            const constraintStr = constraints.length > 0 ? ` (${constraints.join(', ')})` : '';
            return `  - ${col.columnName}: ${col.dataType}${constraintStr}`;
        }).join('\n');
        const pkStr = table.primaryKeys.length > 0 ? `\nPrimary Keys: ${table.primaryKeys.join(', ')}` : '';
        const fkStr = table.foreignKeys.length > 0 ?
            `\nForeign Keys:\n${table.foreignKeys.map((fk) => `  - ${fk.columnName} -> ${fk.referencedTable}.${fk.referencedColumn}`).join('\n')}` : '';
        return `**${table.tableName}**\nColumns:\n${columnList}${pkStr}${fkStr}`;
    }).join('\n\n');
}
/**
 * Format query result for display
 */
function formatQueryResult(result) {
    if (result.rows.length === 0) {
        return `Query executed successfully. No rows returned. (${result.executionTime}ms)`;
    }
    const columns = Object.keys(result.rows[0]);
    const maxRows = 50; // Limit display to prevent overwhelming output
    let output = `Query executed successfully. Found ${result.rowCount} rows. (${result.executionTime}ms)\n\n`;
    if (result.rowCount > maxRows) {
        output += `Showing first ${maxRows} rows:\n\n`;
    }
    // Create table header
    const separator = columns.map(() => '---').join(' | ');
    output += columns.join(' | ') + '\n';
    output += separator + '\n';
    // Add rows
    const displayRows = result.rows.slice(0, maxRows);
    displayRows.forEach((row) => {
        const values = columns.map(col => {
            const value = row[col];
            if (value === null)
                return 'NULL';
            if (typeof value === 'object')
                return JSON.stringify(value);
            return String(value);
        });
        output += values.join(' | ') + '\n';
    });
    if (result.rowCount > maxRows) {
        output += `\n... and ${result.rowCount - maxRows} more rows`;
    }
    return output;
}
/**
 * Format execute result for display
 */
function formatExecuteResult(result, sql) {
    const sqlTrimmed = sql.trim();
    const operation = sqlTrimmed.split(' ')[0]?.toUpperCase() || 'UNKNOWN';
    let message = `${operation} executed successfully. `;
    if (result.rowCount > 0) {
        message += `${result.rowCount} row(s) affected. `;
    }
    message += `(${result.executionTime}ms)`;
    // For SELECT statements that might be included in DDL
    if (result.rows && result.rows.length > 0) {
        message += '\n\nResult:\n' + formatQueryResult(result);
    }
    return message;
}
//# sourceMappingURL=database-tools.js.map