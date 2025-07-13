# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
