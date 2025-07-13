const request = require('supertest');
const MCPTestClient = require('./test-client');

describe('PostgreSQL MCP Server', () => {
  const baseUrl = 'http://localhost:3000';
  const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJiZWVkMDZkODNjMWI0NDgyYjJlNTc1ZWRlZDIxMGNlNSIsImlhdCI6MTc1MjM5MDcyMiwiZXhwIjoyMDY3NzUwNzIyfQ.fnzjsA90LWYrAxBFlqZbdzoAlcQxo3iQVgXptlMzx8o';
  
  let client;

  beforeAll(() => {
    client = new MCPTestClient();
  });

  describe('Health Endpoint', () => {
    test('should return health status', async () => {
      const response = await request(baseUrl)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('database');
      expect(response.body).toHaveProperty('version');
    });
  });

  describe('MCP Protocol', () => {
    const authHeaders = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    test('should handle initialize request', async () => {
      const response = await request(baseUrl)
        .post('/mcp')
        .set(authHeaders)
        .send({ method: 'initialize' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('protocolVersion');
      expect(response.body.data).toHaveProperty('capabilities');
      expect(response.body.data).toHaveProperty('serverInfo');
      expect(response.body.data.serverInfo.name).toContain('PostgreSQL MCP Server');
    });

    test('should handle tools/list request', async () => {
      const response = await request(baseUrl)
        .post('/mcp')
        .set(authHeaders)
        .send({ method: 'tools/list' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('tools');
      expect(Array.isArray(response.body.data.tools)).toBe(true);
    });

    test('should handle resources/list request', async () => {
      const response = await request(baseUrl)
        .post('/mcp')
        .set(authHeaders)
        .send({ method: 'resources/list' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('resources');
      expect(Array.isArray(response.body.data.resources)).toBe(true);
    });

    test('should handle prompts/list request', async () => {
      const response = await request(baseUrl)
        .post('/mcp')
        .set(authHeaders)
        .send({ method: 'prompts/list' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('prompts');
      expect(Array.isArray(response.body.data.prompts)).toBe(true);
    });

    test('should reject invalid method', async () => {
      const response = await request(baseUrl)
        .post('/mcp')
        .set(authHeaders)
        .send({ method: 'invalid/method' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Unknown method');
    });

    test('should reject request without authentication', async () => {
      await request(baseUrl)
        .post('/mcp')
        .set('Content-Type', 'application/json')
        .send({ method: 'initialize' })
        .expect(401);
    });

    test('should reject GET request to MCP endpoint', async () => {
      await request(baseUrl)
        .get('/mcp')
        .expect(404);
    });

    test('should handle tools/call request', async () => {
      const response = await request(baseUrl)
        .post('/mcp')
        .set(authHeaders)
        .send({ 
          method: 'tools/call',
          params: {
            name: 'test-tool',
            arguments: {}
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('content');
    });

    test('should require tool name for tools/call', async () => {
      const response = await request(baseUrl)
        .post('/mcp')
        .set(authHeaders)
        .send({ 
          method: 'tools/call',
          params: {}
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Tool name is required');
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for unknown endpoints', async () => {
      await request(baseUrl)
        .get('/unknown-endpoint')
        .expect(404);
    });

    test('should handle malformed JSON', async () => {
      await request(baseUrl)
        .post('/mcp')
        .set({
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        })
        .send('invalid json')
        .expect(400);
    });
  });
});
