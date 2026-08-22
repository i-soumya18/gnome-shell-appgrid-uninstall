import Clutter from 'gi://Clutter';
import St from 'gi://St';

import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';

export class ConfirmDialog {
  constructor(app, pkg, onConfirm, options = {}) {
    this._app = app;
    this._pkg = pkg;
    this._onConfirm = onConfirm;
    this._options = options;
  }

  open() {
    const appName = this._app?.get_name?.() ?? this._t('Application');

    if (this._options.warningMode) {
      const dialog = new ModalDialog.ModalDialog({styleClass: 'prompt-dialog'});

      const content = new St.BoxLayout({
        style_class: 'prompt-dialog-main-layout',
        vertical: false,
      });

      const icon = this._app?.create_icon_texture?.(48);
      if (icon)
        content.add_child(icon);

      const label = new St.Label({
        text: this._options.warningText ?? this._t('This application is protected.'),
        style_class: 'prompt-dialog-headline',
      });
      if (label.clutter_text) {
        label.clutter_text.set_line_wrap(true);
        label.clutter_text.set_ellipsize(0);
      }
      content.add_child(label);

      dialog.contentLayout.add_child(content);

      dialog.addButton({
        label: this._t('OK'),
        action: () => dialog.close(),
        key: Clutter.KEY_Return,
        default: true,
      });

      dialog.open();
      return;
    }

    const dialog = new ModalDialog.ModalDialog({styleClass: 'prompt-dialog'});

    const includePkgInfo = this._options.showPackageType !== false;
    const pkgLabel = this._formatPackageLabel(this._pkg);
    const pkgInfo = includePkgInfo && pkgLabel
      ? `\n${this._t('Type')}: ${pkgLabel}`
      : '';

    const headline = new St.Label({
      text: this._format(this._t('Uninstall "%s"?'), appName),
      style_class: 'prompt-dialog-headline',
    });
    if (headline.clutter_text) {
      headline.clutter_text.set_line_wrap(true);
      headline.clutter_text.set_ellipsize(0);
    }

    const body = new St.Label({
      text: this._t('This will permanently remove the application from your system.') + pkgInfo,
      style_class: 'prompt-dialog-description',
    });
    if (body.clutter_text) {
      body.clutter_text.set_line_wrap(true);
      body.clutter_text.set_ellipsize(0);
    }

    dialog.contentLayout.add_child(headline);
    dialog.contentLayout.add_child(body);

    dialog.addButton({
      label: this._t('Cancel'),
      action: () => dialog.close(),
      key: Clutter.KEY_Escape,
    });

    dialog.addButton({
      label: this._t('Uninstall'),
      action: () => {
        dialog.close();
        if (typeof this._onConfirm === 'function')
          this._onConfirm();
      },
      key: Clutter.KEY_Return,
      default: true,
    });

    dialog.open();
  }

  _formatPackageLabel(pkg) {
    if (!pkg || !pkg.type)
      return null;

    const id = pkg.identifier ? ` · ${pkg.identifier}` : '';
    switch (pkg.type) {
    case 'flatpak':
      return `Flatpak${pkg.scope === 'user' ? ' (User)' : pkg.scope === 'system' ? ' (System)' : ''}${id}`;
    case 'snap':
      return `Snap${id}`;
    case 'apt':
      return `APT / dpkg${id}`;
    case 'dnf':
      return `DNF${id}`;
    case 'rpm':
      return `RPM${id}`;
    case 'zypper':
      return `Zypper${id}`;
    case 'pacman':
      return `Pacman / Arch${id}`;
    case 'apk':
      return `Alpine APK${id}`;
    case 'xbps':
      return `Void XBPS${id}`;
    case 'eopkg':
      return `Solus eopkg${id}`;
    case 'appimage':
      return `AppImage${id}`;
    case 'webapp':
      return `${pkg.details?.browser ?? 'Web App'} (PWA)${id}`;
    case 'brew':
      return `Homebrew${id}`;
    case 'pipx':
      return `Pipx Python package${id}`;
    case 'steam':
      return `Steam Game${id}`;
    case 'custom':
      return `Desktop entry & files${id}`;
    default:
      return `${pkg.type.toUpperCase()}${id}`;
    }
  }

  _t(text) {
    if (typeof this._options?.gettext === 'function')
      return this._options.gettext(text);

    if (typeof globalThis._ === 'function')
      return globalThis._(text);

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
}
