# Quick Start Script for Development Environment

Write-Host "🚀 Starting PostgreSQL MCP Server Development Environment..." -ForegroundColor Green
Write-Host ""

# Check if Docker is available for PostgreSQL
$dockerAvailable = $false
try {
    docker --version | Out-Null
    $dockerAvailable = $true
    Write-Host "✅ Docker is available" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Docker not found - you'll need to set up PostgreSQL manually" -ForegroundColor Yellow
}

# Offer to start PostgreSQL with Docker
if ($dockerAvailable) {
    $response = Read-Host "🐳 Would you like to start a PostgreSQL database with Docker? (y/n)"
    if ($response -eq "y" -or $response -eq "Y") {
        Write-Host "🗄️ Starting PostgreSQL container..." -ForegroundColor Blue
        
        # Stop any existing container
        docker stop postgres-dev 2>$null
        docker rm postgres-dev 2>$null
        
        # Start new container
        docker run --name postgres-dev `
            -e POSTGRES_DB=mcptest `
            -e POSTGRES_USER=mcpuser `
            -e POSTGRES_PASSWORD=mcppass `
            -p 5432:5432 `
            -d postgres:15-alpine
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ PostgreSQL container started successfully" -ForegroundColor Green
            Write-Host "📋 Database details:" -ForegroundColor Cyan
            Write-Host "   Host: localhost" -ForegroundColor White
            Write-Host "   Port: 5432" -ForegroundColor White
            Write-Host "   Database: mcptest" -ForegroundColor White
            Write-Host "   User: mcpuser" -ForegroundColor White
            Write-Host "   Password: mcppass" -ForegroundColor White
            Write-Host ""
            
            # Wait for database to be ready
            Write-Host "⏳ Waiting for database to be ready..." -ForegroundColor Yellow
            Start-Sleep -Seconds 3
        } else {
            Write-Host "❌ Failed to start PostgreSQL container" -ForegroundColor Red
            exit 1
        }
    }
}

# Set up development environment
Write-Host "📦 Setting up development environment..." -ForegroundColor Blue

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "📝 Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    
    if ($dockerAvailable -and $response -eq "y") {
        # Update .env with Docker database settings
        (Get-Content ".env") -replace "DATABASE_URL=.*", "DATABASE_URL=postgresql://mcpuser:mcppass@localhost:5432/mcptest" | Set-Content ".env"
        Write-Host "✅ Updated .env with Docker database settings" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Please edit .env file with your database configuration" -ForegroundColor Yellow
    }
}

# Install dependencies and build
Write-Host "📦 Installing dependencies..." -ForegroundColor Blue
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "🔨 Building TypeScript..." -ForegroundColor Blue
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful" -ForegroundColor Green
} else {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}

# Set up test database if using Docker
if ($dockerAvailable -and $response -eq "y") {
    Write-Host "🗄️ Setting up test database schema..." -ForegroundColor Blue
    npm run db:setup
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Test database setup complete" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Database setup had issues - check connection" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "🎉 Development environment is ready!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 To start the server:" -ForegroundColor Cyan
Write-Host "   npm run dev    # Development mode with auto-reload" -ForegroundColor White
Write-Host "   npm start      # Production mode" -ForegroundColor White
Write-Host ""
Write-Host "🧪 To test the server:" -ForegroundColor Cyan
Write-Host "   curl http://localhost:3000/health" -ForegroundColor White
Write-Host ""
Write-Host "📖 See README.md for detailed testing instructions" -ForegroundColor Cyan

# Offer to start the server
$startServer = Read-Host "🚀 Would you like to start the development server now? (y/n)"
if ($startServer -eq "y" -or $startServer -eq "Y") {
    Write-Host "🚀 Starting development server..." -ForegroundColor Green
    npm run dev
}
