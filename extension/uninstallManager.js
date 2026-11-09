import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {PackageDetector, PackageType} from './packageDetector.js';
import {SystemAppGuard} from './systemAppGuard.js';

const PACKAGE_SETTINGS_KEYS = Object.freeze({
  [PackageType.FLATPAK]: 'enable-for-flatpak',
  [PackageType.SNAP]: 'enable-for-snap',
  [PackageType.APT]: 'enable-for-apt',
  [PackageType.DNF]: 'enable-for-dnf',
  [PackageType.RPM]: 'enable-for-dnf',
  [PackageType.ZYPPER]: 'enable-for-zypper',
  [PackageType.PACMAN]: 'enable-for-pacman',
  [PackageType.APK]: 'enable-for-apk',
  [PackageType.XBPS]: 'enable-for-xbps',
  [PackageType.EOPKG]: 'enable-for-eopkg',
  [PackageType.APPIMAGE]: 'enable-for-appimage',
  [PackageType.WEBAPP]: 'enable-for-webapp',
  [PackageType.HOMEBREW]: 'enable-for-brew',
  [PackageType.PIPX]: 'enable-for-pipx',
  [PackageType.NIX]: 'enable-for-nix',
  [PackageType.STEAM]: 'enable-for-steam',
  [PackageType.CUSTOM]: 'enable-for-custom',
});

const NOOP_NOTIFICATION = Object.freeze({
  showProgress: () => {},
  showSuccess: () => {},
  showError: () => {},
  destroy: () => {},
});

export class UninstallManager {
  constructor(extension, app, dependencies = {}) {
    this._extension = extension;
    this._app = app;
    this._settings = dependencies.settings ?? this._safeGetSettings();
    this._notification = dependencies.notification ?? null;
    this._createConfirmDialog = dependencies.createConfirmDialog ?? null;
    this._DetectorClass = dependencies.DetectorClass ?? PackageDetector;
    this._GuardClass = dependencies.GuardClass ?? SystemAppGuard;
  }

  async startUninstall() {
    await this._ensureNotification();

    const guard = new this._GuardClass(this._settings);
    if (guard.isProtected(this._app)) {
      await this._showSystemAppWarning();
      return;
    }

    const detector = new this._DetectorClass();
    const pkg = await detector.detect(this._app);

    if (pkg.type === PackageType.UNKNOWN) {
      this._notification.showError(
        this._t('Cannot Uninstall'),
        this._format(this._t('Could not determine how "%s" was installed.'),
          this._getAppName(this._t('this application'))
        )
      );
      return;
    }

    if (!this._isPackageTypeEnabled(pkg.type)) {
      this._notification.showError(
        this._t('Cannot Uninstall'),
        this._format(
          this._t('Uninstall is disabled for %s packages in extension settings.'),
          pkg.type.toUpperCase()
        )
      );
      return;
    }

    if (!this._isConfirmationEnabled()) {
      this._performUninstall(pkg);
      return;
    }

    const dialog = await this._buildConfirmDialog(pkg, () => {
      this._performUninstall(pkg);
    });
    dialog.open();
  }

