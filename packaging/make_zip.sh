#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXT_DIR="$ROOT_DIR/extension"

UUID="$(jq -r '.uuid' "$EXT_DIR/metadata.json")"
VERSION="$(jq -r '.version' "$EXT_DIR/metadata.json")"
ZIP_NAME="${UUID}_v${VERSION}.zip"
OUT_PATH="$ROOT_DIR/packaging/$ZIP_NAME"

echo "Building $ZIP_NAME..."

glib-compile-schemas "$EXT_DIR/schemas/"
rm -f "$OUT_PATH"

(
  cd "$EXT_DIR"
  zip -r "$OUT_PATH" . \
    --exclude "*.pyc" \
    --exclude "__pycache__/*" \
    --exclude "*.swp" \
    --exclude "*.bak" \
    --exclude "schemas/gschemas.compiled" \
    --exclude "meson.build" \
    --exclude ".DS_Store" \
    --exclude ".*.swp"
)

echo "Created: $OUT_PATH"
echo "Upload at: https://extensions.gnome.org/upload/"
