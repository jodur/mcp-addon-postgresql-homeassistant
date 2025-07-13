# Development Environment - PostgreSQL MCP Server

This development environment allows you to test the PostgreSQL MCP Server locally without installing it as a Home Assistant addon.

## Quick Start

1. **Prerequisites:**
   - Node.js 18+ installed
   - PostgreSQL database running (local or remote)
   - Optional: Docker for database setup

2. **Setup:**
   ```bash
   cd dev-environment
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm run dev
   ```

3. **Test the server:**
   ```bash
   curl http://localhost:3000/health
   ```

## Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/database

# Server Configuration  
SERVER_PORT=3000
LOG_LEVEL=debug

# Authentication (for testing - use any valid token format)
HA_BASE_URL=http://localhost:8123
ALLOWED_USERS=admin,testuser
ENABLE_WRITE_OPERATIONS=true
MAX_CONNECTIONS=5

# Development mode
NODE_ENV=development
```

## Database Setup Options

### Option 1: Use Docker PostgreSQL
```bash
# Start PostgreSQL with Docker
docker run --name postgres-dev \
  -e POSTGRES_DB=mcptest \
  -e POSTGRES_USER=mcpuser \
  -e POSTGRES_PASSWORD=mcppass \
  -p 5432:5432 \
  -d postgres:15-alpine

# Your DATABASE_URL would be:
# postgresql://mcpuser:mcppass@localhost:5432/mcptest
```

### Option 2: Use Existing PostgreSQL
Configure your existing PostgreSQL instance and update the `DATABASE_URL` in `.env`.

## Testing the MCP Server

### 1. Health Check
```bash
curl http://localhost:3000/health
```

### 2. List Available Tools
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token-123" \
  -d '{"method": "tools/list"}'
```

### 3. List Database Tables
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token-123" \
  -d '{"method": "tools/call", "params": {"name": "listTables"}}'
```

### 4. Query Database
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token-123" \
  -d '{"method": "tools/call", "params": {"name": "queryDatabase", "arguments": {"sql": "SELECT version()"}}}'
```

## Development Scripts

- `npm run dev` - Start server with auto-reload
- `npm run build` - Build TypeScript
- `npm start` - Start production server
- `npm run test` - Run environment tests
- `npm run test:auth` - Test Home Assistant authentication
- `npm run db:setup` - Set up test database schema

## Authentication in Development

The development environment supports both **real Home Assistant authentication** and **fallback development authentication**.

### Real Home Assistant Authentication Testing

To test with your actual Home Assistant instance:

1. **Get a Long-Lived Access Token:**
   - Go to your Home Assistant Profile
   - Scroll to "Long-Lived Access Tokens"
   - Click "Create Token"
   - Copy the generated token

2. **Configure .env:**
   ```bash
   HA_BASE_URL=http://your-ha-instance:8123
   HA_TEST_TOKEN=your-long-lived-access-token-here
   ```

3. **Test Authentication:**
   ```bash
   npm run test:auth
   ```

4. **Use Real Tokens in MCP Calls:**
   ```bash
   curl -X POST http://localhost:3000/mcp \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer your-long-lived-access-token-here" \
     -d '{"method": "tools/list"}'
   ```

### Development Fallback Authentication

If Home Assistant is not available, the server accepts simple test tokens:
- Length >= 10 characters
- Contains alphanumeric characters, dots, underscores, or hyphens

Example fallback tokens:
- `test-token-123`
- `development-key`
- `my-test-token.456`

### Authentication Flow

1. **Primary**: Attempts to validate with Home Assistant API
2. **Fallback**: Uses simplified validation for development
3. **Logging**: Detailed authentication logs in development mode

## Home Assistant Authentication Testing

### Step-by-Step Authentication Test

1. **Prepare your Home Assistant token:**
   ```bash
   # Edit .env file
   HA_BASE_URL=http://your-ha-instance:8123
   HA_TEST_TOKEN=your-long-lived-access-token
   ```

2. **Run authentication tests:**
   ```bash
   npm run build
   npm run test:auth
   ```

3. **Expected output:**
   ```
   🧪 Test 1: Basic API Connectivity
   ✅ Home Assistant API is reachable
   
   🧪 Test 2: Authentication Endpoint
   ✅ Authentication successful
   👤 User info: { id: "...", name: "...", is_admin: true }
   
   🧪 Test 3: States Endpoint
   ✅ States endpoint accessible
   📊 Found 150 entities
   ```

4. **Test with MCP server:**
   ```bash
   # Start the dev server
   npm run dev
   
   # In another terminal, test with your real token
   curl -X POST http://localhost:3000/mcp \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer your-long-lived-access-token" \
     -d '{"method": "tools/list"}'
   ```

### Authentication Debug Logs

When running in development mode, you'll see detailed authentication logs:

```
🔍 Testing Home Assistant authentication...
📡 HA Base URL: http://localhost:8123
🔑 Token: eyJhbGciOi...
📊 HA API Response: 200 OK
✅ Home Assistant authentication successful
👤 User data: { id: "abc123", name: "John Doe", is_admin: true }
```

### Troubleshooting Authentication

**Common Issues:**

1. **Connection refused**
   - Check if Home Assistant is running
   - Verify HA_BASE_URL is correct
   - Test with: `curl http://your-ha-instance:8123/api/`

2. **401 Unauthorized**
   - Token is invalid or expired
   - Create a new long-lived access token
   - Ensure token is properly set in .env

3. **404 Not Found on auth/check**
   - Some HA versions don't have this endpoint
   - The server will use fallback validation
   - Test states endpoint instead

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check PostgreSQL is running
   - Verify DATABASE_URL is correct
   - Ensure database user has proper permissions

2. **Port Already in Use**
   - Change SERVER_PORT in .env
   - Check if another service is using port 3000

3. **Authentication Errors**
   - Ensure Authorization header is included
   - Use Bearer token format: `Bearer your-token`

### Logs

The development server logs are printed to console. Set `LOG_LEVEL=debug` for verbose logging.

## Database Schema for Testing

If you want to test with sample data, run:

```bash
npm run db:setup
```

This will create sample tables:
- `users` - Test user accounts
- `products` - Sample product catalog
- `orders` - Test order data

## VS Code Integration

The development environment includes VS Code configuration:

1. Open the `dev-environment` folder in VS Code
2. Install recommended extensions
3. Use F5 to start debugging
4. Set breakpoints in TypeScript files

## Next Steps

Once you've tested the development environment:

1. **Deploy as Home Assistant Addon** - Use the main addon configuration
2. **Configure Cloudflare Tunnel** - For external access
3. **Integrate with MCP Clients** - Connect AI tools to the HTTP endpoints
4. **Production Configuration** - Update security settings for production use
