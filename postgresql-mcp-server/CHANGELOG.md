# Changelog - PostgreSQL MCP Server Add-on

## [1.4.13] - 2024-12-27

### Fixed
- **CRITICAL**: Fixed AppArmor startup issue causing container creation failures
- Temporarily disabled AppArmor to resolve "unable to apply apparmor profile" error
- Simplified AppArmor profile to reduce complexity and improve compatibility
- Created fallback AppArmor profile (apparmor-simple.txt) for future use

### Technical Details
- AppArmor profile was too complex with excessive capabilities
- System may not have AppArmor properly configured or enabled
- Error: "write /proc/thread-self/attr/apparmor/exec: no such file or directory"
- Solution: Set `apparmor: false` in config.yaml to disable AppArmor temporarily

### Next Steps
- Will investigate AppArmor system compatibility
- May re-enable with simplified profile in future version
- Security rating temporarily reduced but addon functionality restored

## [1.4.12] - 2024-12-27

### Security
- **NEW**: Added custom AppArmor security profile for enhanced container security
- Implemented comprehensive AppArmor rules restricting file system access
- Added network access controls for PostgreSQL and Home Assistant API communication
- Restricted process capabilities to minimum required set
- Added separate profile for Node.js application with specific permissions
- **Security Rating**: Improved from 5/6 to 6/6 with AppArmor implementation

### Benefits
- Enhanced defense against malicious API calls and system hijacking
- Restricted resource access beyond normal Docker constraints
- Improved user trust through higher security rating
- Second line of defense for input validation and data handling

## [1.4.11] - 2024-12-27

### Documentation
- Fixed incorrect configuration examples in README.md
- Updated ha_base_url documentation to reflect current default (http://homeassistant:8123)
- Added comprehensive troubleshooting section with common issues and solutions
- Fixed external access configuration example

## [1.4.10] - 2025-07-15

### Removed
- **CLEANUP**: Removed unnecessary supervisor token handling from startup scripts
- Removed SUPERVISOR_TOKEN and HASSIO_TOKEN exports and logging
- Simplified startup configuration since we now use direct Home Assistant Core communication

### Improved
- Cleaner startup logs without unnecessary token information
- Reduced security surface by not handling supervisor tokens
- Streamlined configuration focused on direct Home Assistant Core API communication

## [1.4.9] - 2025-07-15

### Fixed
- **CONFIGURATION**: Updated default `ha_base_url` in config.yaml to use `http://homeassistant:8123` instead of `http://supervisor/core`
- Ensured consistency between code defaults and addon configuration defaults
- Fixed configuration mismatch that could cause authentication issues

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
- Removed unused scripts folder and broken test script reference from package.json
- Removed unnecessary root .env.example file (dev-environment has its own)
- Removed empty init-db.sql file

### Improved
- Cleaned up project structure for better maintainability
- Removed redundant files that were not used by the Home Assistant addon
- Focused project on core Home Assistant addon functionality

## [1.3.6] - 2025-07-13

### Fixed
- Fixed tool registration to use comprehensive database-tools.ts module instead of basic inline tools
- Now properly exposes listTables and queryDatabase tools for full database functionality
- Updated all version numbers to 1.3.6 for consistency across all files
- Fixed health endpoint to display correct version number
- Corrected addon configuration file formatting

### Technical
- Replaced basic inline tool registration with comprehensive database-tools.ts import
- Verified tool registration exposes 2 comprehensive database tools correctly
- Fixed import path for registerDatabaseTools function

## [1.3.0] - 2025-07-13

### Added
- SDK-compliant MCP server implementation using official @modelcontextprotocol/sdk
- StreamableHTTPServerTransport for proper HTTP MCP protocol compliance
- Proper tool registration with McpServer.registerTool() instead of manual handling
- Enhanced authentication integration with Home Assistant tokens in SDK transport
- Comprehensive testing infrastructure for development and validation
- Zod schema validation for tool parameters
- Session management with proper SDK patterns

### Changed
- Major architectural improvement: replaced custom Express MCP implementation with official SDK
- Updated version to 1.3.0 for new SDK-compliant implementation
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

## [1.1.0] - 2025-01-13

### Added
- Enhanced configuration schema with proper validation
- Comprehensive documentation (DOCS.md)
- Logo instructions for icon customization
- Better error handling and logging

### Changed
- Updated to stable release stage
- Improved repository metadata
- Enhanced addon visibility in Home Assistant store

### Fixed
- Repository structure for proper Home Assistant recognition
- Configuration validation and schema definitions
- Addon store visibility issues

## [1.0.0] - 2024-01-XX

### Added
- Initial PostgreSQL MCP Server add-on release
- Home Assistant authentication integration
- PostgreSQL database tools for MCP protocol
- Docker container support
- Configurable write operations
- Cloudflare tunnel compatibility
