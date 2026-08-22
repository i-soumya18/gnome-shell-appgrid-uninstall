import Adw from 'gi://Adw';
import Gio from 'gi://Gio';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class AppGridUninstallPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const settings = this.getSettings();

    const page = new Adw.PreferencesPage({
      title: _('General'),
      icon_name: 'preferences-system-symbolic',
    });

    const behaviorGroup = new Adw.PreferencesGroup({
      title: _('Behavior'),
    });

    const confirmRow = new Adw.SwitchRow({
      title: _('Show Confirmation Dialog'),
      subtitle: _('Ask before uninstalling any app'),
    });
    settings.bind(
      'show-confirmation-dialog',
      confirmRow,
      'active',
      Gio.SettingsBindFlags.DEFAULT
    );
    behaviorGroup.add(confirmRow);

    const pkgTypeRow = new Adw.SwitchRow({
      title: _('Show Package Type'),
      subtitle: _('Display package manager info in the confirmation dialog'),
    });
    settings.bind(
      'show-package-type-in-dialog',
      pkgTypeRow,
      'active',
      Gio.SettingsBindFlags.DEFAULT
    );
    behaviorGroup.add(pkgTypeRow);

    const notifyRow = new Adw.SwitchRow({
      title: _('Success Notifications'),
      subtitle: _('Show a notification when an app is successfully removed'),
    });
    settings.bind(
      'notify-on-success',
      notifyRow,
      'active',
      Gio.SettingsBindFlags.DEFAULT
    );
    behaviorGroup.add(notifyRow);

    page.add(behaviorGroup);

    const packageGroup = new Adw.PreferencesGroup({
      title: _('Package Types'),
      description: _('Choose which package types get the Uninstall option'),
    });

    for (const [key, label] of [
      ['enable-for-flatpak', _('Flatpak')],
      ['enable-for-snap', _('Snap')],
      ['enable-for-apt', _('APT / dpkg')],
    ]) {
      const row = new Adw.SwitchRow({title: label});
      settings.bind(key, row, 'active', Gio.SettingsBindFlags.DEFAULT);
      packageGroup.add(row);
    }

    page.add(packageGroup);
    window.add(page);
  }
}
