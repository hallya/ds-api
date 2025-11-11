## [1.3.0](https://github.com/hallya/ds-api/compare/v1.2.1...v1.3.0) (2025-11-11)

### Features

* **config:** add import maps for test setup and mocking libraries ([e4cf55b](https://github.com/hallya/ds-api/commit/e4cf55b3c92e29316f776bbd923cd1c7b71f0802))
* **deno:** migrate to Deno (step 1) ([6da18d1](https://github.com/hallya/ds-api/commit/6da18d199d9c5682780d3a0b8dde2f0ff523d8a9))
* **tests:** add centralized test setup file ([f857859](https://github.com/hallya/ds-api/commit/f857859abcaa5f275cfb91bdfa8110b92da107d5))
* **tests:** add test factories for tasks and API responses (step 3) ([ac05b64](https://github.com/hallya/ds-api/commit/ac05b64296288bc076351578ced79bbf20f54561))
* **tests:** configure Deno tests and setup helpers (step 4) ([77b3a64](https://github.com/hallya/ds-api/commit/77b3a6481d29aff57cda8dcc0fee21425a68359e))
* **types:** add TypeScript types based on torrents.json (step 2) ([93020d0](https://github.com/hallya/ds-api/commit/93020d077a00f1af04b54580c6d74f6e39cc3e4a))

### Refactoring

* **config:** improve log level typing and normalization ([4d2c8df](https://github.com/hallya/ds-api/commit/4d2c8dfaacbf96e5016455f0ee6241b0ddce7d07))
* **lib:** minor import and formatting improvements ([ed1d6fa](https://github.com/hallya/ds-api/commit/ed1d6faa18fd13e50ac1d852d53af9b2501d26d0))
* **tests:** add constants and improve createTaskDetail normalization ([4723cbd](https://github.com/hallya/ds-api/commit/4723cbd0aaaf8712e8fb55aaba2d39d2caadf2fa))
* **tests:** update unit tests to use [@test-setup](https://github.com/test-setup) and new factories ([90bda6e](https://github.com/hallya/ds-api/commit/90bda6e7143c76b0142e87f61f9b54968c9e7d6f))
* **types:** remove lib/types.ts and update imports ([5b43110](https://github.com/hallya/ds-api/commit/5b43110e66e7a910d3d2caad118bb5cd7f6cc9a3))
* **types:** separate API types from internal types ([ebf7a52](https://github.com/hallya/ds-api/commit/ebf7a5267f9a9e016a9ab8aaa8ddff496e0f1701))

### Tests

* **integration:** add integration tests for cli-handler and synology-ds ([c54ef49](https://github.com/hallya/ds-api/commit/c54ef4971d2cdc51625e88f64c8884db7898051f))
* **unit:** ajouter tests unitaires avec structure t.step ([1d24989](https://github.com/hallya/ds-api/commit/1d2498938cf1b39408d3dc015bc5702d3f10fd5b))

## [1.2.1](https://github.com/hallya/ds-api/compare/v1.2.0...v1.2.1) (2025-11-11)

### Bug Fixes

* **synology-ds:** use path.join() to properly construct file paths ([548807d](https://github.com/hallya/ds-api/commit/548807d6b6ebce9f88a909c8cd0f3eb0b9cae3ba))

## [1.2.0](https://github.com/hallya/ds-api/compare/v1.1.1...v1.2.0) (2025-11-11)

### Features

* **synology-ds:** add concurrency protection for authenticate() and getTasks() ([c74b37c](https://github.com/hallya/ds-api/commit/c74b37c506a4299a339d633656f3cbcd8b90d2a8))

### Bug Fixes

* **security:** improve path validation using path.resolve() ([c5b8c40](https://github.com/hallya/ds-api/commit/c5b8c40008d8093a21cbe77932b2763316fc2088))
* **security:** replace exec() with fs.rm() to prevent shell injection ([f2f0b98](https://github.com/hallya/ds-api/commit/f2f0b98f8d406b093077e2ffc35ff258bd24e913))

### Refactoring

* extract helpers and improve dry-run logging ([642b9ea](https://github.com/hallya/ds-api/commit/642b9ea91d5dac199e330f6e610bd1e754bc851b))
* **synology-ds:** extract logging methods and improve code consistency ([9bb4133](https://github.com/hallya/ds-api/commit/9bb4133beb0ec1a2f6d187bf3cb4eea9d3726014))
* **synology-ds:** handle partial deletion errors gracefully ([f6a6b5a](https://github.com/hallya/ds-api/commit/f6a6b5a603522341ecfe20a8de58817bcbd205b5))
* **synology-ds:** inject config dependencies for testability ([570a7c4](https://github.com/hallya/ds-api/commit/570a7c4915a9596fe2d132624cb92d45f54a92ce))
* **synology-ds:** use ES2022 private methods ([#method](https://github.com/hallya/ds-api/issues/method)Name) ([db51e37](https://github.com/hallya/ds-api/commit/db51e37c73b1f81b2fdc1699206b5f08499fbd5c)), closes [#methodName](https://github.com/hallya/ds-api/issues/methodName)

### Documentation

* **synology-ds:** document size formatting choice (1000 vs 1024) ([fc40a22](https://github.com/hallya/ds-api/commit/fc40a2272b30a3289137782623bbc9d3762a22c5))

## [1.1.1](https://github.com/hallya/ds-api/compare/v1.1.0...v1.1.1) (2025-11-11)

### CI

* update semantic-release configuration ([65360b6](https://github.com/hallya/ds-api/commit/65360b61c2cadedfc5b153872f1f76fa20b1dcb4))

# [1.1.0](https://github.com/hallya/ds-api/compare/v1.0.12...v1.1.0) (2025-11-11)


### Features

* **deletion:** improve logging precision for each deletion step ([e287e0d](https://github.com/hallya/ds-api/commit/e287e0db348dcbdeb140d9f951291454f6562d51))

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
