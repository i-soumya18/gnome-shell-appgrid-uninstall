import GLib from 'gi://GLib';

const PROTECTED_APP_IDS = new Set([
  'org.gnome.Nautilus',
  'org.gnome.Settings',
  'org.gnome.Shell',
  'org.gnome.Terminal',
  'org.freedesktop.Tracker3.Miner.Files',
  'org.gnome.Software',
  'gnome-session',
  'polkit-gnome-authentication-agent-1',
  'gcr-prompter',
  'gcr-viewer',
  'geoclue-demo-agent',
  'im-config',
  'ibus-setup',
  'xdg-desktop-portal-gnome',
  'xdg-desktop-portal-gtk',
  'update-manager',
  'software-properties-gtk',
]);

const PROTECTED_PATH_PREFIXES = [
  '/usr/share/applications/gnome-',
  '/usr/share/applications/nautilus',
  '/usr/share/applications/org.gnome.Settings',
];

const BLACKLISTED_DIRECTORIES = new Set([
  '/',
  '/bin',
  '/boot',
  '/dev',
  '/etc',
  '/home',
  '/lib',
  '/lib32',
  '/lib64',
  '/media',
  '/mnt',
  '/opt',
  '/proc',
  '/root',
  '/run',
  '/sbin',
  '/srv',
  '/sys',
  '/tmp',
  '/usr',
  '/usr/bin',
  '/usr/sbin',
  '/usr/lib',
  '/usr/lib32',
  '/usr/lib64',
  '/usr/share',
  '/usr/share/applications',
  '/usr/share/icons',
  '/usr/local',
  '/usr/local/bin',
  '/usr/local/sbin',
  '/usr/local/lib',
  '/usr/local/share',
  '/usr/local/share/applications',
  '/usr/include',
  '/var',
  '/var/log',
  '/var/lib',
  '/var/run',
  '/var/spool',
]);

export class SystemAppGuard {
  constructor(settings = null) {
    this._settings = settings;
  }

  isProtected(app) {
    if (!app)
      return true;

    const appId = this._normalizeAppId(app.get_id?.() ?? '');
    const blockedAppIds = this._getUserBlockedAppIds();

    if (blockedAppIds.has(appId))
      return true;

    if (PROTECTED_APP_IDS.has(appId))
      return true;

    const appInfo = app.get_app_info?.();
    const desktopPath = appInfo?.get_filename?.() ?? '';
    if (PROTECTED_PATH_PREFIXES.some(prefix => desktopPath.startsWith(prefix)))
      return true;

    if (appInfo && !appInfo.should_show?.())
      return true;

    return false;
  }

  static isSafeDirectoryToDelete(targetPath) {
    if (!targetPath || typeof targetPath !== 'string' || !targetPath.startsWith('/'))
      return false;

    // Normalize path by stripping trailing slashes
    const normalized = targetPath.replace(/\/+$/, '') || '/';

    if (BLACKLISTED_DIRECTORIES.has(normalized))
      return false;

    const homeDir = (GLib.get_home_dir() ?? '').replace(/\/+$/, '');
    if (homeDir) {
      const userBlacklist = new Set([
        homeDir,
        `${homeDir}/.local`,
        `${homeDir}/.local/bin`,
        `${homeDir}/.local/share`,
        `${homeDir}/.local/share/applications`,
        `${homeDir}/.local/share/icons`,
        `${homeDir}/.local/share/flatpak`,
        `${homeDir}/.config`,
        `${homeDir}/.cache`,
        `${homeDir}/Desktop`,
        `${homeDir}/Documents`,
        `${homeDir}/Downloads`,
        `${homeDir}/Music`,
        `${homeDir}/Pictures`,
        `${homeDir}/Videos`,
        `${homeDir}/Applications`,
      ]);

      if (userBlacklist.has(normalized))
        return false;
    }

    // Must have at least 2 slash segments: e.g. /opt/app or /home/user/Applications/app
    const segments = normalized.split('/').filter(Boolean);
    if (segments.length < 2)
      return false;

    // Check allowed parent roots
    if (normalized.startsWith('/opt/')) {
      return segments.length >= 2; // e.g. /opt/antigravity-ide
    }

    if (normalized.startsWith('/usr/local/share/')) {
      return segments.length >= 4 && !normalized.startsWith('/usr/local/share/applications');
    }

    if (homeDir && normalized.startsWith(homeDir)) {
      if (normalized.startsWith(`${homeDir}/Applications/`))
        return segments.length >= homeDir.split('/').filter(Boolean).length + 2;

      if (normalized.startsWith(`${homeDir}/.local/opt/`))
        return segments.length >= homeDir.split('/').filter(Boolean).length + 3;

      if (normalized.startsWith(`${homeDir}/.local/share/`)) {
        const forbiddenSubs = ['applications', 'icons', 'themes', 'flatpak', 'Trash', 'mime', 'gnome-shell'];
        const relativeSub = normalized.slice(`${homeDir}/.local/share/`.length).split('/')[0];
        if (forbiddenSubs.includes(relativeSub))
          return false;
        return true;
      }

      // Generic path inside home, ensure it is at least 2 levels below home
      if (segments.length >= homeDir.split('/').filter(Boolean).length + 2)
        return true;
    }

    return false;
  }

  _normalizeAppId(appId) {
    return appId.replace(/\.desktop$/, '');
  }

  _getUserBlockedAppIds() {
    if (!this._settings || typeof this._settings.get_strv !== 'function')
      return new Set();

    try {
      const entries = this._settings.get_strv('blocked-apps') ?? [];
      return new Set(entries.map(appId => this._normalizeAppId(appId)));
    } catch (_) {
      return new Set();
    }
  }
}
