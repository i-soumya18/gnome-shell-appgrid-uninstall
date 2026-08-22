# Distribution Guide — GNOME Shell App Grid Uninstall Extension

Complete step-by-step guide for packaging and distributing the extension across all major channels.

## Quick Summary

| Channel | Audience | Effort | Timeline | Status |
|---------|----------|--------|----------|--------|
| **GitHub Releases** | Developers | 5 min | Immediate (automated) | ✅ Ready |
| **GNOME Extensions** | End users | 15 min | 1-3 days (review) | ✅ Ready |
| **Ubuntu PPA** | Ubuntu users | 20 min | 5-30 min per version | ✅ Ready |

## Distribution Channels

### 1. GitHub Releases (Quickest — Automated)

**Perfect for**: Early adopters, testers, developers

✅ **Status**: Already set up and working!

**How it works**:
- Push a version tag: `git tag -a v1.0.0 -m "..."`
- GitHub Actions automatically builds ZIP and creates release
- Users get download at: https://github.com/i-soumya18/gnome-shell-appgrid-uninstall/releases

**Next release**:
```bash
# Update version in extension/metadata.json
vi extension/metadata.json  # version: 2

# Commit
git add extension/metadata.json
git commit -m "Bump to v1.1.0"

# Tag and push (triggers CI)
git tag -a v1.1.0 -m "Release 1.1.0"
git push origin main v1.1.0

# Check: https://github.com/i-soumya18/gnome-shell-appgrid-uninstall/actions
```

---

### 2. GNOME Extensions Website (Most Visibility)

**Perfect for**: General GNOME users, maximum discoverability

✅ **Status**: ZIP ready, instructions complete

**What you need**:
- ✅ ZIP file: `packaging/appgrid-uninstall@i-soumya18.github.io_v1.zip`
- ✅ Screenshots (2-3 PNG files, 1200x675px)
- ✅ Clear description and changelog

**Steps**:

**A. Prepare screenshots** (2-3 images):
1. Screenshot of GNOME App Grid with right-click menu open → Save as `screenshot-1.png`
2. Screenshot of confirmation dialog → Save as `screenshot-2.png`
3. (Optional) Settings panel → Save as `screenshot-3.png`

Resize all to 1200x675px:
```bash
convert screenshot-1.png -resize 1200x675 screenshot-menu.png
convert screenshot-2.png -resize 1200x675 screenshot-dialog.png
```

**B. Verify pre-submission checks**:
```bash
# Create and run the pre-submit script
# (See docs/GNOME-EXTENSIONS-SUBMISSION.md for full script)
bash packaging/pre_submit_check.sh
```

**C. Upload to extensions.gnome.org**:
1. Go to https://extensions.gnome.org/upload/
2. Login with GNOME account (create if needed)
3. Upload ZIP file
4. Fill in form:
   - UUID: `appgrid-uninstall@i-soumya18.github.io`
   - Description: (see docs/GNOME-EXTENSIONS-SUBMISSION.md)
   - GNOME versions: 42, 44, 45, 46
   - Screenshots: upload your PNGs
   - License: GPL-2.0-or-later
5. Click "Publish"

**Timeline**:
- ⏱️ Automated review: 1-2 hours
- ⏱️ Manual review: 1-3 days
- ✅ Published: appears on https://extensions.gnome.org at that URL

**Full details**: See `docs/GNOME-EXTENSIONS-SUBMISSION.md`

---

### 3. Ubuntu PPA (For Ubuntu Users)

**Perfect for**: Ubuntu users comfortable with `apt install`

✅ **Status**: Debian packaging ready, guide complete

**Prerequisites** (one-time setup):
```bash
# Install tools
sudo apt-get install -y dh-make debhelper devscripts gnupg ubuntu-dev-tools

# Generate GPG key (if needed)
gpg --gen-key
# Choose RSA, 4096 bits, your email

# Create Launchpad PPA at: https://launchpad.net/~YOUR_USERNAME/+create-new-ppa
```

**Build & Upload** (for each release):