  _performUninstall(pkg) {
    const appName = this._getAppName(this._t('application'));
    this._notification.showProgress(this._format(this._t('Uninstalling %s…'), appName));

    switch (pkg.type) {
    case PackageType.FLATPAK:
      this._uninstallFlatpak(pkg);
      break;
    case PackageType.SNAP:
      this._uninstallSnap(pkg.identifier);
      break;
    case PackageType.APT:
      this._uninstallApt(pkg.identifier);
      break;
    case PackageType.RPM:
      this._uninstallRpm(pkg.identifier);
      break;
    case PackageType.DNF:
      this._uninstallDnf(pkg.identifier);
      break;
    case PackageType.ZYPPER:
      this._uninstallZypper(pkg.identifier);
      break;
    case PackageType.PACMAN:
      this._uninstallPacman(pkg.identifier);
      break;
    case PackageType.APK:
      this._uninstallApk(pkg.identifier);
      break;
    case PackageType.XBPS:
      this._uninstallXbps(pkg.identifier);
      break;
    case PackageType.EOPKG:
      this._uninstallEopkg(pkg.identifier);
      break;
    case PackageType.APPIMAGE:
      this._uninstallAppImage(pkg);
      break;
    case PackageType.WEBAPP:
      this._uninstallWebApp(pkg);
      break;
    case PackageType.HOMEBREW:
      this._uninstallHomebrew(pkg.identifier);
      break;
    case PackageType.PIPX:
      this._uninstallPipx(pkg.identifier);
      break;
    case PackageType.NIX:
      this._uninstallNix(pkg.identifier);
      break;
    case PackageType.STEAM:
      this._uninstallSteam(pkg.identifier);
      break;
    case PackageType.CUSTOM:
      this._uninstallCustom(pkg);
      break;
    default:
      this._notification.showError(
        this._t('Cannot Uninstall'),
        this._t('Unsupported package type.')
      );
      break;
    }
  }

  _runSubprocess(argv, successMsg, errorMsg) {
    try {
      const proc = Gio.Subprocess.new(
        argv,
        Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
      );

      proc.communicate_utf8_async(null, null, (self, result) => {
        try {
          const [, , stderr] = self.communicate_utf8_finish(result);
          if (self.get_exit_status() === 0) {
            if (this._shouldNotifySuccess())
              this._notification.showSuccess(successMsg);
          } else {
            this._notification.showError(errorMsg, (stderr ?? '').trim());
          }
        } catch (e) {
          this._notification.showError(errorMsg, e.message);
        }
      });
    } catch (e) {
      this._notification.showError(errorMsg, e.message);
    }
  }

  _uninstallFlatpak(pkg) {
    const appId = pkg.identifier;
    const appName = this._getAppName(this._t('application'));
    const flatpakBin = this._resolveBinary('/usr/bin/flatpak', 'flatpak');

    const argv = [flatpakBin, 'uninstall', '--noninteractive'];
    if (pkg.scope === 'user') {
      argv.push('--user');
    } else if (pkg.scope === 'system') {
      argv.push('--system');
    }
    argv.push(appId);

    this._runSubprocess(
      argv,
      this._format(this._t('%s was successfully uninstalled.'), appName),
      this._format(this._t('Failed to uninstall %s.'), appName)
    );
  }

  _uninstallSnap(snapName) {
    const appName = this._getAppName(this._t('application'));
    const snapBin = this._resolveBinary('/usr/bin/snap', 'snap');
    this._runSubprocess(
      ['pkexec', snapBin, 'remove', snapName],
      this._format(this._t('%s was successfully uninstalled.'), appName),
      this._format(this._t('Failed to uninstall %s.'), appName)
    );
  }

  _uninstallApt(packageName) {
    const appName = this._getAppName(this._t('application'));
    const aptGetBin = this._resolveBinary('/usr/bin/apt-get', 'apt-get');
    this._runSubprocess(
      ['pkexec', aptGetBin, 'remove', '-y', '--auto-remove', packageName],
      this._format(this._t('%s was successfully uninstalled.'), appName),
      this._format(this._t('Failed to uninstall %s.'), appName)
    );
  }

  _uninstallRpm(packageName) {
    const appName = this._getAppName(this._t('application'));
    const rpmBin = this._resolveBinary('/usr/bin/rpm', 'rpm');
    this._runSubprocess(
      ['pkexec', rpmBin, '-e', packageName],
      this._format(this._t('%s was successfully uninstalled.'), appName),
      this._format(this._t('Failed to uninstall %s.'), appName)
    );
  }

  _uninstallDnf(packageName) {
    const appName = this._getAppName(this._t('application'));
    const dnf5Bin = GLib.find_program_in_path('dnf5');
    const dnfBin = this._resolveBinary(dnf5Bin ?? '/usr/bin/dnf', 'dnf');
    this._runSubprocess(
      ['pkexec', dnfBin, 'remove', '-y', packageName],
      this._format(this._t('%s was successfully uninstalled.'), appName),
      this._format(this._t('Failed to uninstall %s.'), appName)
    );
  }

