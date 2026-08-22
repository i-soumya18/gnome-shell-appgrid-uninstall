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

    try {
      if (desktopPath && GLib.file_test(desktopPath, GLib.FileTest.EXISTS)) {
        const dFile = Gio.File.new_for_path(desktopPath);
        dFile.delete(null);
      }

      if (binaryPath && GLib.file_test(binaryPath, GLib.FileTest.EXISTS)) {
        const homeDir = GLib.get_home_dir();
        if (binaryPath.startsWith(homeDir)) {
          const bFile = Gio.File.new_for_path(binaryPath);
          try {
            bFile.trash(null);
          } catch (_) {
            bFile.delete(null);
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

  _uninstallWebApp(pkg) {
    const appName = this._getAppName(this._t('application'));
    const desktopPath = pkg.details?.desktopPath;
    const webAppId = pkg.details?.webAppId;

    try {
      if (desktopPath && GLib.file_test(desktopPath, GLib.FileTest.EXISTS)) {
        const dFile = Gio.File.new_for_path(desktopPath);
        dFile.delete(null);
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

  _uninstallSteam(appId) {
    const appName = this._getAppName(this._t('application'));
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
    } catch (e) {
      this._notification.showError(
        this._format(this._t('Failed to uninstall %s.'), appName),
        e.message
      );
    }
  }

  _uninstallCustom(pkg) {
    const appName = this._getAppName(this._t('application'));
    const desktopPath = pkg.details?.desktopPath;
    const isUserLevel = pkg.details?.isUserLevel;

    if (isUserLevel) {
      try {
        if (desktopPath && GLib.file_test(desktopPath, GLib.FileTest.EXISTS)) {
          const dFile = Gio.File.new_for_path(desktopPath);
          dFile.delete(null);
        }
        if (this._shouldNotifySuccess()) {
          this._notification.showSuccess(
            this._format(this._t('%s shortcut was removed.'), appName)
          );
        }
      } catch (e) {
        this._notification.showError(
          this._format(this._t('Failed to remove %s.'), appName),
          e.message
        );
      }
    } else {
      const rmBin = this._resolveBinary('/bin/rm', 'rm');
      this._runSubprocess(
        ['pkexec', rmBin, '-f', desktopPath],
        this._format(this._t('%s was successfully uninstalled.'), appName),
        this._format(this._t('Failed to uninstall %s.'), appName)
      );
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
