# Security Notice for Testing

## ⚠️ IMPORTANT: Replace Placeholder Tokens

Before running any tests, you must replace the placeholder tokens in the following files with your actual Home Assistant long-lived access token:

### Files that need token replacement:

1. **`dev-environment/test-mcp-server.ps1`**
   - Line 11: Replace `YOUR_HOME_ASSISTANT_TOKEN_HERE` with your token

2. **`dev-environment/test-client.js`**  
   - Line 12: Replace `YOUR_HOME_ASSISTANT_TOKEN_HERE` with your token

3. **`dev-environment/postman-tests.json`**
   - Multiple Authorization headers: Replace `YOUR_HOME_ASSISTANT_TOKEN_HERE` with your token

4. **`.vscode/mcp.json`**
   - Authorization header: Replace `YOUR_HOME_ASSISTANT_TOKEN_HERE` with your token

### How to get your Home Assistant token:

1. Log into your Home Assistant instance
2. Go to your Profile (click your name in bottom left)
3. Scroll down to "Long-lived access tokens"
4. Click "Create Token"
5. Give it a name like "MCP PostgreSQL Server"
6. Copy the generated token and replace the placeholders

### Security best practices:

- **NEVER commit real tokens to version control**
- Use environment variables for production
- Tokens in `.env` files are automatically ignored by git
- Consider using token rotation for long-running deployments
- Revoke tokens when no longer needed

### Environment variable alternative:

Instead of hardcoding tokens, you can use environment variables:

```bash
# Set environment variable
export HA_TEST_TOKEN="your-real-token-here"

# Use in scripts
$token = $env:HA_TEST_TOKEN  # PowerShell
const token = process.env.HA_TEST_TOKEN;  // Node.js
```
