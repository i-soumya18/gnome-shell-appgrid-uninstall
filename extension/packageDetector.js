import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

export const PackageType = Object.freeze({
  FLATPAK: 'flatpak',
  SNAP: 'snap',
  APT: 'apt',
  RPM: 'rpm',
  DNF: 'dnf',
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

    const appId = app?.get_id?.() ?? null;

    const flatpakRef = await this._detectFlatpak(appId, desktopFilePath);
    if (flatpakRef)
      return {type: PackageType.FLATPAK, identifier: flatpakRef};

    if (desktopFilePath.startsWith('/snap/') ||
        desktopFilePath.startsWith('/var/lib/snapd/')) {
      const snapName = this._extractSnapName(desktopFilePath);
      if (snapName)
        return {type: PackageType.SNAP, identifier: snapName};
    }

    const aptPkg = await this._detectApt(desktopFilePath);
    if (aptPkg)
      return {type: PackageType.APT, identifier: aptPkg};

    const rpmPkg = await this._detectRpm(desktopFilePath);
    if (rpmPkg) {
      const hasDnf = GLib.find_program_in_path('dnf') !== null;
      return {
        type: hasDnf ? PackageType.DNF : PackageType.RPM,
        identifier: rpmPkg,
      };
    }

    return {type: PackageType.UNKNOWN, identifier: null};
  }

  async _detectFlatpak(appId, desktopPath) {
    if (desktopPath.includes('/flatpak/') ||
        desktopPath.includes('/.local/share/flatpak/')) {
      if (!appId)
        return null;
      return appId.replace(/\.desktop$/, '');
    }

    if (!appId || GLib.find_program_in_path('flatpak') === null)
      return null;

    const ref = appId.replace(/\.desktop$/, '');
    const result = await this._runAsync(['flatpak', 'info', '--show-ref', ref]);
    if (result.ok && result.status === 0)
      return ref;

    return null;
  }

  _extractSnapName(desktopPath) {
    const match = desktopPath.match(/\/snap\/([^/]+)\//);
    return match ? match[1] : null;
  }

  async _detectApt(desktopPath) {
    if (GLib.find_program_in_path('dpkg') === null)
      return null;

    const result = await this._runAsync(['dpkg', '-S', desktopPath]);
    if (!result.ok || result.status !== 0 || !result.stdout)
      return null;

    const firstLine = result.stdout.split('\n')[0].trim();
    if (!firstLine.includes(':'))
      return null;

    return firstLine.split(':')[0].trim() || null;
  }

  async _detectRpm(desktopPath) {
    if (GLib.find_program_in_path('rpm') === null)
      return null;

    const result = await this._runAsync([
      'rpm',
      '-qf',
      desktopPath,
      '--queryformat',
      '%{NAME}',
    ]);
    if (!result.ok || result.status !== 0 || !result.stdout)
      return null;

    return result.stdout.trim() || null;
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