  _uninstallZypper(packageName) {
    const appName = this._getAppName(this._t('application'));
    const zypperBin = this._resolveBinary('/usr/bin/zypper', 'zypper');
    this._runSubprocess(
      ['pkexec', zypperBin, '--non-interactive', 'remove', '-u', packageName],
      this._format(this._t('%s was successfully uninstalled.'), appName),
      this._format(this._t('Failed to uninstall %s.'), appName)
    );
  }

  _uninstallPacman(packageName) {
    const appName = this._getAppName(this._t('application'));
    const pacmanBin = this._resolveBinary('/usr/bin/pacman', 'pacman');
    this._runSubprocess(
      ['pkexec', pacmanBin, '-R', '--noconfirm', packageName],
      this._format(this._t('%s was successfully uninstalled.'), appName),
      this._format(this._t('Failed to uninstall %s.'), appName)
    );
  }

  _uninstallApk(packageName) {
    const appName = this._getAppName(this._t('application'));
    const apkBin = this._resolveBinary('/sbin/apk', 'apk');
    this._runSubprocess(
      ['pkexec', apkBin, 'del', packageName],
      this._format(this._t('%s was successfully uninstalled.'), appName),
      this._format(this._t('Failed to uninstall %s.'), appName)
    );
  }

  _uninstallXbps(packageName) {
    const appName = this._getAppName(this._t('application'));
    const xbpsBin = this._resolveBinary('/usr/bin/xbps-remove', 'xbps-remove');
    this._runSubprocess(
      ['pkexec', xbpsBin, '-y', packageName],
      this._format(this._t('%s was successfully uninstalled.'), appName),
      this._format(this._t('Failed to uninstall %s.'), appName)
    );
  }

  _uninstallEopkg(packageName) {
    const appName = this._getAppName(this._t('application'));
    const eopkgBin = this._resolveBinary('/usr/bin/eopkg', 'eopkg');
    this._runSubprocess(
      ['pkexec', eopkgBin, 'remove', '-y', packageName],
      this._format(this._t('%s was successfully uninstalled.'), appName),
      this._format(this._t('Failed to uninstall %s.'), appName)
    );
  }

  _uninstallAppImage(pkg) {
    const appName = this._getAppName(this._t('application'));
    const desktopPath = pkg.details?.desktopPath;
    const binaryPath = pkg.details?.binaryPath;
    const rmBin = this._resolveBinary('/bin/rm', 'rm');

    try {
      if (desktopPath && GLib.file_test(desktopPath, GLib.FileTest.EXISTS)) {
        const dFile = Gio.File.new_for_path(desktopPath);
        dFile.delete(null);
      }

      if (binaryPath && GLib.file_test(binaryPath, GLib.FileTest.EXISTS)) {
        const homeDir = GLib.get_home_dir();
        if (homeDir && binaryPath.startsWith(homeDir)) {
          const bFile = Gio.File.new_for_path(binaryPath);
          try {
            bFile.trash(null);
          } catch (_) {
            bFile.delete(null);
          }
        } else {
          // System-wide AppImage outside home: require pkexec
          this._runSubprocess(
            ['pkexec', rmBin, '-f', binaryPath],
            this._format(this._t('%s was successfully uninstalled.'), appName),
            this._format(this._t('Failed to uninstall %s.'), appName)
          );
          return;
        }
      }

      if (this._shouldNotifySuccess()) {
        this._notification.showSuccess(
          this._format(this._t('%s was successfully uninstalled.'), appName)
        );
      }
    } catch (e) {
      this._notification.showError(
        this._format(this._t('Failed to uninstall %s.'), appName),
        e.message
      );
    }
  }

