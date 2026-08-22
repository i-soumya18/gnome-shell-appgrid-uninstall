# Changelog

## [Unreleased]

### Added

### Fixed

### Changed

## [1.1.1] - 2026-04-17

### Added

### Fixed
- GitHub release workflow token permissions to allow release creation.

### Changed
- Release tag target updated to v1.1.1 while keeping GNOME metadata version at 2.

## [1.1.0] - 2026-04-17

### Added
- CI lint and build-check workflow.
- Deterministic unit coverage for uninstall manager behavior.
- Opt-in destructive integration tests for Flatpak, Snap, and APT flows.

### Fixed
- Enforced uninstall settings toggles for confirmation, package-type enablement, and success notifications.
- Applied user blocked-apps protection from GSettings.
- Removed default installation of optional helper D-Bus service metadata until helper backend is implemented.

### Changed
- Hardened GNOME-shell-independent testability via lazy imports and dependency injection in uninstall manager.
- Improved integration test harness skip handling and CI non-destructive defaults.
