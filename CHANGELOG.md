# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-11-08

### Added
- Initial release of Synology Download Station API library
- Full API client for Synology Download Station operations
- CLI tool (`ds-torrents`) for command-line torrent management
- Support for authentication, task listing, removal, and purging
- Environment variable configuration with validation
- Comprehensive error handling and retry logic
- TypeScript-style JSDoc documentation
- Unit test framework setup (Jest ready)

### Features
- **Library Usage**: Programmatic access to Download Station API
- **CLI Commands**:
  - `list`: Display all download tasks
  - `remove`: Remove tasks by title
  - `purge`: Remove tasks by size limit with dry-run support
  - `info`: Get detailed information about specific tasks
- **Configuration**: Flexible environment variable setup
- **Security**: Path validation and SSL verification options

### Technical Details
- Node.js 14+ compatibility
- ES modules support
- Winston logging with configurable levels
- Joi schema validation for configuration
- Exponential backoff retry mechanism

### Documentation
- Complete README with usage examples
- API reference documentation
- Configuration guide
- Troubleshooting section

---

## Types of changes
- `Added` for new features
- `Changed` for changes in existing functionality
- `Deprecated` for soon-to-be removed features
- `Removed` for now removed features
- `Fixed` for any bug fixes
- `Security` in case of vulnerabilities