  _uninstallWebApp(pkg) {
    const appName = this._getAppName(this._t('application'));
    const desktopPath = pkg.details?.desktopPath;
    const webAppId = pkg.details?.webAppId;
    const profilePath = pkg.details?.profilePath;
    const rmBin = this._resolveBinary('/bin/rm', 'rm');

    try {
      if (desktopPath && GLib.file_test(desktopPath, GLib.FileTest.EXISTS)) {
        const dFile = Gio.File.new_for_path(desktopPath);
        dFile.delete(null);
      }

      if (profilePath && SystemAppGuard.isSafeDirectoryToDelete(profilePath)) {
        try {
          Gio.Subprocess.new([rmBin, '-rf', profilePath], Gio.SubprocessFlags.NONE);
        } catch (_) {}
      }

      if (webAppId) {
        const browsers = ['google-chrome-stable', 'google-chrome', 'brave-browser', 'brave', 'microsoft-edge-stable', 'chromium'];
        for (const b of browsers) {
          if (GLib.find_program_in_path(b) !== null) {
            try {
              Gio.Subprocess.new(
                [b, `--uninstall-app-id=${webAppId}`],
                Gio.SubprocessFlags.NONE
              );
            } catch (_) {}
            break;
          }
        }
      }

      if (this._shouldNotifySuccess()) {
        this._notification.showSuccess(
          this._format(this._t('%s was successfully uninstalled.'), appName)
        );
      }
    } catch (e) {
      this._notification.showError(
        this._format(this._t('Failed to uninstall %s.'), appName),
        e.message
      );
    }
  }

  _uninstallHomebrew(formula) {
    const appName = this._getAppName(this._t('application'));
    const brewBin = this._resolveBinary('/home/linuxbrew/.linuxbrew/bin/brew', 'brew');
    this._runSubprocess(
      [brewBin, 'uninstall', formula],
      this._format(this._t('%s was successfully uninstalled.'), appName),
      this._format(this._t('Failed to uninstall %s.'), appName)
    );
  }

  _uninstallPipx(pkgName) {
    const appName = this._getAppName(this._t('application'));
    const pipxBin = this._resolveBinary('/usr/bin/pipx', 'pipx');
    this._runSubprocess(
      [pipxBin, 'uninstall', pkgName],
      this._format(this._t('%s was successfully uninstalled.'), appName),
      this._format(this._t('Failed to uninstall %s.'), appName)
    );
  }

  _uninstallNix(identifier) {
    const appName = this._getAppName(this._t('application'));
    const nixBin = this._resolveBinary('/run/current-system/sw/bin/nix', 'nix');
    const nixEnvBin = this._resolveBinary('/run/current-system/sw/bin/nix-env', 'nix-env');

    if (GLib.find_program_in_path('nix') !== null) {
      this._runSubprocess(
        [nixBin, 'profile', 'remove', identifier],
        this._format(this._t('%s was successfully uninstalled.'), appName),
        this._format(this._t('Failed to uninstall %s.'), appName)
      );
    } else {
      this._runSubprocess(
        [nixEnvBin, '-e', identifier],
        this._format(this._t('%s was successfully uninstalled.'), appName),
        this._format(this._t('Failed to uninstall %s.'), appName)
      );
    }
  }

  _uninstallSteam(appId) {
    const appName = this._getAppName(this._t('application'));
    try {
      Gio.AppInfo.launch_default_for_uri(`steam://uninstall/${appId}`, null);
      if (this._shouldNotifySuccess()) {
        this._notification.showSuccess(
          this._format(this._t('Triggered uninstall for %s in Steam.'), appName)
        );
      }
    } catch (_) {
      const steamBin = this._resolveBinary('/usr/bin/steam', 'steam');
      try {
        Gio.Subprocess.new(
          [steamBin, `steam://uninstall/${appId}`],
          Gio.SubprocessFlags.NONE
        );
        if (this._shouldNotifySuccess()) {
          this._notification.showSuccess(
            this._format(this._t('Triggered uninstall for %s in Steam.'), appName)
          );
        }
      } catch (err) {
        this._notification.showError(
          this._format(this._t('Failed to uninstall %s.'), appName),
          err.message
        );
      }
    }
  }

