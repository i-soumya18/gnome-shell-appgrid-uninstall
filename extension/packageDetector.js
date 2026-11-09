import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {SystemAppGuard} from './systemAppGuard.js';

export const PackageType = Object.freeze({
  FLATPAK: 'flatpak',
  SNAP: 'snap',
  APT: 'apt',
  DNF: 'dnf',
  RPM: 'rpm',
  ZYPPER: 'zypper',
  PACMAN: 'pacman',
  APK: 'apk',
  XBPS: 'xbps',
  EOPKG: 'eopkg',
  APPIMAGE: 'appimage',
  WEBAPP: 'webapp',
  HOMEBREW: 'brew',
  PIPX: 'pipx',
  NIX: 'nix',
  STEAM: 'steam',
  CUSTOM: 'custom',
  UNKNOWN: 'unknown',
});

export class PackageDetector {
  async detect(app) {
    const appInfo = app?.get_app_info?.();
    if (!appInfo)
      return {type: PackageType.UNKNOWN, identifier: null};

    const desktopFilePath = appInfo.get_filename?.();
    if (!desktopFilePath)
      return {type: PackageType.UNKNOWN, identifier: null};

    const appId = app?.get_id?.() ?? '';
    const keyFileData = this._parseDesktopKeyFile(desktopFilePath, appInfo);

    // 1. Check Snap
    const snapResult = await this._detectSnap(appId, desktopFilePath, keyFileData);
    if (snapResult)
      return snapResult;

    // 2. Check Flatpak
    const flatpakResult = await this._detectFlatpak(appId, desktopFilePath, keyFileData);
    if (flatpakResult)
      return flatpakResult;

    // 3. Check AppImage
    const appImageResult = this._detectAppImage(desktopFilePath, keyFileData);
    if (appImageResult)
      return appImageResult;

    // 4. Check Web App / PWA (Chrome, Brave, Edge, Chromium, Firefox PWA)
    const webAppResult = this._detectWebApp(appId, desktopFilePath, keyFileData);
    if (webAppResult)
      return webAppResult;

    // 5. Check Steam Games
    const steamResult = this._detectSteam(appId, desktopFilePath, keyFileData);
    if (steamResult)
      return steamResult;

    // 6. Check Pipx Python packages
    const pipxResult = this._detectPipx(desktopFilePath, keyFileData);
    if (pipxResult)
      return pipxResult;

    // 7. Check Homebrew / Linuxbrew
    const brewResult = this._detectHomebrew(desktopFilePath, keyFileData);
    if (brewResult)
      return brewResult;

    // 8. Check Nix / GNU Guix
    const nixResult = this._detectNix(desktopFilePath, keyFileData);
    if (nixResult)
      return nixResult;

    // 9. Check Native Linux Distribution Package Managers (dpkg, rpm, pacman, apk, xbps, eopkg)
    const canonicalPath = this._getCanonicalPath(desktopFilePath);
    const execBinary = this._extractExecBinary(keyFileData.exec);

    const aptPkg = await this._detectApt(canonicalPath, execBinary);
    if (aptPkg)
      return {type: PackageType.APT, identifier: aptPkg, details: {desktopPath: desktopFilePath}};

    const rpmPkg = await this._detectRpm(canonicalPath, execBinary);
    if (rpmPkg) {
      if (GLib.find_program_in_path('zypper') !== null) {
        return {type: PackageType.ZYPPER, identifier: rpmPkg, details: {desktopPath: desktopFilePath}};
      }
      const hasDnf = GLib.find_program_in_path('dnf5') !== null || GLib.find_program_in_path('dnf') !== null;
      return {
        type: hasDnf ? PackageType.DNF : PackageType.RPM,
        identifier: rpmPkg,
        details: {desktopPath: desktopFilePath},
      };
    }

    const pacmanPkg = await this._detectPacman(canonicalPath, execBinary);
    if (pacmanPkg)
      return {type: PackageType.PACMAN, identifier: pacmanPkg, details: {desktopPath: desktopFilePath}};

    const apkPkg = await this._detectApk(canonicalPath);
    if (apkPkg)
      return {type: PackageType.APK, identifier: apkPkg, details: {desktopPath: desktopFilePath}};

    const xbpsPkg = await this._detectXbps(canonicalPath);
    if (xbpsPkg)
      return {type: PackageType.XBPS, identifier: xbpsPkg, details: {desktopPath: desktopFilePath}};

    const eopkgPkg = await this._detectEopkg(canonicalPath);
    if (eopkgPkg)
      return {type: PackageType.EOPKG, identifier: eopkgPkg, details: {desktopPath: desktopFilePath}};

    // 10. Check Custom / Standalone desktop entries (e.g. /opt/..., ~/Applications/..., ~/.local/share/applications/...)
    const customResult = this._detectCustom(appId, desktopFilePath, keyFileData);
    if (customResult)
      return customResult;

    return {type: PackageType.UNKNOWN, identifier: null};
  }

