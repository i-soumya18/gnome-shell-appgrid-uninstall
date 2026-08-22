import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {AppGridMenuPatcher} from './appGridMenu.js';

export default class AppGridUninstallExtension extends Extension {
  constructor(metadata) {
    super(metadata);
    this._menuPatcher = null;
  }

  enable() {
    log('[AppGridUninstall] Extension enabled');
    this._menuPatcher = new AppGridMenuPatcher(this);
    this._menuPatcher.patch();
  }

  disable() {
    log('[AppGridUninstall] Extension disabled');

    if (this._menuPatcher) {
      this._menuPatcher.unpatch();
      this._menuPatcher = null;
    }
  }
}
