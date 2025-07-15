# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.8] - 2025-07-15

### Fixed
- **AUTHENTICATION**: Fixed Home Assistant API URL handling for token validation
- Corrected hostname from `homeAssistant` to `homeassistant` (lowercase) for proper internal network communication
- Fixed double `/api` path issue in URL construction
- Added proper trailing slash removal for clean URLs
- Token validation now uses direct connection to Home Assistant Core over internal network

### Improved
- Better URL sanitization and handling
- Enhanced debug logging for authentication troubleshooting
- More robust token validation endpoint selection

## [1.4.7] - 2025-07-15

### Fixed
- **SIMPLIFIED**: Completely simplified authentication to use single Home Assistant API call
- Removed overly complex authentication logic with multiple fallback endpoints
- Authentication now makes single call to `/api/config` endpoint to validate tokens
- Improved authentication performance and reliability
- Cleaner error handling and debug logging

### Code Quality
- Reduced authentication code from 200+ lines to ~50 lines
- Improved code maintainability and readability
- Simplified token validation logic

## [1.4.6] - 2025-07-14

### Security
- **CRITICAL**: Fixed authentication security vulnerability that accepted any well-formatted token
- Restored proper Home Assistant API validation for tokens
- Authentication now requires valid token validation against Home Assistant API endpoints
- Added multi-endpoint validation (config, states, auth endpoints) for reliable token verification

### Fixed
- Token validation now properly rejects invalid tokens
- Improved error handling for authentication failures
- Enhanced debug logging for authentication process

## [1.4.5] - 2025-07-14

### Fixed
- **CRITICAL**: Simplified authentication to use token format validation for add-on context
- Removed complex API endpoint validation that was failing in add-on environment
- Fixed authentication to work with Home Assistant add-on network limitations
- Enhanced token format validation for JWT and long-lived tokens

### Improved
- More reliable authentication for add-on deployment
- Better debug logging for token validation process
- Simplified validation approach suitable for secure add-on environment

### Changed
- **BREAKING**: Switched to simplified token validation appropriate for add-on context
- Removed external API dependency for token validation

## [1.4.4] - 2025-07-14

### Fixed
- **CRITICAL**: Fixed Home Assistant add-on authentication to use proper HA add-on communication patterns
- Implemented multi-method authentication validation (auth endpoint, states API, supervisor API)
- Added SUPERVISOR_TOKEN and HASSIO_TOKEN environment variable support
- Fixed authentication flow to follow Home Assistant add-on development guidelines
- Enhanced debug logging for supervisor token availability

### Improved
- Better error handling for different authentication methods
- Comprehensive authentication fallback system
- Enhanced debugging for add-on communication troubleshooting

## [1.4.3] - 2025-07-14

### Fixed
- **CRITICAL**: Fixed double Bearer prefix issue causing authentication failures
- Added robust token cleaning to handle gateway-added Bearer prefixes
- Enhanced debug logging to show token processing steps
- Fixed character encoding issue in HA Base URL logging

### Improved
- Better error handling for malformed tokens
- Enhanced debugging output for authentication troubleshooting

## [1.4.2] - 2025-07-14

### Security
- **CRITICAL**: Fixed authentication bypass vulnerability that allowed invalid tokens through Cloudflare tunnels
- Removed insecure fallback authentication that could be exploited
- Enforced strict Home Assistant API validation for all authentication requests

### Improved
- Removed unnecessary JWT parsing for long-lived tokens (performance optimization)
- Added comprehensive debug logging that only activates when `LOG_LEVEL=debug`
- Simplified authentication flow for better security and performance
- Enhanced error handling with better user feedback

### Removed
- Removed `extractUserIdFromToken` function (not needed for long-lived tokens)
- Removed `fallbackTokenValidation` function (security vulnerability)
- Removed development mode authentication bypasses

## [1.4.1] - 2025-07-14

### Removed
- Removed unused `scripts/` folder and broken test script reference
- Removed unnecessary root `.env.example` file (dev-environment has its own)
- Removed empty `init-db.sql` file

### Improved
- Cleaned up project structure for better maintainability
- Removed redundant files that were not used by the Home Assistant addon
- Updated documentation to reflect current project structure

## [1.3.2] - 2025-07-13

### Changed
- Consolidated SDK-compliant implementation into main index.ts file
- Removed redundant index-sdk-compliant.ts file for cleaner codebase
- Updated all build scripts and configurations to use standard index.js

### Improved
- Simplified project structure with single main entry point
- Reduced complexity and potential configuration errors

## [1.3.1] - 2025-07-13

