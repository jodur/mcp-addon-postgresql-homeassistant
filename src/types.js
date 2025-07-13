"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecuteDatabaseSchema = exports.QueryDatabaseSchema = exports.ListTablesSchema = void 0;
exports.createErrorResponse = createErrorResponse;
exports.createSuccessResponse = createSuccessResponse;
exports.validateSqlQuery = validateSqlQuery;
exports.isWriteOperation = isWriteOperation;
exports.formatDatabaseError = formatDatabaseError;
var zod_1 = require("zod");
// Database tool schemas
exports.ListTablesSchema = zod_1.z.object({
    schema: zod_1.z.string().optional().describe('Database schema name (default: public)')
});
exports.QueryDatabaseSchema = zod_1.z.object({
    sql: zod_1.z.string().describe('SQL query to execute (SELECT statements only)'),
    schema: zod_1.z.string().optional().describe('Database schema name (default: public)')
});
exports.ExecuteDatabaseSchema = zod_1.z.object({
    sql: zod_1.z.string().describe('SQL statement to execute (INSERT, UPDATE, DELETE, DDL)'),
    schema: zod_1.z.string().optional().describe('Database schema name (default: public)')
});
// Helper functions
function createErrorResponse(message) {
    return {
        success: false,
        error: message,
        timestamp: new Date().toISOString()
    };
}
function createSuccessResponse(data) {
    return {
        success: true,
        data: data,
        timestamp: new Date().toISOString()
    };
}
// Validation functions
function validateSqlQuery(sql) {
    var trimmedSql = sql.trim().toLowerCase();
    // Check for dangerous patterns
    var dangerousPatterns = [
        /;\s*drop\s+/i,
        /;\s*delete\s+.*\s+where\s+1\s*=\s*1/i,
        /;\s*truncate\s+/i,
        /;\s*alter\s+/i,
        /;\s*create\s+/i,
        /;\s*insert\s+/i,
        /;\s*update\s+/i,
        /;\s*grant\s+/i,
        /;\s*revoke\s+/i,
        /xp_cmdshell/i,
        /sp_executesql/i,
        /exec\s*\(/i,
        /union\s+.*\s+select/i,
        /\/\*.*\*\//i
    ];
    for (var _i = 0, dangerousPatterns_1 = dangerousPatterns; _i < dangerousPatterns_1.length; _i++) {
        var pattern = dangerousPatterns_1[_i];
        if (pattern.test(sql)) {
            return {
                isValid: false,
                error: "Potentially dangerous SQL pattern detected: ".concat(pattern.source)
            };
        }
    }
    // Check for multiple statements
    if (sql.includes(';') && sql.trim().split(';').length > 2) {
        return {
            isValid: false,
            error: 'Multiple SQL statements are not allowed'
        };
    }
    return { isValid: true };
}
function isWriteOperation(sql) {
    var trimmedSql = sql.trim().toLowerCase();
    var writeKeywords = ['insert', 'update', 'delete', 'create', 'drop', 'alter', 'truncate', 'grant', 'revoke'];
    return writeKeywords.some(function (keyword) { return trimmedSql.startsWith(keyword); });
}
function formatDatabaseError(error) {
    if (error.code) {
        switch (error.code) {
            case '42P01':
                return 'Table does not exist';
            case '42703':
                return 'Column does not exist';
            case '42601':
                return 'Syntax error in SQL query';
            case '23505':
                return 'Unique constraint violation';
            case '23503':
                return 'Foreign key constraint violation';
            case '23514':
                return 'Check constraint violation';
            case '08003':
                return 'Connection does not exist';
            case '08006':
                return 'Connection failure';
            case '53300':
                return 'Too many connections';
            default:
                return "Database error (".concat(error.code, "): ").concat(error.message);
        }
    }
    return error.message || 'Unknown database error';
}
