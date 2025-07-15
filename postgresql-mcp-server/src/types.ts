import { z } from 'zod';

// Configuration interface
export interface McpConfig {
  databaseUrl: string;
  enableWriteOperations: boolean;
  allowedUsers: string[];
  maxConnections: number;
  enable_timescale?: boolean;
}

// Service context from Home Assistant authentication
// For MCP servers, this represents the authenticated service, not individual users
export interface UserContext {
  userId: string;        // Service/token identifier
  username: string;      // Service name (e.g., 'homeassistant', 'mcp-service')
  isAdmin: boolean;      // Service has admin privileges
  permissions: string[]; // Service capabilities
}

// Request/Response types
export interface McpRequest {
  method: string;
  params?: Record<string, any>;
}

export interface McpResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// Database tool schemas
export const ListTablesSchema = z.object({
  schema: z.string().optional().describe('Database schema name (default: public)')
});

export const QueryDatabaseSchema = z.object({
  sql: z.string().describe('SQL query to execute (SELECT statements only)'),
  schema: z.string().optional().describe('Database schema name (default: public)')
});

export const ExecuteDatabaseSchema = z.object({
  sql: z.string().describe('SQL statement to execute (INSERT, UPDATE, DELETE, DDL)'),
  schema: z.string().optional().describe('Database schema name (default: public)')
});

// Database result types
export interface DatabaseTable {
  tableName: string;
  schemaName: string;
  columns: DatabaseColumn[];
  primaryKeys: string[];
  foreignKeys: DatabaseForeignKey[];
  indexes: DatabaseIndex[];
}

export interface DatabaseColumn {
  columnName: string;
  dataType: string;
  isNullable: boolean;
  defaultValue?: string;
  maxLength?: number;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
}

export interface DatabaseForeignKey {
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
  constraintName: string;
}

export interface DatabaseIndex {
  indexName: string;
  columnNames: string[];
  isUnique: boolean;
  indexType: string;
}

export interface QueryResult {
  rows: any[];
  rowCount: number;
  columns: string[];
  executionTime: number;
}

// Helper functions
export function createErrorResponse(message: string): McpResponse {
  return {
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  };
}

export function createSuccessResponse<T>(data: T): McpResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString()
  };
}

// Validation functions
export function validateSqlQuery(sql: string): { isValid: boolean; error?: string } {
  const trimmedSql = sql.trim().toLowerCase();
  
  // Check for dangerous patterns
  const dangerousPatterns = [
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

  for (const pattern of dangerousPatterns) {
    if (pattern.test(sql)) {
      return {
        isValid: false,
        error: `Potentially dangerous SQL pattern detected: ${pattern.source}`
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

export function isWriteOperation(sql: string): boolean {
  const trimmedSql = sql.trim().toLowerCase();
  const writeKeywords = ['insert', 'update', 'delete', 'create', 'drop', 'alter', 'truncate', 'grant', 'revoke'];
  
  return writeKeywords.some(keyword => trimmedSql.startsWith(keyword));
}

export function formatDatabaseError(error: any): string {
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
        return `Database error (${error.code}): ${error.message}`;
    }
  }
  
  return error.message || 'Unknown database error';
}