  _parseDesktopKeyFile(filePath, appInfo) {
    const data = {
      exec: appInfo?.get_commandline?.() ?? '',
      icon: '',
      path: '',
      xSnapInstanceName: '',
      xSnapAppName: '',
      xFlatpak: '',
      xAppImageVersion: '',
      xAppImageType: '',
      xWebAppId: '',
      startupWMClass: '',
    };

    try {
      const keyFile = new GLib.KeyFile();
      if (keyFile.load_from_file(filePath, GLib.KeyFileFlags.NONE)) {
        if (keyFile.has_group('Desktop Entry')) {
          const getVal = key => {
            try {
              return keyFile.get_string('Desktop Entry', key);
            } catch (_) {
              return '';
            }
          };

          data.exec = getVal('Exec') || data.exec;
          data.icon = getVal('Icon');
          data.path = getVal('Path');
          data.xSnapInstanceName = getVal('X-SnapInstanceName');
          data.xSnapAppName = getVal('X-SnapAppName');
          data.xFlatpak = getVal('X-Flatpak');
          data.xAppImageVersion = getVal('X-AppImage-Version');
          data.xAppImageType = getVal('X-AppImage-Type');
          data.xWebAppId = getVal('X-WebApp-ID');
          data.startupWMClass = getVal('StartupWMClass');
        }
      }
    } catch (_) {
      // Fallback on appInfo if keyfile parsing fails
    }

    return data;
  }

  _getCanonicalPath(filePath) {
    try {
      const file = Gio.File.new_for_path(filePath);
      const info = file.query_info('standard::is-symlink,standard::symlink-target', Gio.FileQueryInfoFlags.NONE, null);
      if (info && info.get_is_symlink()) {
        const target = info.get_symlink_target();
        if (target) {
          return target.startsWith('/')
            ? target
            : file.get_parent()?.get_child(target)?.get_path() ?? filePath;
        }
      }
    } catch (_) {}
    return filePath;
  }

  async _detectSnap(appId, desktopPath, keyFileData) {
    if (keyFileData.xSnapInstanceName) {
      return {
        type: PackageType.SNAP,
        identifier: keyFileData.xSnapInstanceName,
        details: {snapName: keyFileData.xSnapInstanceName, desktopPath},
      };
    }

    const snapName = this._extractSnapName(desktopPath, keyFileData);
    if (snapName) {
      return {
        type: PackageType.SNAP,
        identifier: snapName,
        details: {snapName, desktopPath},
      };
    }

    return null;
  }

