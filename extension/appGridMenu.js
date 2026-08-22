import * as Config from 'resource:///org/gnome/shell/misc/config.js';
import * as AppDisplay from 'resource:///org/gnome/shell/ui/appDisplay.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {SystemAppGuard} from './systemAppGuard.js';
import {UninstallManager} from './uninstallManager.js';

const MENU_METHOD_CANDIDATES = ['popupMenu', '_buildMenu', '_createMenu'];

export class AppGridMenuPatcher {
  constructor(extension) {
    this._extension = extension;
    this._settings = this._safeGetSettings();
    this._isPatched = false;
    this._patchedMethod = null;
    this._originalMethod = null;
    this._menuEntries = [];
  }

  patch() {
    if (this._isPatched)
      return;

    const proto = AppDisplay.AppIcon?.prototype;
    if (!proto) {
      log('[AppGridUninstall] AppIcon prototype not found; skip patch');
      return;
    }

    const methodName = this._resolveMenuMethod(proto);
    if (!methodName) {
      log('[AppGridUninstall] No known AppIcon menu method found; skip patch');
      return;
    }

    this._patchedMethod = methodName;
    this._originalMethod = proto[methodName];

    const patcher = this;
    proto[methodName] = function (...args) {
      const result = patcher._originalMethod.apply(this, args);
      patcher._injectUninstallMenuItem(this);
      return result;
    };

    this._isPatched = true;
    log(`[AppGridUninstall] AppIcon menu patched (${methodName}, GNOME ${Config.PACKAGE_VERSION})`);
  }

  unpatch() {
    if (!this._isPatched)
      return;

    const proto = AppDisplay.AppIcon?.prototype;
    if (proto && this._patchedMethod && this._originalMethod)
      proto[this._patchedMethod] = this._originalMethod;

    for (const entry of this._menuEntries) {
      const {menu, item, separator, activateId, destroyId} = entry;

      try {
        if (item && activateId)
          item.disconnect(activateId);
      } catch (_) {}

      try {
        if (item && destroyId)
          item.disconnect(destroyId);
      } catch (_) {}

      try {
        separator?.destroy();
      } catch (_) {}

      try {
        item?.destroy();
      } catch (_) {}

      try {
        if (menu && menu._appGridUninstallInjected)
          delete menu._appGridUninstallInjected;
      } catch (_) {}
    }

    this._menuEntries = [];
    this._patchedMethod = null;
    this._originalMethod = null;
    this._isPatched = false;
    log('[AppGridUninstall] AppIcon menu unpatched');
  }

  _resolveMenuMethod(proto) {
    const gnomeVersion = parseInt(Config.PACKAGE_VERSION.split('.')[0], 10);

    if (gnomeVersion >= 45 && typeof proto.popupMenu === 'function')
      return 'popupMenu';

    for (const methodName of MENU_METHOD_CANDIDATES) {
      if (typeof proto[methodName] === 'function')
        return methodName;
    }

    return null;
  }

  _injectUninstallMenuItem(appIcon) {
    if (!appIcon || !appIcon._menu)
      return;

    const menu = appIcon._menu;
    if (menu._appGridUninstallInjected)
      return;

    const separator = new PopupMenu.PopupSeparatorMenuItem();
    menu.addMenuItem(separator);

    const uninstallItem = new PopupMenu.PopupMenuItem(this._t('Uninstall'));
    const activateId = uninstallItem.connect('activate', () => {
      this._onUninstallActivated(appIcon.app);
    });
    menu.addMenuItem(uninstallItem);

    const guard = new SystemAppGuard(this._settings);
    if (guard.isProtected(appIcon.app)) {
      uninstallItem.setSensitive(false);
      uninstallItem.label.set_text(this._t('Uninstall (System App)'));
    }

    let destroyId = 0;
    destroyId = uninstallItem.connect('destroy', () => {
      destroyId = 0;
      this._menuEntries = this._menuEntries.filter(entry => entry.item !== uninstallItem);
    });

    menu._appGridUninstallInjected = true;
    this._menuEntries.push({
      menu,
      separator,
      item: uninstallItem,
      activateId,
      destroyId,
    });
  }

  _onUninstallActivated(app) {
    const manager = new UninstallManager(this._extension, app);
    manager.startUninstall().catch(error => {
      log(`[AppGridUninstall] Failed to start uninstall flow: ${error.message}`);
    });
  }

  _t(text) {
    if (typeof this._extension?.gettext === 'function')
      return this._extension.gettext(text);
    return text;
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
}
