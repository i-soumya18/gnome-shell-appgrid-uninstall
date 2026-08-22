# Install Guide

## 1) End-user install (local)

The commands below work from any current directory.

```bash
REPO="$HOME/Projects/gnome-shell-appgrid-uninstall"
EXT_UUID="appgrid-uninstall@i-soumya18.github.io"
DEST="$HOME/.local/share/gnome-shell/extensions/$EXT_UUID"

mkdir -p "$DEST"
rsync -a --delete "$REPO/extension/" "$DEST/"
glib-compile-schemas "$DEST/schemas"
gnome-extensions enable "$EXT_UUID"
```

On Wayland, log out/in if GNOME Shell does not immediately pick up changes.

## 2) Build + install (system)

```bash
meson setup build --prefix=/usr
ninja -C build
sudo meson install -C build
```

This installs extension files, schemas, and helper policy metadata to system paths.

If you explicitly want to install optional native-helper D-Bus metadata scaffolding,
configure Meson with:

```bash
meson setup build --prefix=/usr -Dinstall_helper_service_metadata=true
```

## 3) Packaging install paths

- Extension JS files: `/usr/share/gnome-shell/extensions/appgrid-uninstall@i-soumya18.github.io`
- GSettings schema XML: `/usr/share/glib-2.0/schemas`
- Polkit policy: `/usr/share/polkit-1/actions/org.gnome.AppGridUninstall.policy`

## 4) Troubleshooting

- Extension not visible: verify UUID folder name exactly matches `metadata.json`
- Settings schema errors: re-run `glib-compile-schemas` in installed schema directory
- Polkit prompt not shown: ensure a polkit agent is running in your desktop session
- `rsync: change_dir .../extension failed`: set `REPO` to your actual clone path