  _findSymlinksForApp(installDir, execPath, isUserLevel) {
    const symlinks = [];
    const binDirs = [];
    const homeDir = GLib.get_home_dir();

    if (isUserLevel && homeDir) {
      binDirs.push(`${homeDir}/.local/bin`, `${homeDir}/bin`);
    } else {
      binDirs.push('/usr/local/bin');
    }

    for (const binDir of binDirs) {
      try {
        const dir = Gio.File.new_for_path(binDir);
        if (!dir.query_exists(null))
          continue;

        const enumerator = dir.enumerate_children(
          'standard::name,standard::is-symlink,standard::symlink-target',
          Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS,
          null
        );

        let info;
        while ((info = enumerator.next_file(null)) !== null) {
          if (info.get_is_symlink()) {
            const target = info.get_symlink_target();
            const childPath = `${binDir}/${info.get_name()}`;
            if (target) {
              const fullTarget = target.startsWith('/')
                ? target
                : GLib.canonicalize_filename(`${binDir}/${target}`, null);

              const matchesDir = installDir && fullTarget.startsWith(installDir);
              const matchesExec = execPath && (fullTarget === execPath);

              if (matchesDir || matchesExec)
                symlinks.push(childPath);
            }
          }
        }
      } catch (_) {}
    }

    return symlinks;
  }

  _uninstallCustom(pkg) {
    const appName = this._getAppName(this._t('application'));
    const desktopPath = pkg.details?.desktopPath;
    const installDir = pkg.details?.installDir;
    const execPath = pkg.details?.execPath;
    const isUserLevel = Boolean(pkg.details?.isUserLevel);

    const isSafeInstallDir = installDir && SystemAppGuard.isSafeDirectoryToDelete(installDir);
    const symlinks = this._findSymlinksForApp(
      isSafeInstallDir ? installDir : null,
      execPath,
      isUserLevel
    );

    const rmBin = this._resolveBinary('/bin/rm', 'rm');

    if (isUserLevel) {
      try {
        const toDelete = [];
        if (desktopPath && GLib.file_test(desktopPath, GLib.FileTest.EXISTS))
          toDelete.push(desktopPath);

        for (const symlink of symlinks) {
          if (GLib.file_test(symlink, GLib.FileTest.EXISTS))
            toDelete.push(symlink);
        }

        if (isSafeInstallDir && GLib.file_test(installDir, GLib.FileTest.IS_DIR))
          toDelete.push(installDir);

        if (toDelete.length > 0) {
          const proc = Gio.Subprocess.new(
            [rmBin, '-rf', ...toDelete],
            Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
          );
          proc.communicate_utf8_async(null, null, (self, result) => {
            try {
              self.communicate_utf8_finish(result);
              if (self.get_exit_status() === 0) {
                this._refreshDesktopDatabase(true);
                if (this._shouldNotifySuccess()) {
                  this._notification.showSuccess(
                    this._format(this._t('%s was successfully uninstalled.'), appName)
                  );
                }
              } else {
                this._notification.showError(
                  this._format(this._t('Failed to uninstall %s.'), appName),
                  this._t('Could not remove application files.')
                );
              }
            } catch (e) {
              this._notification.showError(
                this._format(this._t('Failed to uninstall %s.'), appName),
                e.message
              );
            }
          });
        }
      } catch (e) {
        this._notification.showError(
          this._format(this._t('Failed to remove %s.'), appName),
          e.message
        );
      }
    } else {
      // System-level standalone (e.g. /opt/antigravity-ide, /usr/share/applications/antigravity-ide.desktop)
      const toDelete = [];
      if (desktopPath && GLib.file_test(desktopPath, GLib.FileTest.EXISTS))
        toDelete.push(desktopPath);

      for (const symlink of symlinks) {
        if (GLib.file_test(symlink, GLib.FileTest.EXISTS))
          toDelete.push(symlink);
      }

      if (isSafeInstallDir && GLib.file_test(installDir, GLib.FileTest.IS_DIR))
        toDelete.push(installDir);

      if (toDelete.length > 0) {
        this._runSubprocess(
          ['pkexec', rmBin, '-rf', ...toDelete],
          this._format(this._t('%s was successfully uninstalled.'), appName),
          this._format(this._t('Failed to uninstall %s.'), appName)
        );
      }
    }
  }

