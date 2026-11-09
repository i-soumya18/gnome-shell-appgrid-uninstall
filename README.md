# App Grid Uninstall

Right-click any app in the GNOME App Grid and uninstall it directly.

`App Grid Uninstall` is a GNOME Shell extension that adds an **Uninstall** action to app icon context menus in Activities -> App Grid.

## Features

- App-grid context menu injection with clean enable/disable lifecycle
- Package-type detection and uninstallation for:
  - Flatpak (User & System scopes)
  - Snap (All desktop paths, `X-SnapInstanceName`, `Exec=/snap/bin/...`)
  - APT / dpkg (Debian, Ubuntu, Mint, Pop!_OS)
  - DNF / DNF5 / RPM (Fedora, RHEL, CentOS, Rocky, Alma)
  - Zypper / RPM (openSUSE, SLES)
  - Pacman / ALPM (Arch Linux, Manjaro, EndeavourOS, Garuda)
  - APK (Alpine Linux)
  - XBPS (Void Linux)
  - EOPKG (Solus)
  - AppImage (Standalone, AppImageLauncher, Gear Lever)
  - Web Apps / PWAs (Google Chrome, Chromium, Brave, Microsoft Edge, Firefox PWA, GNOME Web / Epiphany, Web App Manager)
  - Homebrew / Linuxbrew
  - Pipx (Python applications)
  - Nix / GNU Guix (nix profile, nix-env)
  - Steam Games (Native, Flatpak, Snap runtimes)
  - Custom / Standalone Applications & Tarballs (/opt, ~/Applications, desktop entries, symlinks)
- Interactive uninstall confirmation dialog with install path display
- Protected system-app guardrails & strict directory safety blacklists
- Progress/success/error notifications via GNOME Message Tray
- Polkit-based privileged uninstall path (`pkexec`) for system packages and standalone directories
- Preferences panel in GNOME Extensions settings (behavior + package-type toggles)
- Release packaging for:
  - extensions.gnome.org ZIP
  - Debian (`packaging/debian`)
  - RPM (`packaging/rpm`)
- Optional native D-Bus helper metadata (disabled by default until helper backend is implemented)

## Compatibility

- Ubuntu 22.04 LTS / 24.04 LTS
- GNOME Shell 42-50

## Current Release

- Semantic release tag: v1.2.0
- GNOME Extensions metadata version: 7

## Project Status

Current implementation includes the production extension path from Phases 1-9 in `CLAUDE.md`.

- Implemented: core extension, context menu patching, uninstall backend, settings-driven behavior toggles, dialogs, notifications, Polkit policy assets, preferences UI, unit tests, packaging workflow
- In progress / roadmap: full GNOME UI automation for uninstall interaction tests, optional native D-Bus helper daemon implementation

## Quick Start (Development)

```bash
sudo apt update
sudo apt install -y \
  gnome-shell gnome-shell-extensions gnome-extensions-app \
  gjs libglib2.0-dev libpolkit-gobject-1-dev \
  meson ninja-build gcc flatpak snapd xdotool xvfb dbus-x11 \
  eslint shellcheck jq zip unzip

npm install -g eslint @eslint/js
```

```bash
meson setup build --prefix=/usr
ninja -C build
```

```bash
REPO="$HOME/Projects/gnome-shell-appgrid-uninstall"
EXT_UUID="appgrid-uninstall@i-soumya18.github.io"
DEST="$HOME/.local/share/gnome-shell/extensions/$EXT_UUID"

mkdir -p "$DEST"
rsync -a --delete "$REPO/extension/" "$DEST/"
glib-compile-schemas "$DEST/schemas"
gnome-extensions enable "$EXT_UUID"
```

Logs:

```bash
journalctl -f -o cat /usr/bin/gnome-shell | grep AppGridUninstall
```

## Packaging

Create extensions.gnome.org ZIP:

```bash
bash packaging/make_zip.sh
```

Artifacts and metadata for Debian/RPM are available under `packaging/`.

## Testing

Run unit tests:

```bash
gjs -m tests/unit/run_all.js
```

Run destructive integration tests (opt-in only):

```bash
APPGRID_UNINSTALL_DESTRUCTIVE_TESTS=1 bash tests/integration/run_all.sh
```

Without `APPGRID_UNINSTALL_DESTRUCTIVE_TESTS=1`, integration tests are reported as skipped.

## Documentation

- [Install Guide](docs/INSTALL.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Contributing](docs/CONTRIBUTING.md)
- [Security Policy](SECURITY.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Changelog](CHANGELOG.md)

## Security Notes

- No shell interpolation for uninstall commands; subprocesses use argv arrays
- Privileged package removal routes through Polkit + `pkexec`
- System app guard blocks protected components

## License

GPL-2.0-or-later. See `LICENSE`.
