# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [1.0.12](https://github.com/hallya/ds-api/compare/v1.0.10...v1.0.12) (2025-11-09)

### [1.0.11](https://github.com/hallya/ds-api/compare/v1.0.10...v1.0.11) (2025-11-09)

### [1.0.10](https://github.com/hallya/ds-api/compare/v1.0.9...v1.0.10) (2025-11-08)

### [1.0.9](https://github.com/hallya/ds-api/compare/v1.0.8...v1.0.9) (2025-11-08)

### [1.0.8](https://github.com/hallya/ds-api/compare/v1.0.7...v1.0.8) (2025-11-08)


### Bug Fixes

* correct npm links to repo ([63f94c1](https://github.com/hallya/ds-api/commit/63f94c1e8e192c9868590e75a10c0a0e770f9337))

### [1.0.7](https://github.com/hallya/synology-download-station-api/compare/v1.0.6...v1.0.7) (2025-11-08)

## [1.0.2] - 2024-11-08

### Fixed
- CLI command name corrected for npx compatibility

## [1.0.1] - 2024-11-08

### Changed
- Added npx support: `npx ds-api` and `ds-api` commands now work

## [1.0.0] - 2024-11-08

### Changed
- Package renamed from `@hallya/synology-download-station-api` to `@hallya/ds-api` for conciseness
- Updated Node.js requirement to 18.0.0 for better performance and security
- Improved documentation with quick setup guide
- Standardized all error messages to English
- Fixed syntax error in logger configuration
- Removed debug console.log statements from production code

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