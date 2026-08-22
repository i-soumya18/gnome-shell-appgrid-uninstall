# Architecture

## High-level flow

1. User right-clicks an app icon in GNOME App Grid.
2. `appGridMenu.js` injects and handles `Uninstall` action.
3. `uninstallManager.js` orchestrates protection checks, detection, confirmation, and execution.
4. `packageDetector.js` determines install source (Flatpak/Snap/APT/RPM/DNF).
5. `confirmDialog.js` prompts user before destructive action.
6. `notificationHandler.js` reports progress and final state.
7. For privileged package managers, uninstall runs via `pkexec` under Polkit policy control.

## Extension modules

- `extension.js`: enable/disable lifecycle
- `appGridMenu.js`: AppIcon menu patch/unpatch
- `packageDetector.js`: package ownership/type detection
- `uninstallManager.js`: uninstall orchestration and subprocess execution
- `confirmDialog.js`: modal confirmation/warning dialogs
- `notificationHandler.js`: message tray integration
- `systemAppGuard.js`: protected app checks
- `prefs.js`: Adwaita preferences UI with GSettings bindings
- `schemas/*.gschema.xml`: extension settings schema

## Privilege model

- Flatpak user-level removals run without elevation
- Snap/APT/RPM/DNF operations run through `pkexec`
- Polkit action policy is shipped in `helper/data/org.gnome.AppGridUninstall.policy`

## Compatibility strategy

- GNOME version-specific menu patch targets are resolved dynamically
- MessageTray notification constructor path includes GNOME pre/post-45 compatibility fallback
