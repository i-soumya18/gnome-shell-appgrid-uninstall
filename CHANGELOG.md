# Changelog

## [Unreleased]

## [1.2.0] - 2026-11-09

### Added
- Comprehensive detection and full cleanup for standalone/tarball applications installed in `/opt/...`, `~/Applications/...`, `~/.local/opt/...`, and `/usr/local/share/...`.
- Automated detection of application install directories (`_resolveInstallDir`), binary symlinks in `/usr/local/bin` and `~/.local/bin`, and uninstaller scripts.
- Strict directory safety blacklist (`SystemAppGuard.isSafeDirectoryToDelete`) preventing destructive deletions of system/user root directories.
- Support for Nix and GNU Guix applications via `nix profile remove` and `nix-env -e`.
- Support for native GNOME Web (Epiphany) web apps and profile cleanup, plus Linux Mint Web App Manager (`ice` / `webapp-manager`).
- Support for system-wide AppImages located outside user home (`pkexec rm -f`).
- Universal Steam uninstallation dispatch via `Gio.AppInfo.launch_default_for_uri` supporting Native, Flatpak, and Snap Steam installations.
- Official GNOME Shell 50 compatibility in metadata and test suite.

### Fixed
- Fixed root cause where applications in `/usr/share/applications` unowned by distribution package managers (e.g. Antigravity IDE) were marked as `UNKNOWN`.
- Fixed GLib critical assertion warning (`standard::is-symlink`) during canonical symlink resolution.
- Fixed Flatpak `Exec=` line regex when command-line flags precede the application ID.
- Fixed `dpkg -S` query parsing when multiple comma-separated packages own a target path.
- Fixed custom app uninstallation leaving hundreds of megabytes of application files orphaned on disk.

### Changed
- Metadata integer version bumped to 7 for extensions.gnome.org release.
- Confirmation dialog now transparently displays standalone application installation folders.
- Enhanced settings with toggles for Nix and Custom package management.

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
