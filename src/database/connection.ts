import { Pool, PoolClient } from 'pg';
import { formatDatabaseError } from '../types';

let pool: Pool | null = null;

/**
 * Initialize database connection pool
 */
export async function initializeDatabase(databaseUrl: string, maxConnections: number = 10): Promise<void> {
  try {
    if (pool) {
      await pool.end();
    }

    pool = new Pool({
      connectionString: databaseUrl,
      max: maxConnections,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : false
    });

    // Test connection
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    console.log('Database connection pool initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Get database connection pool
 */
export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database not initialized. Call initializeDatabase first.');
  }
  return pool;
}

/**
 * Execute database operation with connection management
 */
export async function withDatabase<T>(
  operation: (client: PoolClient) => Promise<T>
): Promise<T> {
  if (!pool) {
    throw new Error('Database not initialized');
  }

  const client = await pool.connect();
  try {
    return await operation(client);
  } finally {
    client.release();
  }
}

/**
 * Execute a query with error handling and timing
 */
export async function executeQuery(
  sql: string,
  params: any[] = []
): Promise<{ rows: any[]; rowCount: number; executionTime: number }> {
  const startTime = Date.now();
  
  try {
    const result = await withDatabase(async (client) => {
      return await client.query(sql, params);
    });

    const executionTime = Date.now() - startTime;
    
    return {
      rows: result.rows,
      rowCount: result.rowCount || 0,
      executionTime
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('Database query error:', {
      sql: sql.substring(0, 200),
      error: error,
      executionTime
    });
    
    throw new Error(formatDatabaseError(error));
  }
}

/**
 * Close database connection pool
 */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Database connection pool closed');
  }
}

/**
 * Check if database is connected
 */
export async function isDatabaseConnected(): Promise<boolean> {
  if (!pool) {
    return false;
  }

  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}

/**
 * Get database information
 */
export async function getDatabaseInfo(): Promise<{
  version: string;
  currentDatabase: string;
  currentUser: string;
  totalConnections: number;
}> {
  const result = await executeQuery(`
    SELECT 
      version() as version,
      current_database() as current_database,
      current_user as current_user,
      (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) as total_connections
  `);

  return result.rows[0];
}

/**
 * Get table information for a schema
 */
export async function getTableInfo(schemaName: string = 'public'): Promise<any[]> {
  const query = `
    SELECT 
      t.table_name,
      t.table_schema,
      t.table_type,
      c.column_name,
      c.data_type,
      c.is_nullable,
      c.column_default,
      c.character_maximum_length,
      CASE 
        WHEN pk.column_name IS NOT NULL THEN true 
        ELSE false 
      END as is_primary_key,
      CASE 
        WHEN fk.column_name IS NOT NULL THEN true 
        ELSE false 
      END as is_foreign_key
    FROM information_schema.tables t
    LEFT JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
    LEFT JOIN (
      SELECT ku.table_name, ku.column_name, ku.table_schema
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
      WHERE tc.constraint_type = 'PRIMARY KEY'
    ) pk ON t.table_name = pk.table_name AND t.table_schema = pk.table_schema AND c.column_name = pk.column_name
    LEFT JOIN (
      SELECT ku.table_name, ku.column_name, ku.table_schema
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
    ) fk ON t.table_name = fk.table_name AND t.table_schema = fk.table_schema AND c.column_name = fk.column_name
    WHERE t.table_schema = $1
      AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name, c.ordinal_position
  `;

  const result = await executeQuery(query, [schemaName]);
  return result.rows;
}

/**
 * Get foreign key relationships
 */
export async function getForeignKeys(schemaName: string = 'public'): Promise<any[]> {
  const query = `
    SELECT 
      tc.constraint_name,
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = $1
    ORDER BY tc.table_name, kcu.ordinal_position
  `;

  const result = await executeQuery(query, [schemaName]);
  return result.rows;
}

/**
 * Get indexes for tables
 */
export async function getIndexes(schemaName: string = 'public'): Promise<any[]> {
  const query = `
    SELECT 
      t.relname AS table_name,
      i.relname AS index_name,
      ix.indisunique AS is_unique,
      ix.indisprimary AS is_primary,
      a.attname AS column_name
    FROM pg_class t
    JOIN pg_index ix ON t.oid = ix.indrelid
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = $1
      AND t.relkind = 'r'
    ORDER BY t.relname, i.relname, a.attnum
  `;

  const result = await executeQuery(query, [schemaName]);
  return result.rows;
}