```bash
# 1. Create source tarball
git archive --format tar.gz \
  --prefix=gnome-shell-extension-appgrid-uninstall-1.0.0/ \
  HEAD -o ../gnome-shell-extension-appgrid-uninstall_1.0.0.orig.tar.gz

# 2. Build source package
cd ..
export DEBSIGN_KEYID="your.email@example.com"
debuild -S -sa -k'your.email@example.com'

# 3. Upload to PPA (automated)
dput ppa:YOUR_USERNAME/gnome-appgrid-uninstall \
  gnome-shell-extension-appgrid-uninstall_1.0.0-1_source.changes

# 4. Wait for build (5-30 minutes per Ubuntu version)
# Check at: https://launchpad.net/~YOUR_USERNAME/+archive/ubuntu/gnome-appgrid-uninstall
```

**Users can then install**:
```bash
sudo add-apt-repository ppa:YOUR_USERNAME/gnome-appgrid-uninstall
sudo apt update
sudo apt install gnome-shell-extension-appgrid-uninstall
```

**Full guide**: See `docs/PPA-GUIDE.md`

---

## Complete Release Workflow (All Channels)

Use this checklist for each release:

```bash
#!/usr/bin/env bash
set -euo pipefail

VERSION="1.1.0"
echo "🚀 Releasing version $VERSION"

# 1. Update metadata
echo "1️⃣  Updating metadata..."
jq '.version |= 2' extension/metadata.json > metadata.tmp && mv metadata.tmp extension/metadata.json

# 2. Update CHANGELOG
echo "2️⃣  Updating CHANGELOG..."
# Manually edit CHANGELOG.md with your release notes

# 3. Commit version bump
echo "3️⃣  Committing..."
git add extension/metadata.json CHANGELOG.md
git commit -m "Release v$VERSION"

# 4. Build ZIP (GitHub will too, but good to verify locally)
echo "4️⃣  Building ZIP..."
bash packaging/make_zip.sh

# 5. Create git tag (triggers GitHub Actions)
echo "5️⃣  Creating release tag..."
git tag -a "v$VERSION" -m "Release $VERSION - $(date)"

# 6. Push (triggers GitHub Actions release workflow)
echo "6️⃣  Pushing to GitHub..."
git push origin main "v$VERSION"

# 7. Monitor GitHub Actions
echo "7️⃣  Waiting for GitHub Actions (watch the Actions tab)..."
echo "   https://github.com/i-soumya18/gnome-shell-appgrid-uninstall/actions"

# 8. Wait for release to show up
sleep 10
echo ""
echo "✅ GitHub Release automation triggered!"
echo "   Check: https://github.com/i-soumya18/gnome-shell-appgrid-uninstall/releases"
echo ""

echo "📋 Manual steps:"
echo "   1. Upload to GNOME Extensions: https://extensions.gnome.org/upload/"
echo "   2. Upload to Ubuntu PPA (if maintaining it)"
echo "   3. Announce on social media / GNOME forums"
```

Save as `packaging/release.sh`:
```bash
chmod +x packaging/release.sh
./packaging/release.sh
```

---

## File Structure for Distribution

```
gnome-shell-appgrid-uninstall/
│
├── 📦 Extension (for all channels)
│   ├── extension/
│   │   ├── metadata.json      ← Version must be integer
│   │   ├── extension.js
│   │   ├── prefs.js
│   │   └── schemas/
│   ├── README.md              ← Clear user documentation
│   ├── CHANGELOG.md           ← Version history
│   └── LICENSE                ← GPL-2.0-or-later
│
├── 📊 GitHub Releases
│   ├── .github/workflows/release.yml  ← Auto-triggers on push tag
│   └── packaging/make_zip.sh          ← Builds the ZIP
│
├── 🖥️  GNOME Extensions
│   ├── packaging/appgrid-uninstall@i-soumya18.github.io_v1.zip
│   ├── docs/GNOME-EXTENSIONS-SUBMISSION.md
│   └── screenshots/            ← Your PNG screenshots
│
└── 📦 Ubuntu PPA
    ├── packaging/debian/
    │   ├── control             ← Package metadata
    │   ├── changelog           ← Version history
    │   ├── rules               ← Build script
    │   ├── install             ← File destinations
    │   ├── compat              ← Debhelper version
    │   └── source/format       ← Package format
    └── docs/PPA-GUIDE.md
```

