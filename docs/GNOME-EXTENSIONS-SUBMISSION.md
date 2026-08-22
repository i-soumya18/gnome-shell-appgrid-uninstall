# GNOME Extensions Website Submission Guide

## Overview

The GNOME Extensions website (extensions.gnome.org) is the official distribution platform for GNOME Shell extensions. This guide walks you through uploading your extension.

## Prerequisites

### Before You Start

- ✅ Extension code is complete and tested
- ✅ README.md is comprehensive
- ✅ CHANGELOG.md is up-to-date
- ✅ License is clearly specified (GPL-2.0-or-later recommended)
- ✅ Screenshots prepared (PNG, 1200x675px recommended)

### Account Setup (One-time)

1. Log in or create an account at https://extensions.gnome.org
2. Verify your email address
3. You're ready to upload!

## Pre-Submission Checklist

Run this verification before uploading:

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "=== GNOME Extension Pre-Submission Checklist ==="
echo ""

# 1. Check metadata.json
echo "[1/6] Checking metadata.json..."
jq . extension/metadata.json > /dev/null || { echo "ERROR: Invalid JSON"; exit 1; }

UUID=$(jq -r '.uuid' extension/metadata.json)
echo "  ✓ UUID: $UUID"
echo "  ✓ Name: $(jq -r '.name' extension/metadata.json)"
echo "  ✓ GNOME versions: $(jq -r '.shell-version[]' extension/metadata.json)"

# 2. Check required files
echo ""
echo "[2/6] Checking required files..."
required_files=(
  "extension/metadata.json"
  "extension/extension.js"
  "README.md"
  "LICENSE"
  "CHANGELOG.md"
)
for file in "${required_files[@]}"; do
  [[ -f "$file" ]] && echo "  ✓ $file" || { echo "  ✗ MISSING: $file"; exit 1; }
done

# 3. Check for prohibited patterns (security)
echo ""
echo "[3/6] Checking for security issues..."
if grep -r "eval(" extension/ && echo "  ✗ Found eval() - NOT ALLOWED"; then
  exit 1
fi
if grep -r "XMLHttpRequest\|fetch(" extension/ && echo "  ✗ Found network calls - use GLib async"; then
  exit 1
fi
echo "  ✓ No eval() or network calls found"

# 4. Verify schema is compilable
echo ""
echo "[4/6] Checking GSettings schema..."
glib-compile-schemas extension/schemas/ 2>/dev/null || { echo "  ✗ Schema compilation failed"; exit 1; }
echo "  ✓ GSettings schema compiles successfully"

