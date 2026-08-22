# PPA Distribution Guide

## Overview

This guide explains how to build and distribute the GNOME Shell App Grid Uninstall extension via Ubuntu PPA (Personal Package Archive).

## Prerequisites

### System Setup (One-time)

```bash
# Install required tools
sudo apt-get install -y \
  dh-make \
  debhelper \
  devscripts \
  gnupg \
  ubuntu-dev-tools \
  git-buildpackage \
  meson \
  ninja-build
```

### GPG Key Setup (One-time)

```bash
# Generate GPG key if you don't have one
gpg --gen-key
# Select: RSA, 4096 bits, no expiration, your email

# Export key ID (look for lines with "pub rsa4096")
gpg --list-keys
# Example ID: i.soumya18@example.com
```

### Launchpad Account

1. Create account at https://launchpad.net/
2. Import your GPG key on Launchpad
3. Create a PPA at: https://launchpad.net/~YOUR_USERNAME/+create-new-ppa

## Building the Package

### Step 1: Prepare the Source

```bash
# Clone the repository
git clone https://github.com/i-soumya18/gnome-shell-appgrid-uninstall.git
cd gnome-shell-appgrid-uninstall

# Create a source tarball
git archive --format tar.gz --prefix=gnome-shell-extension-appgrid-uninstall-1.0.0/ HEAD \
  -o ../gnome-shell-extension-appgrid-uninstall_1.0.0.orig.tar.gz
```

### Step 2: Build Debian Source Package

```bash
# Export GPG key email for debuild
export DEBSIGN_KEYID="i.soumya18@example.com"

# Build source package (creates .dsc, .changes, .tar.gz files)
cd ..
debuild -S -sa -k'i.soumya18@example.com'

# You should now have:
# - gnome-shell-extension-appgrid-uninstall_1.0.0-1_source.changes
# - gnome-shell-extension-appgrid-uninstall_1.0.0-1.dsc
# - gnome-shell-extension-appgrid-uninstall_1.0.0.orig.tar.gz
```

### Step 3: Test Build Locally (Optional but Recommended)

```bash
# Build the binary package locally to verify it works
debuild -b
# Creates .deb file you can install with: sudo dpkg -i ...
```

## Uploading to PPA

### Option A: Using dput (Automated)

1. **Create `.dput.cf` configuration** (if needed):
   ```bash
   cat >> ~/.dput.cf << 'EOF'
   [ppa]
   fqdn = ppa.launchpad.net
   method = sftp
   incoming = ~%(ppa)s/ubuntu
   login = %(user)s
   allow_unsigned_uploads = 0
   EOF
   ```

2. **Upload the source package**:
   ```bash
   dput ppa:YOUR_USERNAME/gnome-appgrid-uninstall \
     ../gnome-shell-extension-appgrid-uninstall_1.0.0-1_source.changes
   ```

### Option B: Manual Upload via Web

1. Go to https://launchpad.net/~YOUR_USERNAME/+archive/ubuntu/gnome-appgrid-uninstall
2. Click "Upload a file"
3. Upload the `.changes` file
4. Launchpad will automatically build for multiple Ubuntu versions

## Release to Different Ubuntu Versions

To release to multiple Ubuntu LTS versions (22.04, 24.04), update the `debian/changelog`:

```bash
dch -i  # Interactively add changelog entries

# Or manually edit debian/changelog for each version:
# gnome-shell-extension-appgrid-uninstall (1.0.0-1ubuntu1~ppa1~jammy) jammy; urgency=medium
# gnome-shell-extension-appgrid-uninstall (1.0.0-1ubuntu1~ppa1~noble) noble; urgency=medium
```

## Verification

After upload, Launchpad will:
1. **Accept the upload** (usually within minutes)
2. **Build packages** for each supported Ubuntu version (5-30 minutes per version)
3. **Host on PPA** at: `https://launchpad.net/~YOUR_USERNAME/+archive/ubuntu/gnome-appgrid-uninstall`

### Users can then install with:

```bash
# Add your PPA
sudo add-apt-repository ppa:YOUR_USERNAME/gnome-appgrid-uninstall
sudo apt update

# Install the extension
sudo apt install gnome-shell-extension-appgrid-uninstall
```

## Troubleshooting

### Error: "lintian errors"

If debuild shows lintian warnings:
- Ignore info-level warnings (they're not critical)
- Fix warnings (W:)
- Fix errors (E:) — these block upload

Common fixable issues:
- Missing changelog entry → use `dch -i`
- Wrong Maintainer format → fix in debian/control

### Error: "Upload rejected by PPA"

Check the rejection mail from Launchpad:
- GPG signature invalid → re-create GPG key
- Duplicate version → increment version number in changelog
- File already exists → different version needed

### Error: "Build failed in Launchpad"

Check the build log on Launchpad:
1. Go to your PPA page
2. Click the build that failed
3. Click "View log"
4. Check at the end for error messages

Common issues:
- Missing dependencies in Build-Depends
- Meson/Ninja misconfiguration
- Paths incorrect for architecture-independent install

## File Cleanup

After successful upload, you can remove the build artifacts:

```bash
cd gnome-shell-appgrid-uninstall
debclean  # Removes all build artifacts
```

## Future Releases

For version 1.1.0:

```bash
# 1. Update version in extension/metadata.json
# 2. Update debian/changelog
dch -i  # Add new entry

# 3. Create new tag
git tag -a v1.1.0 -m "Release 1.1.0"
git push origin v1.1.0

# 4. Rebuild and reupload steps above
```

## Resources

- [Launchpad PPA Guide](https://help.launchpad.net/Packaging/PPA)
- [Debian New Maintainers Guide](https://www.debian.org/doc/manuals/maint-guide/)
- [Ubuntu Packaging Guide](https://wiki.ubuntu.com/PackagingGuide)
