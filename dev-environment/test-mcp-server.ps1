# PostgreSQL MCP Server Test Script
# Run this in PowerShell to test all MCP endpoints

Write-Host "[TEST] PostgreSQL MCP Server Test Suite" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# Configuration
$baseUrl = "http://localhost:3000"
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJiZWVkMDZkODNjMWI0NDgyYjJlNTc1ZWRlZDIxMGNlNSIsImlhdCI6MTc1MjM5MDcyMiwiZXhwIjoyMDY3NzUwNzIyfQ.fnzjsA90LWYrAxBFlqZbdzoAlcQxo3iQVgXptlMzx8o"

# Headers for authenticated requests
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
}

# Helper function to make requests and display results
function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [hashtable]$Headers = @{},
        [string]$Body = $null
    )
    
    Write-Host "`n[TEST] $Name" -ForegroundColor Cyan
    Write-Host "   Method: $Method" -ForegroundColor Gray
    Write-Host "   URL: $Url" -ForegroundColor Gray
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
        }
        
        if ($Body) {
            $params.Body = $Body
            Write-Host "   Body: $Body" -ForegroundColor Gray
        }
        
        $response = Invoke-WebRequest @params
        Write-Host "   [SUCCESS] Status: $($response.StatusCode)" -ForegroundColor Green
        
        # Parse and display JSON response
        $jsonResponse = $response.Content | ConvertFrom-Json
        Write-Host "   Response:" -ForegroundColor Yellow
        Write-Host "      $($response.Content)" -ForegroundColor White
        
    } catch {
        Write-Host "   [ERROR] $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            Write-Host "   Response: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        }
    }
}

# Test 1: Health Check
Test-Endpoint -Name "Health Check" -Method "GET" -Url "$baseUrl/health"

# Test 2: MCP Initialize
Test-Endpoint -Name "MCP Initialize" -Method "POST" -Url "$baseUrl/mcp" -Headers $headers -Body '{"method": "initialize"}'

# Test 3: MCP Tools List
Test-Endpoint -Name "MCP Tools List" -Method "POST" -Url "$baseUrl/mcp" -Headers $headers -Body '{"method": "tools/list"}'

# Test 4: MCP Resources List
Test-Endpoint -Name "MCP Resources List" -Method "POST" -Url "$baseUrl/mcp" -Headers $headers -Body '{"method": "resources/list"}'

# Test 5: MCP Prompts List
Test-Endpoint -Name "MCP Prompts List" -Method "POST" -Url "$baseUrl/mcp" -Headers $headers -Body '{"method": "prompts/list"}'

# Test 6: Test Authentication (without token)
Write-Host "`n[TEST] Authentication Failure" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/mcp" -Method "POST" -Headers @{"Content-Type" = "application/json"} -Body '{"method": "initialize"}'
} catch {
    Write-Host "   [EXPECTED] Auth Error: $($_.Exception.Message)" -ForegroundColor Green
}

# Test 7: Test Invalid Method
Test-Endpoint -Name "Invalid Method" -Method "POST" -Url "$baseUrl/mcp" -Headers $headers -Body '{"method": "invalid/method"}'

# Test 8: Test GET request to MCP endpoint (should fail)
Write-Host "`n[TEST] Invalid GET Request to MCP" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/mcp" -Method "GET"
} catch {
    Write-Host "   [EXPECTED] 404 Error: $($_.Exception.Message)" -ForegroundColor Green
}

Write-Host "`n[SUCCESS] Test Suite Complete!" -ForegroundColor Green