### Fixed
- CRITICAL: Updated addon to run SDK-compliant implementation instead of legacy version
- Fixed VS Code MCP integration hanging on initialize request

## [1.3.0] - 2025-07-13

### Added
- SDK-compliant MCP server implementation using official @modelcontextprotocol/sdk
- StreamableHTTPServerTransport for proper HTTP MCP protocol compliance
- Proper tool registration with McpServer.registerTool() instead of manual handling
- Enhanced authentication integration with Home Assistant tokens in SDK transport
- Comprehensive testing infrastructure:
  - PowerShell test script (test-mcp-server.ps1)
  - Node.js test client (test-client.js)
  - Jest unit tests (mcp-server.test.js)
  - Postman collection (postman-tests.json)
  - Testing documentation (TESTING.md)
- Zod schema validation for tool parameters
- Session management with proper SDK patterns

### Changed
- Major architectural improvement: replaced custom Express MCP implementation with official SDK
- Updated all version numbers to 1.3.0 across config.yaml, package.json, and source files
- Improved MCP protocol compliance using StreamableHTTPServerTransport

### Fixed
- MCP protocol compliance issues with custom implementation
- Tool registration not following SDK patterns
- Session handling and transport layer improvements

## [1.2.1] - 2025-01-13

### Added
- Comprehensive configuration debugging to identify why addon settings aren't being read
- Enhanced run.sh with detailed bashio configuration debugging
- Fallback configuration reader using direct JSON parsing from /data/options.json
- Node.js configuration reader as backup when bashio commands fail
- Filesystem and environment debugging for troubleshooting

### Fixed
- Configuration parameters not being properly passed from Home Assistant to container
- Missing default values when configuration reading fails
- Container now properly restarts with new parameters instead of requiring rebuild

### Improved
- Better error handling and logging for configuration issues
- Added jq to Dockerfile for improved JSON parsing capabilities

## [1.2.0] - 2025-01-13

### Added
- Comprehensive database connection logging and debugging
- Detailed configuration value logging from Home Assistant addon settings
- Enhanced startup logging with visual indicators and status
- Database connection details (PostgreSQL version, database name, user)
- Environment variable debugging for troubleshooting configuration issues

### Improved
- Better error messages with full context for database connection failures
- Structured logging output with emojis and clear sections
- Credential masking in logs for security while maintaining debugging capability

### Changed
- Enhanced run.sh script to log all configuration values as they're read
- Improved server startup sequence with detailed status reporting

## [1.1.1] - 2025-01-13

### Added
- Enhanced addon configuration with required metadata fields
- Comprehensive addon documentation (DOCS.md, CHANGELOG.md)
- Logo instructions for proper icon setup
- Improved repository metadata in repository.json

### Fixed
- Addon visibility issues in Home Assistant store
- Missing required configuration fields (boot, stage, codenotary)
- Image reference removed for local addon building
- Enhanced schema validation

### Changed
- Updated version to 1.1.0 in addon configuration
- Set addon stage to 'stable' for better visibility
- Improved documentation structure

## [1.1.0] - 2025-01-13

### Added
- Repository restructured for Home Assistant addon store compatibility
- Added `repository.json` file for proper addon repository recognition
- Created dedicated addon directory structure (`postgresql-mcp-server/`)
- Added addon-specific README and icon placeholder

### Changed
- Moved all addon files to `postgresql-mcp-server/` subdirectory
- Updated repository README with proper installation instructions
- Repository now follows Home Assistant addon repository conventions

### Fixed
- Repository can now be properly added to Home Assistant addon store

## [1.0.0] - 2024-01-XX

### Added
- Initial release of PostgreSQL MCP Server addon for Home Assistant
- Home Assistant authentication integration
- PostgreSQL database connection with connection pooling
- MCP tools for database operations:
  - `listTables`: List database tables with schema information
  - `queryDatabase`: Execute read-only SQL queries
  - `executeDatabase`: Execute write operations (configurable)
  - `health`: Health check endpoint
  - `serverInfo`: Server configuration information
- SQL injection protection and query validation
- Role-based access control for write operations
- Docker-based Home Assistant addon packaging
- Comprehensive logging and error handling
- Configuration through Home Assistant UI
- Support for Cloudflare tunnel integration

### Security
- Authentication required for all operations
- SQL injection protection
- User permission validation
- Connection limits and pooling
- Audit logging

### Documentation
- Complete README with setup instructions
- Addon documentation for Home Assistant
- MCP client configuration examples
- Security guidelines
- Troubleshooting guide
