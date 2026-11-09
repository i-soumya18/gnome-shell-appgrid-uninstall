#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "=== GNOME Extension Pre-Submission Checklist ==="
echo ""

# 1. Check metadata.json
echo "[1/7] Checking metadata.json..."
jq . extension/metadata.json > /dev/null || { echo "ERROR: Invalid JSON"; exit 1; }

UUID=$(jq -r '.uuid' extension/metadata.json)
VERSION=$(jq -r '.version' extension/metadata.json)
echo "  ✓ UUID: $UUID"
echo "  ✓ Version: $VERSION"
echo "  ✓ Name: $(jq -r '.name' extension/metadata.json)"
echo "  ✓ GNOME versions: $(jq -r '.["shell-version"] | join(", ")' extension/metadata.json)"

# 2. Check required files
echo ""
echo "[2/7] Checking required project files..."
required_files=(
  "extension/metadata.json"
  "extension/extension.js"
  "extension/packageDetector.js"
  "extension/uninstallManager.js"
  "extension/confirmDialog.js"
  "extension/systemAppGuard.js"
  "extension/prefs.js"
  "extension/schemas/org.gnome.shell.extensions.appgrid-uninstall.gschema.xml"
  "README.md"
  "LICENSE"
  "CHANGELOG.md"
)
for file in "${required_files[@]}"; do
  [[ -f "$file" ]] && echo "  ✓ $file" || { echo "  ✗ MISSING: $file"; exit 1; }
done

# 3. Check for prohibited patterns (GNOME Extension Review Guidelines)
echo ""
echo "[3/7] Checking for prohibited patterns (security)..."
if grep -rn "eval(" extension/ && echo "  ✗ Found eval() - NOT ALLOWED"; then
  exit 1
fi
if grep -rn "XMLHttpRequest\|fetch(" extension/ && echo "  ✗ Found web network calls - use GLib async"; then
  exit 1
fi
echo "  ✓ No eval() or disallowed web APIs found"

# 4. Verify schema is compilable
echo ""
echo "[4/7] Checking GSettings schema compilation..."
glib-compile-schemas extension/schemas/ || { echo "  ✗ Schema compilation failed"; exit 1; }
echo "  ✓ GSettings schema compiles successfully"

# 5. Run full automated unit test suite
echo ""
echo "[5/7] Running unit tests..."
gjs -m tests/unit/run_all.js || { echo "  ✗ Unit tests failed"; exit 1; }

# 6. Check / Rebuild ZIP package
echo ""
echo "[6/7] Building & inspecting release ZIP package..."
bash packaging/make_zip.sh
ZIP_FILE="packaging/${UUID}_v${VERSION}.zip"
if [[ ! -f "$ZIP_FILE" ]]; then
  echo "  ✗ Target ZIP file was not created: $ZIP_FILE"
  exit 1
fi
echo "  ✓ Target ZIP: $ZIP_FILE ($(du -h "$ZIP_FILE" | cut -f1))"
echo "  ✓ SHA-256: $(sha256sum "$ZIP_FILE" | awk '{print $1}')"

# 7. Verify ZIP integrity & clean archive contents
echo ""
echo "[7/7] Verifying ZIP archive integrity and structure..."
unzip -t "$ZIP_FILE" > /dev/null || { echo "  ✗ ZIP file is corrupted"; exit 1; }

# Check that prohibited files are NOT in the zip
prohibited_zip_patterns=("*.bak" "*.swp" "*meson.build" "*gschemas.compiled")
for pat in "${prohibited_zip_patterns[@]}"; do
  if unzip -l "$ZIP_FILE" | grep -q "$pat"; then
    echo "  ✗ Found disallowed file matching $pat in ZIP!"
    exit 1
  fi
done
echo "  ✓ Clean archive (no backup, build, or compiled schema files bundled)"
echo "  ✓ Files included in release ZIP:"
unzip -l "$ZIP_FILE" | grep -v "^Archive\|^  Length\|^---------" | awk '{print "    " $4}' | grep -v "^$"

echo ""
echo "✅ All pre-submission checks passed! Ready for extensions.gnome.org upload."
