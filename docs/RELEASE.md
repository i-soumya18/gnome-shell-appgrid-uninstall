# Release Guide

## GNOME Extensions Publication Block (v1.1.1)

This checklist is pre-filled for the exact v1.1.1 artifact already published on GitHub.

### Artifact Packet (Exact Values)

- Git tag: `v1.1.1`
- GitHub release page: `https://github.com/i-soumya18/gnome-shell-appgrid-uninstall/releases/tag/v1.1.1`
- Release ZIP asset URL: `https://github.com/i-soumya18/gnome-shell-appgrid-uninstall/releases/download/v1.1.1/appgrid-uninstall%40i-soumya18.github.io_v2.zip`
- Asset filename: `appgrid-uninstall@i-soumya18.github.io_v2.zip`
- Asset checksum (from GitHub release metadata): `ace0e697a0869392b3735ccfaa5d4bdc49aec0fb4a937a6dfb65aae2e40137fe`
- UUID: `appgrid-uninstall@i-soumya18.github.io`
- Extension metadata version (integer): `2`

### Submission Form Values (Copy/Paste)

- Name: `App Grid Uninstall`
- UUID: `appgrid-uninstall@i-soumya18.github.io`
- Homepage URL: `https://github.com/i-soumya18/gnome-shell-appgrid-uninstall`
- Source code URL: `https://github.com/i-soumya18/gnome-shell-appgrid-uninstall`
- Bug tracker URL: `https://github.com/i-soumya18/gnome-shell-appgrid-uninstall/issues`
- License: `GPL-2.0-or-later`
- Supported GNOME versions: `42, 43, 44, 45, 46, 47, 48, 49`
- Short description:

```text
Right-click any app in the GNOME App Grid to uninstall it directly, without opening GNOME Software or a terminal.
```

- Long description:

```text
Adds a native "Uninstall" option to the app icon context menu in GNOME Shell App Grid.

Features:
- Detects package type (Flatpak, Snap, APT/dpkg, RPM, DNF)
- Confirmation dialog before uninstall
- System app protection guard
- Progress/success/error notifications
- Polkit-backed privileged uninstall paths for system packages
- Preferences for confirmation and package-type behavior

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