  _extractSnapName(desktopPath, keyFileData = {}) {
    // 1. Check path like /var/lib/snapd/desktop/applications/<snapName>_<appName>.desktop or <snapName>.desktop
    if (desktopPath.startsWith('/var/lib/snapd/desktop/applications/') ||
        desktopPath.startsWith('/var/lib/snapd/')) {
      const filename = desktopPath.split('/').pop() || '';
      const base = filename.replace(/\.desktop$/, '');
      const match = base.match(/^([^_]+)(?:_.+)?$/);
      if (match && match[1])
        return match[1];
    }

    // 2. Check path like /snap/<snapName>/...
    const snapDirMatch = desktopPath.match(/\/snap\/([^/]+)\//);
    if (snapDirMatch && snapDirMatch[1] && snapDirMatch[1] !== 'bin')
      return snapDirMatch[1];

    // 3. Check Exec line
    const exec = keyFileData.exec || '';
    const execMatch = exec.match(/(?:\/snap\/bin\/|snap\s+run\s+)([a-zA-Z0-9_-]+)/);
    if (execMatch && execMatch[1]) {
      const snapPart = execMatch[1].split('.')[0];
      return snapPart;
    }

    // 4. Check Icon path
    const icon = keyFileData.icon || '';
    const iconMatch = icon.match(/\/snap\/([^/]+)\//);
    if (iconMatch && iconMatch[1])
      return iconMatch[1];

    return null;
  }

  async _detectFlatpak(appId, desktopPath, keyFileData) {
    const isFlatpakPath = desktopPath.includes('/flatpak/') ||
                          desktopPath.includes('/.local/share/flatpak/');

    let ref = keyFileData.xFlatpak || null;

    if (!ref && isFlatpakPath) {
      if (appId) {
        ref = appId.replace(/\.desktop$/, '');
      } else {
        const filename = desktopPath.split('/').pop() || '';
        ref = filename.replace(/\.desktop$/, '');
      }
    }

    const exec = keyFileData.exec || '';
    if (!ref && (exec.includes('flatpak run') || exec.startsWith('flatpak '))) {
      const match = exec.match(/flatpak\s+run\s+(?:--?[a-zA-Z0-9_.-]+(?:=[^\s]+)?\s+)*([a-zA-Z0-9_.-]+)/);
      if (match && !match[1].startsWith('-'))
        ref = match[1];
    }

    if (ref) {
      const isSystem = desktopPath.startsWith('/var/lib/flatpak/') ||
                       desktopPath.startsWith('/etc/flatpak/') ||
                       !desktopPath.includes('/.local/share/flatpak/');
      return {
        type: PackageType.FLATPAK,
        identifier: ref,
        scope: isSystem ? 'system' : 'user',
        details: {flatpakId: ref, desktopPath, scope: isSystem ? 'system' : 'user'},
      };
    }

    if (appId && GLib.find_program_in_path('flatpak') !== null) {
      const cleaned = appId.replace(/\.desktop$/, '');
      const result = await this._runAsync(['flatpak', 'info', '--show-ref', cleaned]);
      if (result.ok && result.status === 0) {
        return {
          type: PackageType.FLATPAK,
          identifier: cleaned,
          scope: 'auto',
          details: {flatpakId: cleaned, desktopPath},
        };
      }
    }

    return null;
  }

  _detectAppImage(desktopPath, keyFileData) {
    const isAppImageKey = Boolean(
      keyFileData.xAppImageVersion ||
      keyFileData.xAppImageType ||
      desktopPath.includes('appimagekit_') ||
      desktopPath.includes('appimagekit-')
    );

    const exec = keyFileData.exec || '';
    const execAppImageMatch = exec.match(/([^\s"']+\.[aA][pP][pP][iI][mM][aA][gG][eE])/);

    if (isAppImageKey || execAppImageMatch) {
      const binaryPath = execAppImageMatch ? execAppImageMatch[1] : null;
      const identifier = binaryPath || desktopPath.split('/').pop() || 'AppImage';
      return {
        type: PackageType.APPIMAGE,
        identifier,
        details: {binaryPath, desktopPath},
      };
    }

    return null;
  }

  _detectWebApp(appId, desktopPath, keyFileData) {
    const filename = desktopPath.split('/').pop() || '';
    const isChromePwa = /^(chrome|chromium|brave|msedge|vivaldi)-[a-zA-Z0-9_-]+.*\.desktop$/.test(filename);
    const exec = keyFileData.exec || '';
    const hasAppIdFlag = exec.includes('--app-id=') || exec.includes('--app=');
    const isFirefoxPwa = filename.startsWith('firefoxpwa-') || exec.includes('firefoxpwa');
    const isEpiphanyPwa = appId.startsWith('org.gnome.Epiphany.WebApp') ||
                          desktopPath.includes('org.gnome.Epiphany.WebApp') ||
                          exec.includes('epiphany --application-mode');
    const isMintWebApp = Boolean(keyFileData.xWebAppId || exec.includes('webapp-manager') || exec.includes('ice '));

    if (isChromePwa || hasAppIdFlag || isFirefoxPwa || isEpiphanyPwa || isMintWebApp) {
      let webAppId = keyFileData.xWebAppId || null;
      const appIdMatch = exec.match(/--app-id=([a-zA-Z0-9_-]+)/);
      if (appIdMatch)
        webAppId = appIdMatch[1];

      let browser = 'Browser';
      let profilePath = null;

      if (isEpiphanyPwa) {
        browser = 'GNOME Web (Epiphany)';
        const homeDir = GLib.get_home_dir();
        const baseName = filename.replace(/\.desktop$/, '');
        profilePath = `${homeDir}/.local/share/${baseName}`;
        if (!GLib.file_test(profilePath, GLib.FileTest.IS_DIR)) {
          const altProfile = `${homeDir}/.local/share/epiphany/app-${baseName}`;
          if (GLib.file_test(altProfile, GLib.FileTest.IS_DIR))
            profilePath = altProfile;
        }
        webAppId = baseName;
      } else if (isMintWebApp) {
        browser = 'Web App Manager';
      } else if (filename.includes('chrome') || exec.includes('chrome')) {
        browser = 'Google Chrome';
      } else if (filename.includes('brave') || exec.includes('brave')) {
        browser = 'Brave';
      } else if (filename.includes('msedge') || exec.includes('msedge')) {
        browser = 'Microsoft Edge';
      } else if (filename.includes('chromium') || exec.includes('chromium')) {
        browser = 'Chromium';
      } else if (isFirefoxPwa) {
        browser = 'Firefox PWA';
      }

      return {
        type: PackageType.WEBAPP,
        identifier: webAppId || filename.replace(/\.desktop$/, ''),
        details: {browser, webAppId, profilePath, desktopPath},
      };
    }

    return null;
  }

  _detectSteam(appId, desktopPath, keyFileData) {
    const filename = desktopPath.split('/').pop() || '';
    const exec = keyFileData.exec || '';
    const steamMatch = filename.match(/^steam_app_(\d+)\.desktop$/) ||
                       exec.match(/steam:\/\/rungameid\/(\d+)/);

    if (steamMatch) {
      return {
        type: PackageType.STEAM,
        identifier: steamMatch[1],
        details: {steamAppId: steamMatch[1], desktopPath},
      };
    }

    return null;
  }

  _detectPipx(desktopPath, keyFileData) {
    const exec = keyFileData.exec || '';
    if (exec.includes('/.local/pipx/venvs/') || desktopPath.includes('/pipx/')) {
      const match = exec.match(/\/\.local\/pipx\/venvs\/([^/]+)\//);
      const pkgName = match ? match[1] : desktopPath.split('/').pop().replace(/\.desktop$/, '');
      return {
        type: PackageType.PIPX,
        identifier: pkgName,
        details: {pkgName, desktopPath},
      };
    }
    return null;
  }

  _detectHomebrew(desktopPath, keyFileData) {
    if (desktopPath.startsWith('/home/linuxbrew/') ||
        desktopPath.startsWith(GLib.get_home_dir() + '/.linuxbrew/')) {
      const match = desktopPath.match(/linuxbrew\/Cellar\/([^/]+)\//) ||
                    desktopPath.match(/linuxbrew\/opt\/([^/]+)\//);
      const formula = match ? match[1] : desktopPath.split('/').pop().replace(/\.desktop$/, '');
      return {
        type: PackageType.HOMEBREW,
        identifier: formula,
        details: {formula, desktopPath},
      };
    }
    return null;
  }

  _detectNix(desktopPath, keyFileData) {
    const exec = keyFileData.exec || '';
    const isNixPath = desktopPath.includes('/nix/store/') ||
                      desktopPath.includes('/.nix-profile/') ||
                      desktopPath.startsWith('/run/current-system/sw/') ||
                      desktopPath.includes('/profiles/per-user/') ||
                      exec.includes('/nix/store/') ||
                      exec.includes('/.nix-profile/');

    if (isNixPath) {
      const pkgMatch = exec.match(/\/nix\/store\/[a-z0-9]+-([^/]+)\//) ||
                       desktopPath.match(/\/nix\/store\/[a-z0-9]+-([^/]+)\//);
      const identifier = pkgMatch ? pkgMatch[1] : desktopPath.split('/').pop().replace(/\.desktop$/, '');
      return {
        type: PackageType.NIX,
        identifier,
        details: {pkgName: identifier, desktopPath},
      };
    }

    return null;
  }

  _detectCustom(appId, desktopPath, keyFileData) {
    const homeDir = GLib.get_home_dir();
    const isUserDesktop = homeDir ? desktopPath.startsWith(homeDir + '/.local/share/applications/') : false;
    const isLocalSystemDesktop = desktopPath.startsWith('/usr/local/share/applications/');
    const isGlobalSystemDesktop = desktopPath.startsWith('/usr/share/applications/');

    if (isUserDesktop || isLocalSystemDesktop || isGlobalSystemDesktop) {
      const exec = keyFileData.exec || '';
      const execBinary = this._extractExecBinary(exec);
      const pathKey = keyFileData.path || '';

      const installDir = this._resolveInstallDir(execBinary, pathKey, desktopPath);
      const uninstallerScript = this._findUninstaller(installDir);

      const isUserLevel = isUserDesktop &&
        (!installDir || (homeDir && installDir.startsWith(homeDir))) &&
        (!execBinary || (homeDir && execBinary.startsWith(homeDir)));

      const identifier = desktopPath.split('/').pop().replace(/\.desktop$/, '');

      return {
        type: PackageType.CUSTOM,
        identifier,
        scope: isUserLevel ? 'user' : 'system',
        details: {
          desktopPath,
          execPath: execBinary,
          installDir,
          uninstallerScript,
          isUserLevel,
          icon: keyFileData.icon,
        },
      };
    }

    return null;
  }

  _extractExecBinary(execLine) {
    if (!execLine)
      return '';
    const match = execLine.match(/^"([^"]+)"|^(\S+)/);
    return match ? (match[1] || match[2]) : '';
  }

  _resolveInstallDir(execPath, pathKey, desktopPath) {
    if (pathKey && GLib.file_test(pathKey, GLib.FileTest.IS_DIR)) {
      if (SystemAppGuard.isSafeDirectoryToDelete(pathKey))
        return pathKey;
    }

    if (!execPath)
      return null;

    const cleanExec = execPath.replace(/^"/, '').replace(/"$/, '');

    // 1. /opt/<app-dir>
    const optMatch = cleanExec.match(/^(\/opt\/[^/]+)/);
    if (optMatch && GLib.file_test(optMatch[1], GLib.FileTest.IS_DIR)) {
      if (SystemAppGuard.isSafeDirectoryToDelete(optMatch[1]))
        return optMatch[1];
    }

    // 2. ~/Applications/<app-dir>
    const homeDir = GLib.get_home_dir();
    if (homeDir && cleanExec.startsWith(`${homeDir}/Applications/`)) {
      const sub = cleanExec.slice(`${homeDir}/Applications/`.length);
      const parts = sub.split('/');
      if (parts.length > 1) {
        const candidate = `${homeDir}/Applications/${parts[0]}`;
        if (GLib.file_test(candidate, GLib.FileTest.IS_DIR) && SystemAppGuard.isSafeDirectoryToDelete(candidate))
          return candidate;
      }
    }

    // 3. ~/.local/opt/<app-dir>
    if (homeDir && cleanExec.startsWith(`${homeDir}/.local/opt/`)) {
      const sub = cleanExec.slice(`${homeDir}/.local/opt/`.length);
      const parts = sub.split('/');
      if (parts.length > 1) {
        const candidate = `${homeDir}/.local/opt/${parts[0]}`;
        if (GLib.file_test(candidate, GLib.FileTest.IS_DIR) && SystemAppGuard.isSafeDirectoryToDelete(candidate))
          return candidate;
      }
    }

    // 4. ~/.local/share/<app-dir>
    if (homeDir && cleanExec.startsWith(`${homeDir}/.local/share/`)) {
      const sub = cleanExec.slice(`${homeDir}/.local/share/`.length);
      const parts = sub.split('/');
      if (parts.length > 1 && !['applications', 'icons', 'themes', 'flatpak', 'Trash', 'mime', 'gnome-shell'].includes(parts[0])) {
        const candidate = `${homeDir}/.local/share/${parts[0]}`;
        if (GLib.file_test(candidate, GLib.FileTest.IS_DIR) && SystemAppGuard.isSafeDirectoryToDelete(candidate))
          return candidate;
      }
    }

    // 5. /usr/local/share/<app-dir>
    const localShareMatch = cleanExec.match(/^(\/usr\/local\/share\/[^/]+)/);
    if (localShareMatch && !localShareMatch[1].startsWith('/usr/local/share/applications')) {
      if (GLib.file_test(localShareMatch[1], GLib.FileTest.IS_DIR) && SystemAppGuard.isSafeDirectoryToDelete(localShareMatch[1]))
        return localShareMatch[1];
    }

    return null;
  }

  _findUninstaller(installDir) {
    if (!installDir || !GLib.file_test(installDir, GLib.FileTest.IS_DIR))
      return null;

    const candidates = [
      'uninstall.sh',
      'Uninstall.sh',
      'uninstall',
      'Uninstall',
      'bin/uninstall.sh',
      'bin/uninstall',
      'uninstall.bin',
    ];

    for (const rel of candidates) {
      const fullPath = `${installDir}/${rel}`;
      if (GLib.file_test(fullPath, GLib.FileTest.IS_REGULAR))
        return fullPath;
    }

    return null;
  }

  async _detectApt(desktopPath, execBinary = null) {
    if (GLib.find_program_in_path('dpkg') === null)
      return null;

    let result = await this._runAsync(['dpkg', '-S', desktopPath]);
    if ((!result.ok || result.status !== 0 || !result.stdout) && execBinary) {
      if (execBinary.startsWith('/usr/') || execBinary.startsWith('/bin/'))
        result = await this._runAsync(['dpkg', '-S', execBinary]);
    }

    if (!result.ok || result.status !== 0 || !result.stdout)
      return null;

    const firstLine = result.stdout.split('\n')[0].trim();
    if (!firstLine.includes(':'))
      return null;

    let pkgPart = firstLine.split(':')[0].trim();
    if (pkgPart.startsWith('diversion by'))
      return null;

    const packages = pkgPart.split(',').map(p => p.trim());
    let pkg = packages[0];
    if (pkg.includes(':'))
      pkg = pkg.split(':')[0].trim();

    return pkg || null;
  }

  async _detectRpm(desktopPath, execBinary = null) {
    if (GLib.find_program_in_path('rpm') === null)
      return null;

    let result = await this._runAsync([
      'rpm',
      '-qf',
      desktopPath,
      '--queryformat',
      '%{NAME}',
    ]);
    if ((!result.ok || result.status !== 0 || !result.stdout) && execBinary) {
      if (execBinary.startsWith('/usr/') || execBinary.startsWith('/bin/')) {
        result = await this._runAsync([
          'rpm',
          '-qf',
          execBinary,
          '--queryformat',
          '%{NAME}',
        ]);
      }
    }

    if (!result.ok || result.status !== 0 || !result.stdout)
      return null;

    return result.stdout.trim() || null;
  }

  async _detectPacman(desktopPath, execBinary = null) {
    if (GLib.find_program_in_path('pacman') === null)
      return null;

    let result = await this._runAsync(['pacman', '-Qo', desktopPath]);
    if ((!result.ok || result.status !== 0 || !result.stdout) && execBinary) {
      if (execBinary.startsWith('/usr/') || execBinary.startsWith('/bin/'))
        result = await this._runAsync(['pacman', '-Qo', execBinary]);
    }

    if (!result.ok || result.status !== 0 || !result.stdout)
      return null;

    // Output: "/usr/share/applications/foo.desktop is owned by foo-pkg 1.2.3-1"
    const match = result.stdout.match(/is owned by\s+([^\s]+)/);
    return match ? match[1] : null;
  }

  async _detectApk(desktopPath) {
    if (GLib.find_program_in_path('apk') === null)
      return null;

    const result = await this._runAsync(['apk', 'info', '-W', desktopPath]);
    if (!result.ok || result.status !== 0 || !result.stdout)
      return null;

    // Output: "/usr/share/applications/foo.desktop is owned by foo-pkg-1.2.3"
    const match = result.stdout.match(/is owned by\s+([^\s]+)/);
    return match ? match[1] : null;
  }

  async _detectXbps(desktopPath) {
    if (GLib.find_program_in_path('xbps-query') === null)
      return null;

    const result = await this._runAsync(['xbps-query', '-o', desktopPath]);
    if (!result.ok || result.status !== 0 || !result.stdout)
      return null;

    // Output: "pkgname-version: /path/to/file"
    const match = result.stdout.match(/^([^:]+):/);
    return match ? match[1] : null;
  }

  async _detectEopkg(desktopPath) {
    if (GLib.find_program_in_path('eopkg') === null)
      return null;

    const result = await this._runAsync(['eopkg', 'sf', desktopPath]);
    if (!result.ok || result.status !== 0 || !result.stdout)
      return null;

    const lines = result.stdout.split('\n');
    if (lines.length > 1)
      return lines[1].trim() || null;

    return null;
  }

  _runAsync(argv) {
    return new Promise(resolve => {
      let proc;

      try {
        proc = Gio.Subprocess.new(
          argv,
          Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
        );
      } catch (_) {
        resolve({ok: false, stdout: '', stderr: '', status: -1});
        return;
      }

      proc.communicate_utf8_async(null, null, (self, result) => {
        try {
          const [, stdout, stderr] = self.communicate_utf8_finish(result);
          resolve({
            ok: true,
            stdout: (stdout ?? '').trim(),
            stderr: (stderr ?? '').trim(),
            status: self.get_exit_status(),
          });
        } catch (_) {
          resolve({ok: false, stdout: '', stderr: '', status: -1});
        }
      });
    });
  }

}
