# Changelog - PostgreSQL MCP Server Add-on

## [1.4.0] - 2025-07-14

### Added
- Added addon icon.png for better visual identification in Home Assistant UI
- Added comprehensive VS Code MCP setup documentation (VS_CODE_SETUP.md)
- Added VS Code MCP configuration files for easy setup
- Added version update checklist for maintainers

### Improved
- Enhanced documentation for VS Code integration
- Streamlined development workflow with configuration templates

### Verified
- Tested with TimescaleDB hypertables (16M+ records)
- Confirmed comprehensive database tools working correctly
- VS Code MCP integration functional

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