  _refreshDesktopDatabase(isUserLevel) {
    if (GLib.find_program_in_path('update-desktop-database') !== null) {
      try {
        const homeDir = GLib.get_home_dir();
        const path = isUserLevel && homeDir
          ? `${homeDir}/.local/share/applications`
          : '/usr/share/applications';
        Gio.Subprocess.new(['update-desktop-database', path], Gio.SubprocessFlags.NONE);
      } catch (_) {}
    }
  }

  async _showSystemAppWarning() {
    const dialog = await this._buildConfirmDialog(null, null, {
      warningMode: true,
      warningText: this._format(
        this._t('"%s" is a system application and cannot be uninstalled.'),
        this._getAppName(this._t('This app'))
      ),
    });
    dialog.open();
  }

  async _ensureNotification() {
    if (this._notification)
      return;

    if (!this._extension) {
      this._notification = NOOP_NOTIFICATION;
      return;
    }

    try {
      const {NotificationHandler} = await import('./notificationHandler.js');
      this._notification = new NotificationHandler(this._extension);
    } catch (error) {
      log(`[AppGridUninstall] Falling back to noop notifications: ${error.message}`);
      this._notification = NOOP_NOTIFICATION;
    }
  }

  async _buildConfirmDialog(pkg, onConfirm, extraOptions = {}) {
    const options = {
      showPackageType: this._shouldShowPackageType(),
      gettext: text => this._t(text),
      ...extraOptions,
    };

    if (typeof this._createConfirmDialog === 'function') {
      const dialog = this._createConfirmDialog(this._app, pkg, onConfirm, options);
      if (dialog && typeof dialog.open === 'function')
        return dialog;
    }

    try {
      const {ConfirmDialog} = await import('./confirmDialog.js');
      return new ConfirmDialog(this._app, pkg, onConfirm, options);
    } catch (error) {
      this._notification.showError(
        this._t('Cannot Uninstall'),
        this._format(this._t('Unable to open confirmation dialog: %s'), error.message)
      );
      return {open: () => {}};
    }
  }

  _isPackageTypeEnabled(packageType) {
    const settingsKey = PACKAGE_SETTINGS_KEYS[packageType];
    if (!settingsKey)
      return true;
    return this._readBooleanSetting(settingsKey, true);
  }

  _isConfirmationEnabled() {
    return this._readBooleanSetting('show-confirmation-dialog', true);
  }

  _shouldShowPackageType() {
    return this._readBooleanSetting('show-package-type-in-dialog', true);
  }

  _shouldNotifySuccess() {
    return this._readBooleanSetting('notify-on-success', true);
  }

  _readBooleanSetting(key, fallbackValue) {
    if (!this._settings || typeof this._settings.get_boolean !== 'function')
      return fallbackValue;

    try {
      return this._settings.get_boolean(key);
    } catch (_) {
      return fallbackValue;
    }
  }

  _safeGetSettings() {
    if (typeof this._extension?.getSettings !== 'function')
      return null;

    try {
      return this._extension.getSettings();
    } catch (_) {
      return null;
    }
  }

  _getAppName(fallback) {
    return this._app?.get_name?.() ?? fallback;
  }

  _t(text) {
    if (typeof this._extension?.gettext === 'function')
      return this._extension.gettext(text);
    return text;
  }

  _format(message, ...args) {
    if (typeof message?.format === 'function')
      return message.format(...args);

    let index = 0;
    return String(message).replace(/%s/g, () => {
      const value = args[index];
      index += 1;
      return String(value ?? '');
    });
  }

  _resolveBinary(expectedPath, fallbackName) {
    if (GLib.file_test(expectedPath, GLib.FileTest.EXISTS))
      return expectedPath;

    const found = GLib.find_program_in_path(fallbackName);
    return found ?? fallbackName;
  }
}
