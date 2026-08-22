# Contributing

## Setup

```bash
sudo apt update
sudo apt install -y \
  gnome-shell gnome-shell-extensions gnome-extensions-app \
  gjs libglib2.0-dev libpolkit-gobject-1-dev \
  meson ninja-build gcc flatpak snapd xdotool xvfb dbus-x11 \
  eslint shellcheck jq zip unzip

npm install -g eslint @eslint/js
```

## Development workflow

1. Create a branch from `main`
2. Make focused changes
3. Run checks
4. Open PR with context and test notes

## Checks

```bash
jq . extension/metadata.json > /dev/null
glib-compile-schemas --strict extension/schemas/
shellcheck packaging/*.sh tests/integration/*.sh
gjs -m tests/unit/run_all.js
APPGRID_UNINSTALL_DESTRUCTIVE_TESTS=1 bash tests/integration/run_all.sh
```

If you do not set `APPGRID_UNINSTALL_DESTRUCTIVE_TESTS=1`, integration tests are skipped.

## Rules

- Keep `enable()` and `disable()` symmetrical
- Restore all monkey patches on disable
- Use argv arrays for subprocesses (no shell interpolation)
- Keep user-visible text translatable

## Pull request checklist

- [ ] No lint errors
- [ ] Unit tests pass
- [ ] Integration scripts run
- [ ] Feature/bug behavior validated manually
- [ ] Docs updated when behavior changes
