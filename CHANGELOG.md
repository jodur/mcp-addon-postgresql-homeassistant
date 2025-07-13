# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
