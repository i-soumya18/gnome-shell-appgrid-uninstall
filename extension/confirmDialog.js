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
    const pkgInfo = includePkgInfo && this._pkg
      ? `\n${this._t('Package type')}: ${this._pkg.type.toUpperCase()} · ${this._pkg.identifier}`
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