---

## Checklist Before Every Release

### Code Quality
- [ ] ESLint passes: `eslint extension/`
- [ ] Unit tests pass: `gjs tests/unit/run_all.js`
- [ ] Manual testing on GNOME 42+ (or VM)
- [ ] No console errors in journalctl
- [ ] `disable()` fully cleans up all signals

### Documentation
- [ ] README.md updated with new features
- [ ] CHANGELOG.md has entry for this version
- [ ] Commit messages are clear
- [ ] GitHub PR merged and closed

### Version Management
- [ ] extension/metadata.json version incremented
- [ ] debian/changelog has new entry
- [ ] Git tag format: `v1.0.0` (semver style)
- [ ] ZIP built successfully

### Testing
- [ ] Test on Ubuntu 22.04 LTS (GNOME 42+)
- [ ] Test on Ubuntu 24.04 LTS (GNOME 46)
- [ ] Drag-to-trash uninstall still disabled? (Phase 10 feature)
- [ ] System app protection working?
- [ ] All package types tested (Flatpak, Snap, APT)?

---

## Troubleshooting

### GitHub Release Failed
```bash
# Check logs
gh run list --limit 1
gh run view <RUN_ID>  # See error

# Fix and retry
git push origin main v1.1.0 --force
```

### GNOME Extensions Upload Rejected
- See `docs/GNOME-EXTENSIONS-SUBMISSION.md` → "Handling Rejections"
- Common issue: metadata.json UUID doesn't match ZIP content
- Fix: Rebuild ZIP: `bash packaging/make_zip.sh`

### PPA Build Failed
- Check Launchpad build log
- Usually: missing Build-Depends or Meson misconfiguration
- Fix debian/control, then re-upload

---

## Metrics & Tracking

After release, track:

| Metric | Where | How Often |
|--------|-------|-----------|
| GitHub releases | https://github.com/.../releases | Each tag |
| Extension page views | https://extensions.gnome.org | Weekly |
| Extension installs | GNOME Extensions stats | Weekly |
| Issues reported | GitHub Issues tab | Ongoing |
| PPA downloads | Launchpad statistics | Monthly |

---

## Maintenance Lifecycle

```
Week 1-2: Release (all channels)
    ↓
Week 2-4: User feedback & bug reports
    ↓
Week 4+: Plan next version
    ↓
Increment version → Repeat
```

**GNOME version support**:
- Always support the latest **two major GNOME versions**
- Example: When GNOME 48 is released, keep 47+48, drop older
- Users on GNOME 42 won't auto-update if you require 46+

---

## Next Steps

**Right now**:
- [ ] Choose a GNOME Extensions account username
- [ ] Prepare 2-3 screenshots (PNG, 1200x675px)
- [ ] Write final README.md and CHANGELOG.md

**Soon (v1.0 release)**:
- [ ] Upload to GNOME Extensions (see docs/GNOME-EXTENSIONS-SUBMISSION.md)
- [ ] Set up Launchpad PPA (see docs/PPA-GUIDE.md)
- [ ] Create first GitHub release (already automated!)

**Ongoing**:
- [ ] Monitor GitHub Issues for bugs
- [ ] Respond to user feedback
- [ ] Plan Phase 10 features (drag-to-trash, multi-select)
- [ ] Release minor versions (1.1, 1.2, etc.)
- [ ] Major version when GNOME 48+ support added

---

**Questions?** See the detailed guides in `docs/`:
- `docs/GNOME-EXTENSIONS-SUBMISSION.md` — GNOME Extensions website
- `docs/PPA-GUIDE.md` — Ubuntu PPA distribution
- `.github/workflows/release.yml` — GitHub Actions automation
