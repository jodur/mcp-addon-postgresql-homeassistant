# MCP Server Testing Guide

This directory contains comprehensive testing tools for the PostgreSQL MCP Server.

## Available Testing Methods

### 1. 📮 Postman Collection
**File**: `postman-tests.json`

**How to use**:
1. Open Postman
2. Click "Import"
3. Select `postman-tests.json`
4. Run the collection

**Tests included**:
- Health Check
- MCP Initialize
- MCP Tools List
- MCP Resources List

### 2. 💻 PowerShell Test Script
**File**: `test-mcp-server.ps1`

**How to run**:
```powershell
powershell -ExecutionPolicy Bypass -File test-mcp-server.ps1
```

**Features**:
- Comprehensive endpoint testing
- Authentication testing
- Error condition testing
- Colored output with clear results

### 3. 🚀 Node.js Test Client
**File**: `test-client.js`

**How to run**:
```bash
npm install axios
node test-client.js
```

**Features**:
- Programmatic MCP client
- Detailed response analysis
- Error handling tests
- Can be imported as module

### 4. 🧪 Jest Unit Tests
**File**: `mcp-server.test.js`

**How to run**:
```bash
npm install jest supertest
npm test
```

**Features**:
- Proper unit testing framework
- Assertion-based testing
- Test coverage reporting
- CI/CD friendly

## Testing Requirements

### Server Must Be Running
Before running any tests, make sure the MCP server is running:

```bash
cd ../
npm start
```

Server should be accessible at: `http://localhost:3000`

### Authentication Token
All tests use this Home Assistant token:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJiZWVkMDZkODNjMWI0NDgyYjJlNTc1ZWRlZDIxMGNlNSIsImlhdCI6MTc1MjM5MDcyMiwiZXhwIjoyMDY3NzUwNzIyfQ.fnzjsA90LWYrAxBFlqZbdzoAlcQxo3iQVgXptlMzx8o
```

## Quick Test Commands

### Test everything with PowerShell:
```powershell
powershell -ExecutionPolicy Bypass -File test-mcp-server.ps1
```

### Test with Node.js:
```bash
node test-client.js
```

### Test with Jest:
```bash
npm test
```

## Expected Results

### ✅ Should Pass:
- Health check returns 200 with server status
- MCP Initialize returns protocol version and capabilities
- Tools/Resources/Prompts lists return empty arrays (no tools configured yet)
- Authentication properly rejects unauthorized requests
- Invalid methods return appropriate error messages

### ❌ Should Fail (Expected):
- GET requests to `/mcp` endpoint (404)
- Requests without authentication (401)
- Invalid MCP methods (400)

## Troubleshooting

### Server Not Responding
- Check if server is running on port 3000
- Verify no firewall blocking localhost connections
- Check server logs for errors

### Authentication Errors
- Verify token in `.env` file matches test token
- Check Home Assistant is accessible at configured URL
- Ensure token hasn't expired

### Test Failures
- Ensure all dependencies are installed (`npm install`)
- Check PowerShell execution policy allows script execution
- Verify JSON syntax in request bodies

## Adding New Tests

### PowerShell Script:
Add new `Test-Endpoint` calls in `test-mcp-server.ps1`

### Node.js Client:
Add new methods to `MCPTestClient` class in `test-client.js`

### Jest Tests:
Add new test cases in `mcp-server.test.js`

### Postman:
Import collection, add new requests, export updated collection

## Test Coverage

Current tests cover:
- ✅ Basic connectivity and health
- ✅ MCP protocol compliance
- ✅ Authentication and authorization
- ✅ Error handling and edge cases
- ✅ All current MCP methods
- ⏳ Database functionality (when connected)
- ⏳ Tool execution (when tools are registered)
