# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Professional documentation (CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md)
- Issue templates for bug reports, feature requests, and documentation issues
- Pull request template with comprehensive checklist
- .editorconfig for consistent code formatting across editors
- .nvmrc for Node.js version pinning
- .prettierrc for code formatting standards
- CODEOWNERS file for automatic review requests
- FUNDING.yml for potential sponsorship options

### Changed
- Updated .gitignore with comprehensive exclusions (OS files, IDE files, logs)
- Enhanced README.md with better structure and professional presentation
- Fixed badge URLs in README (corrected owner and license type)
- Updated package.json with repository metadata and keywords
- Updated SECURITY.md with current dependency status

### Removed
- Removed tracked unwanted files (.DS_Store, log files)

### Fixed
- Updated vite to latest compatible version (7.2.6)

## [v0.1.0] - 2025-11-27

### Added
- First playable version of Neo Survivors Idle: 100% client-side auto-battler (HTML/JS/CSS) with PixiJS rendering and local storage
- Infinite combat loop with automatic movement, circular shots, progressive waves, magnet-collected fragments, and passively generated essence
- Configurable upgrade tree and generators (offensive, defense, magnet, criticals, fire rate, range) including performance mode to limit effects
- Complete HUD (wave, kills, resources, version badge), consolidation prestige, and integrated debug tools to speed up local testing
