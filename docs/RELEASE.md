# Release Guide

## GNOME Extensions Publication Block (v1.2.0)

This checklist is pre-filled for the v1.2.0 artifact ready for publication on extensions.gnome.org and GitHub.

### Artifact Packet (Exact Values)

- Git tag: `v1.2.0`
- GitHub release page: `https://github.com/i-soumya18/gnome-shell-appgrid-uninstall/releases/tag/v1.2.0`
- Release ZIP asset URL: `https://github.com/i-soumya18/gnome-shell-appgrid-uninstall/releases/download/v1.2.0/appgrid-uninstall%40i-soumya18.github.io_v7.zip`
- Asset filename: `appgrid-uninstall@i-soumya18.github.io_v7.zip`
- Asset checksum: `23b19200f1a6fc1dc32a44e66cb3ab9ed0588e4d8f16e449f479396cba7d7469`
- UUID: `appgrid-uninstall@i-soumya18.github.io`
- Extension metadata version (integer): `7`

### Submission Form Values (Copy/Paste)

- Name: `App Grid Uninstall`
- UUID: `appgrid-uninstall@i-soumya18.github.io`
- Homepage URL: `https://github.com/i-soumya18/gnome-shell-appgrid-uninstall`
- Source code URL: `https://github.com/i-soumya18/gnome-shell-appgrid-uninstall`
- Bug tracker URL: `https://github.com/i-soumya18/gnome-shell-appgrid-uninstall/issues`
- License: `GPL-2.0-or-later`
- Supported GNOME versions: `42, 43, 44, 45, 46, 47, 48, 49, 50`
- Short description:

```text
Right-click any app in the GNOME App Grid to uninstall it directly, without opening GNOME Software or a terminal.
```

- Long description:

```text
Adds a native "Uninstall" option to the app icon context menu in GNOME Shell App Grid.

Features:
- Package-type detection & removal:
  • Flatpak (User & System scopes)
  • Snap packages
  • Native package managers: APT/dpkg, DNF/RPM, Zypper, Pacman/Arch, Alpine APK, Void XBPS, Solus eopkg
  • Standalone & Tarball applications (/opt, ~/Applications, desktop entries, symlinks)
  • Web Apps / PWAs (Chrome, Brave, Edge, Chromium, Firefox PWA, GNOME Web/Epiphany, Mint Web App Manager)
  • AppImage binaries (User & System scopes)
  • Steam Games (Native, Flatpak, Snap runtimes)
  • Nix & GNU Guix packages
  • Python packages via Pipx
  • Homebrew / Linuxbrew formulae
- Interactive confirmation dialog displaying package type and install directory
- Strict system app protection guardrails & directory safety blacklists
- Progress/success/error notifications via GNOME Message Tray
- Polkit-backed privileged uninstall paths for system packages
- Extension preferences for package-type toggles and confirmation behavior

Project: https://github.com/i-soumya18/gnome-shell-appgrid-uninstall
Issues: https://github.com/i-soumya18/gnome-shell-appgrid-uninstall/issues
```

### Submit-Ready Checklist

- [ ] Download the exact release artifact:

```bash
curl -L \
	-o /tmp/appgrid-uninstall@i-soumya18.github.io_v2.zip \
	https://github.com/i-soumya18/gnome-shell-appgrid-uninstall/releases/download/v1.1.1/appgrid-uninstall%40i-soumya18.github.io_v2.zip
```

- [ ] Verify checksum matches published release metadata:

```bash
echo "ace0e697a0869392b3735ccfaa5d4bdc49aec0fb4a937a6dfb65aae2e40137fe  /tmp/appgrid-uninstall@i-soumya18.github.io_v2.zip" | sha256sum -c -
```

- [ ] Verify ZIP contents are valid:

```bash
unzip -t /tmp/appgrid-uninstall@i-soumya18.github.io_v2.zip
```

- [ ] Open upload page: `https://extensions.gnome.org/upload/`
- [ ] Choose upload/update flow:
	- First publication: create a new extension entry.
	- Existing listing: upload as a new version.
- [ ] Upload `/tmp/appgrid-uninstall@i-soumya18.github.io_v2.zip`.
- [ ] Fill all form fields using "Submission Form Values" above.
- [ ] Upload screenshots:
	- App grid context menu showing Uninstall
	- Confirmation dialog
	- Preferences page (optional but recommended)
- [ ] Confirm GNOME version checkboxes match metadata (42-49).
- [ ] Submit for review.

### Post-Submit Tracking

- [ ] Track review status in your extensions.gnome.org dashboard.
- [ ] If reviewer requests changes, patch code, increment metadata version, rebuild ZIP, and resubmit.
- [ ] Mirror the same release notes to GitHub Discussions/README if you publish a public announcement.

## GitHub release

Tag and push:

```bash
git tag -a vX.Y.Z -m "Release X.Y.Z"
git push origin main vX.Y.Z
```

`release.yml` will build and attach `packaging/*.zip` artifacts.

## Debian/RPM metadata

- Debian packaging files: `packaging/debian/`
- RPM spec: `packaging/rpm/gnome-shell-appgrid-uninstall.spec`
