import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {PackageDetector, PackageType} from './packageDetector.js';
import {SystemAppGuard} from './systemAppGuard.js';

const PACKAGE_SETTINGS_KEYS = Object.freeze({
  [PackageType.FLATPAK]: 'enable-for-flatpak',
  [PackageType.SNAP]: 'enable-for-snap',
  [PackageType.APT]: 'enable-for-apt',
  [PackageType.RPM]: 'enable-for-apt',
  [PackageType.DNF]: 'enable-for-apt',
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
      this._uninstallFlatpak(pkg.identifier);
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

  _uninstallFlatpak(appId) {
    const appName = this._getAppName(this._t('application'));
    this._runSubprocess(
      ['flatpak', 'uninstall', '--noninteractive', '--user', appId],
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
    const dnfBin = this._resolveBinary('/usr/bin/dnf', 'dnf');
    this._runSubprocess(
      ['pkexec', dnfBin, 'remove', '-y', packageName],
      this._format(this._t('%s was successfully uninstalled.'), appName),
      this._format(this._t('Failed to uninstall %s.'), appName)
    );
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
