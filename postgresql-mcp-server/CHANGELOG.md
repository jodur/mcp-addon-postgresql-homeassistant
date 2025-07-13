# Changelog - PostgreSQL MCP Server Add-on

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
