# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