# 5. Check ZIP package
echo ""
echo "[5/6] Checking ZIP package..."
ZIP_FILE=$(ls packaging/*.zip 2>/dev/null | head -1)
if [[ -z "$ZIP_FILE" ]]; then
  echo "  ! No ZIP found, building..."
  bash packaging/make_zip.sh
  ZIP_FILE=$(ls packaging/*.zip | tail -1)
fi
echo "  ✓ ZIP: $ZIP_FILE ($(du -h "$ZIP_FILE" | cut -f1))"

# 6. Verify ZIP contents
echo ""
echo "[6/6] Verifying ZIP contents..."
if ! unzip -t "$ZIP_FILE" > /dev/null 2>&1; then
  echo "  ✗ ZIP is corrupted"
  exit 1
fi
echo "  ✓ ZIP is valid and contains:"
unzip -l "$ZIP_FILE" | grep -v "^Archive\|^  Length\|^---------" | awk '{print "    " $4}' | head -15

echo ""
echo "✅ All checks passed! Ready for submission."
```

Save as `packaging/pre_submit_check.sh` and run:
```bash
bash packaging/pre_submit_check.sh
```

## Uploading to extensions.gnome.org

### Step 1: Create a New Version Entry

1. Go to https://extensions.gnome.org/upload/
2. If this is your **first time uploading this extension**: Upload the ZIP file
3. If this is an **update**: You'll be able to add new versions to existing extensions

### Step 2: Provide Extension Details

**Basic Info:**
- **UUID**: must match `metadata.json` → `appgrid-uninstall@i-soumya18.github.io`
- **Name**: App Grid Uninstall (must match `metadata.json`)
- **Summary**: ~1 line → "Right-click any app in GNOME App Grid to uninstall it"

**Description:**
Provide a detailed description (appears on extension page):
```
Adds a native "Uninstall" option to the right-click context menu 
of every app in the GNOME Shell App Grid.

Features:
• Uninstall Flatpak, Snap, APT, RPM, and DNF packages
• Native GTK confirmation dialog
• System app protection (cannot uninstall critical GNOME apps)
• Progress notifications
• Automatic package type detection
• Preferences panel for customization

Supported GNOME versions: 42, 44, 45, 46

Repository: https://github.com/i-soumya18/gnome-shell-appgrid-uninstall
Report issues: https://github.com/i-soumya18/gnome-shell-appgrid-uninstall/issues
```

**License**: GPL-2.0-or-later (or your choice)

### Step 3: Add Screenshots

Upload 2-3 screenshots showing:
1. App Grid with right-click menu visible
2. Uninstall confirmation dialog
3. (Optional) Settings panel

**Screenshot Requirements:**
- PNG format
- Recommended: 1200x675px (16:9 aspect ratio)
- Show realistic GNOME desktop environment
- Annotate if needed (circle the feature)

### Step 4: Set Supported GNOME Versions

Check all versions you support (must match `metadata.json` shell-version array):
- ✓ GNOME 42
- ✓ GNOME 44
- ✓ GNOME 45
- ✓ GNOME 46

### Step 5: Review & Submit

1. **Review the ZIP contents** — site will show file list
2. **Verify metadata** — check all fields are correct
3. **Accept terms** — agree to GNOME Extensions guidelines
4. **Submit** — click "Publish"

## After Submission

### Automated Review (1-2 hours)

The GNOME team runs automated checks:
- ✅ No `eval()` calls
- ✅ No fetch/XMLHttpRequest outside D-Bus
- ✅ Valid JSON in metadata.json
- ✅ No bundled libraries
- ✅ Proper GSettings schema

### Manual Review (1-3 days)

A human reviewer checks:
- ✅ Functionality works as advertised
- ✅ Code quality and patterns
- ✅ Security (privilege escalation, access to user files)
- ✅ Performance (no noticeable lag)
- ✅ UI/UX follows GNOME Human Interface Guidelines

### If Issues Found

You'll receive an email with specific feedback. Common issues:
- **"Extension doesn't load"** → Check extension.js enable/disable methods
- **"No effect visible"** → Verify API calls are correct for target GNOME version
- **"Code review comments"** → Address them and resubmit

## Publishing Your Extension

Once approved, your extension appears at:
```
https://extensions.gnome.org/extension/EXTENSION_ID/
```

Where EXTENSION_ID is numeric (assigned automatically).

Your extension will also be searchable and installable via:
```bash
# Users can install directly via:
gnome-extensions install <your-extension-uuid>

# Or search on https://extensions.gnome.org and click "Install"
```

## Version Updates

To publish a new version (e.g., 1.1.0):

1. **Update extension/metadata.json**:
   ```json
   "version": 2  // Integer increment
   ```

2. **Rebuild ZIP**:
   ```bash
   bash packaging/make_zip.sh
   ```

3. **On extensions.gnome.org**:
   - Go to your extension page → "Upload new version"
   - Upload the new ZIP
   - Provide changelog notes
   - Submit

The review process repeats with the same timeline.

## Handling Rejections

### Common Rejection Reasons

| Issue | Fix |
|-------|-----|
| Extension doesn't enable | Test in clean GNOME Shell environment; check all imports |
| No visible UI changes | Verify your monkey-patch is applied correctly |
| Code uses eval() | Replace with proper GLib/Gio APIs |
| Security: executes arbitrary commands | Ensure all subprocess calls use argv arrays, never shell strings |
| Performance: shell freezes | Move heavy operations to Gio async callbacks |
| Metadata doesn't match ZIP | Rebuild ZIP after changing metadata.json |

### Resubmission

After fixing issues:
1. Update code locally
2. Rebuild ZIP: `bash packaging/make_zip.sh`
3. On extensions.gnome.org → "Upload new version"
4. Add note: "Fixed [issue name] per review feedback"
5. Resubmit

## Long-term Maintenance

### Keep Your Extension Updated

- **Monitor GNOME releases** → Add new versions to shell-version array
- **Respond to user issues** → Update extension based on feedback
- **Security patches** → Review and fix any reported vulnerabilities quickly
- **Test on multiple GNOME versions** → Use virtual machines or CI

### Deprecation

If you stop maintaining the extension, mark it as such on the website:
- Go to extension page → Edit → "This extension is no longer actively maintained"
- Users will see a warning, but extension remains downloadable

## Resources & Links

- **GNOME Extensions Website**: https://extensions.gnome.org
- **Upload Page**: https://extensions.gnome.org/upload/
- **Extension Development Guide**: https://wiki.gnome.org/Projects/GnomeShell/Extensions
- **Review Guidelines**: https://wiki.gnome.org/Projects/GnomeShell/Extensions/ReviewGuidelines
- **Bug Reports**: https://gitlab.gnome.org/GNOME/extensions-web/issues

## Support & Communication

- **Questions about submission?** Email: extensions-abuse@gnome.org
- **Report issues in your extension?** Post on your GitHub repository
- **General GNOME Shell dev help?** #gnome-shell on IRC/Matrix
