# PostgreSQL MCP Server

A Home Assistant addon that provides a Model Context Protocol (MCP) server for PostgreSQL database access with authentication through Home Assistant's API token system.

## Features

- **🏠 Home Assistant Integration**: Uses Home Assistant's authentication system
- **🗄️ PostgreSQL Database Access**: Direct database connection for MCP tools
- **⏰ TimescaleDB Support**: Enhanced time-series database capabilities when enabled
- **🔐 Secure Authentication**: Validates Home Assistant API tokens
- **🛡️ SQL Injection Protection**: Built-in query validation and sanitization
- **⚙️ Write Operation Control**: Enable/disable write operations via addon configuration
- **☁️ Cloudflare Tunnel Ready**: Designed to work with Home Assistant's cloudflare addon

## Configuration

Configure the addon through the Home Assistant UI:

```yaml
database_url: "postgresql://username:password@host:5432/database"
server_port: 3000
log_level: "info"
max_connections: 10
enable_write_operations: false
ha_base_url: "http://homeassistant:8123"  # Home Assistant API URL (internal network)
enable_timescale: false  # Enable TimescaleDB specific functions and descriptions
```

## TimescaleDB Support

When `enable_timescale` is set to `true`, the MCP server provides enhanced tool descriptions with time-series specific functions:

- **Time Bucketing**: `time_bucket('1 hour', time)` for time-based aggregations
- **Gap Filling**: `time_bucket_gapfill()` for filling missing time intervals
- **Interpolation**: `locf()` and `interpolate()` for data interpolation
- **Time-series Aggregations**: `first()`, `last()`, `histogram()` functions
- **Continuous Aggregates**: Support for materialized views optimized for time-series

### Example TimescaleDB Queries

```sql
-- Average sensor readings per hour for the last day
SELECT time_bucket('1 hour', time) as hour, 
       avg(value) as avg_value 
FROM sensor_data 
WHERE time >= NOW() - INTERVAL '1 day' 
GROUP BY hour 
ORDER BY hour;

-- Fill gaps in sensor data with linear interpolation
SELECT time_bucket_gapfill('5 minutes', time) as time,
       interpolate(avg(value)) as value
FROM sensor_data
WHERE time >= NOW() - INTERVAL '6 hours'
GROUP BY time_bucket_gapfill('5 minutes', time)
ORDER BY time;
```

## Usage

The addon provides MCP tools for database operations:

- `listTables` - Lists all database tables
- `queryDatabase` - Execute read-only SQL queries
- `executeDatabase` - Execute write operations (when enabled)

### Authentication

Include your Home Assistant long-lived access token in requests:

```
Authorization: Bearer YOUR_HOME_ASSISTANT_TOKEN
```

### External Access

Use with Cloudflare tunnel for secure external access:

```bash
curl -X POST https://your-domain.your-tunnel.com/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_HA_TOKEN" \
  -d '{"method": "tools/list"}'
```

## Security

- All requests require valid Home Assistant authentication
- SQL query validation prevents dangerous operations
- Write operations controlled by addon configuration
- Database connection pooling with configurable limits

## Configuration Notes

- **ha_base_url**: Use `http://homeassistant:8123` for internal network communication (recommended)
- **External access**: For external access via Cloudflare tunnel, use your tunnel domain
- **Authentication**: Only Home Assistant long-lived access tokens are supported
- **Database URL**: Must be a valid PostgreSQL connection string

## Troubleshooting

### Authentication Issues

If authentication fails:
1. Verify your Home Assistant token is valid
2. Check that `ha_base_url` is set to `http://homeassistant:8123`
3. Ensure the addon can reach Home Assistant's API

### Database Connection Issues

If database connection fails:
1. Verify the database URL is correct
2. Check that the database server is accessible
3. Ensure the database user has proper permissions

## Version

Current version: 1.4.10

For detailed documentation, see the [repository README](https://github.com/jodur/mcp-addon-postgresql-homeassistant).
