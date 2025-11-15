## [1.4.0](https://github.com/hallya/ds-api/compare/v1.3.4...v1.4.0) (2025-11-15)

### Features

* **cli-handler:** add return types to handler methods ([e1aa92e](https://github.com/hallya/ds-api/commit/e1aa92e3fc46a94668bdf28c5d02d3541ab71516))

### Tests

* **helpers:** add CLIHandler test setup helpers ([72b9e52](https://github.com/hallya/ds-api/commit/72b9e5221ad4f07683253effe52b94008317d605))
* **integration:** refactor cli-handler tests to use helper functions ([9e9b4a8](https://github.com/hallya/ds-api/commit/9e9b4a86c2bb0be3336d3fd0233f5b70f96a6af6))
* **integration:** verify handleInfo return value ([b954082](https://github.com/hallya/ds-api/commit/b9540824e5257351e75769a1f5f87153fd4bae40))
* **integration:** verify handleList JSON output return value ([bbd7883](https://github.com/hallya/ds-api/commit/bbd788321f06edc82069e1d1ba7d75fe733143f1))
* **integration:** verify handleList return value ([314c12c](https://github.com/hallya/ds-api/commit/314c12c98b2453bed2056e7c551072bdeb3020ed))
* **integration:** verify handlePurge return value ([efcb3ba](https://github.com/hallya/ds-api/commit/efcb3ba97878fa3a67f282c2e29abdf21b76695a))
* **integration:** verify handleRemove return value ([3588b9a](https://github.com/hallya/ds-api/commit/3588b9af9c64f71050f502fedb6ab4dc62ae810b))

## [1.3.4](https://github.com/hallya/ds-api/compare/v1.3.3...v1.3.4) (2025-11-15)

### Bug Fixes

* **config:** make validation lazy to allow async test setup ([1a8e077](https://github.com/hallya/ds-api/commit/1a8e077baf61eb7020ff7545fbd271feba73b736))

## [1.3.3](https://github.com/hallya/ds-api/compare/v1.3.2...v1.3.3) (2025-11-12)

### CI

* **workflow:** create .env.test early with fallback values ([9c67751](https://github.com/hallya/ds-api/commit/9c67751f5d6cf3bbdfb196c99420823ce407f9c0))
* **workflow:** fix environment placement at job level ([2f56eb6](https://github.com/hallya/ds-api/commit/2f56eb603ceb31e2d44cebcea3ff44680eb5102b))
* **workflow:** use TEST environment for test variables ([ed400ca](https://github.com/hallya/ds-api/commit/ed400cadb3936f5ec27a9aa7d2d9dd7cee478dcc))

## [1.3.2](https://github.com/hallya/ds-api/compare/v1.3.1...v1.3.2) (2025-11-12)

### Refactoring

* **bin:** simplify dotenv import ([1f24839](https://github.com/hallya/ds-api/commit/1f248397ee04e249cb81722d0aad3d6305c646bf))

### CI

* **workflow:** add type check and tests before release ([70432df](https://github.com/hallya/ds-api/commit/70432df779cb13ab3728a90d11716242b1a45371))
* **workflow:** create .env.test file for tests in CI ([fe8548f](https://github.com/hallya/ds-api/commit/fe8548fec1f1fd2fac0c224fb2ee882f639c639e))
* **workflow:** update Deno to v2.x and fix type check command ([ec7c22c](https://github.com/hallya/ds-api/commit/ec7c22cb62ba40ce4e8cfc65dc573dd61da2b538))
* **workflow:** use env vars to create .env.test file ([e1c433c](https://github.com/hallya/ds-api/commit/e1c433c4ded2e3feb3485c9dcd120080b0bd9b85))
* **workflow:** use GitHub variables with defaults for test env ([8bcbb92](https://github.com/hallya/ds-api/commit/8bcbb92a7da7251216c0cfd11ce64404a8b4a3a3))

## [1.3.1](https://github.com/hallya/ds-api/compare/v1.3.0...v1.3.1) (2025-11-12)

### Refactoring

* **tests:** simplify assert imports using import map ([0a0fb6e](https://github.com/hallya/ds-api/commit/0a0fb6e939be97c1ba5dbb1ad11edf5c78b8650a))
* **tests:** update all test files to use std/assert import map ([4ebb48b](https://github.com/hallya/ds-api/commit/4ebb48b2f10a26b92bc1b2bb110ff4dbcf6ceaa3))

### CI

* **workflow:** install Deno in release workflow ([b63d4f8](https://github.com/hallya/ds-api/commit/b63d4f82b158e467e8fc8b51695deb2e4637e413))

### Tests

* **integration:** add file operations tests for deleteFromSystem ([c1ffa9a](https://github.com/hallya/ds-api/commit/c1ffa9aa15824d1b92661d7e3f5b221de5f5e12c))

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
