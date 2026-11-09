import {UninstallManager} from '../../extension/uninstallManager.js';
import {PackageType} from '../../extension/packageDetector.js';
import {assertEqual, assertTrue, runAsyncTest} from './testlib.js';

function fakeApp(name = 'Test App') {
  return {
    get_name: () => name,
    get_id: () => 'test.app.desktop',
    get_app_info: () => ({
      get_filename: () => '/tmp/test.desktop',
      should_show: () => true,
    }),
  };
}

export async function run() {
  const tests = [];

  const fakeNotification = () => {
    const notification = {
      progressCalls: 0,
      successCalls: 0,
      errorCalls: 0,
      showProgress: () => {
        notification.progressCalls++;
      },
      showSuccess: () => {
        notification.successCalls++;
      },
      showError: () => {
        notification.errorCalls++;
      },
      destroy: () => {},
    };

    return notification;
  };

  function fakeSettings(entries = {}) {
    return {
      get_boolean: key => {
        if (Object.prototype.hasOwnProperty.call(entries, key))
          return entries[key];
        return true;
      },
      get_strv: () => [],
    };
  }

  class UnprotectedGuard {
    isProtected() {
      return false;
    }
  }

  class ProtectedGuard {
    isProtected() {
      return true;
    }
  }

  function detectorFor(result) {
    return class {
      async detect() {
        return result;
      }
    };
  }

  tests.push(await runAsyncTest('shows error when package type is unknown', async () => {
    const notification = {
      showError: () => {
        notification.errorCalled = true;
      },
      showProgress: () => {},
      showSuccess: () => {},
      destroy: () => {},
      errorCalled: false,
    };

    const manager = new UninstallManager(null, fakeApp('Unknown App'), {
      settings: fakeSettings(),
      notification,
      DetectorClass: detectorFor({type: PackageType.UNKNOWN, identifier: null}),
      GuardClass: UnprotectedGuard,
    });
    let errorCalled = false;
    notification.showError = () => {
      errorCalled = true;
    };

    await manager.startUninstall();

    assertTrue(errorCalled, 'Expected error notification for unknown package type');
  }));

  tests.push(await runAsyncTest('skips dialog when confirmation is disabled', async () => {
    const manager = new UninstallManager(null, fakeApp('Flatpak App'), {
      settings: fakeSettings({
        'show-confirmation-dialog': false,
      }),
      notification: fakeNotification(),
      DetectorClass: detectorFor({type: PackageType.FLATPAK, identifier: 'org.example.App'}),
      GuardClass: UnprotectedGuard,
    });

    let called = false;
    manager._performUninstall = () => { called = true; };

    await manager.startUninstall();

    assertEqual(called, true);
  }));

  tests.push(await runAsyncTest('uses confirm dialog path when enabled', async () => {
    const manager = new UninstallManager(null, fakeApp('Flatpak App'), {
      settings: fakeSettings({
        'show-confirmation-dialog': true,
      }),
      notification: fakeNotification(),
      DetectorClass: detectorFor({type: PackageType.FLATPAK, identifier: 'org.example.App'}),
      GuardClass: UnprotectedGuard,
      createConfirmDialog: (_app, _pkg, onConfirm) => ({
        open: () => {
          if (typeof onConfirm === 'function')
            onConfirm();
        },
      }),
    });

    let called = false;
    manager._performUninstall = () => { called = true; };

    await manager.startUninstall();

    assertTrue(called, 'Expected confirm callback to trigger uninstall');
  }));

  tests.push(await runAsyncTest('respects package-type enable settings', async () => {
    let errorCalled = false;

    const manager = new UninstallManager(null, fakeApp('Snap App'), {
      settings: fakeSettings({
        'enable-for-snap': false,
      }),
      notification: {
        showError: () => {
          errorCalled = true;
        },
        showProgress: () => {},
        showSuccess: () => {},
        destroy: () => {},
      },
      DetectorClass: detectorFor({type: PackageType.SNAP, identifier: 'spotify'}),
      GuardClass: UnprotectedGuard,
    });

    let uninstallCalled = false;
    manager._performUninstall = () => { uninstallCalled = true; };

    await manager.startUninstall();

    assertTrue(errorCalled, 'Expected disabled package type to emit an error');
    assertEqual(uninstallCalled, false);
  }));

  tests.push(await runAsyncTest('shows warning flow for protected apps', async () => {
    let warningDialogOpened = false;

    const manager = new UninstallManager(null, fakeApp('System App'), {
      settings: fakeSettings(),
      notification: fakeNotification(),
      DetectorClass: detectorFor({type: PackageType.FLATPAK, identifier: 'org.example.App'}),
      GuardClass: ProtectedGuard,
      createConfirmDialog: (_app, _pkg, _onConfirm, options) => ({
        open: () => {
          warningDialogOpened = options.warningMode === true;
        },
      }),
    });

    let uninstallCalled = false;
    manager._performUninstall = () => {
      uninstallCalled = true;
    };

    await manager.startUninstall();

    assertEqual(uninstallCalled, false);
    assertTrue(warningDialogOpened, 'Expected protected app warning dialog to open');
  }));

  tests.push(await runAsyncTest('dispatches AppImage uninstallation', async () => {
    const manager = new UninstallManager(null, fakeApp('AppImage App'), {
      settings: fakeSettings(),
      notification: fakeNotification(),
      DetectorClass: detectorFor({type: PackageType.APPIMAGE, identifier: 'app.AppImage', details: {}}),
      GuardClass: UnprotectedGuard,
    });

    let appImageUninstalled = false;
    manager._uninstallAppImage = () => {
      appImageUninstalled = true;
    };

    manager._performUninstall({type: PackageType.APPIMAGE, identifier: 'app.AppImage'});
    assertTrue(appImageUninstalled, 'Expected AppImage uninstall routine to run');
  }));

  tests.push(await runAsyncTest('dispatches Web App uninstallation', async () => {
    const manager = new UninstallManager(null, fakeApp('Web App'), {
      settings: fakeSettings(),
      notification: fakeNotification(),
      DetectorClass: detectorFor({type: PackageType.WEBAPP, identifier: 'pwa-id', details: {}}),
      GuardClass: UnprotectedGuard,
    });

    let webAppUninstalled = false;
    manager._uninstallWebApp = () => {
      webAppUninstalled = true;
    };

    manager._performUninstall({type: PackageType.WEBAPP, identifier: 'pwa-id'});
    assertTrue(webAppUninstalled, 'Expected WebApp uninstall routine to run');
  }));

  tests.push(await runAsyncTest('dispatches Pacman uninstallation', async () => {
    const manager = new UninstallManager(null, fakeApp('Arch App'), {
      settings: fakeSettings(),
      notification: fakeNotification(),
      DetectorClass: detectorFor({type: PackageType.PACMAN, identifier: 'arch-pkg'}),
      GuardClass: UnprotectedGuard,
    });

    let pacmanUninstalled = false;
    manager._uninstallPacman = () => {
      pacmanUninstalled = true;
    };

    manager._performUninstall({type: PackageType.PACMAN, identifier: 'arch-pkg'});
    assertTrue(pacmanUninstalled, 'Expected Pacman uninstall routine to run');
  }));

  tests.push(await runAsyncTest('dispatches Nix uninstallation', async () => {
    const manager = new UninstallManager(null, fakeApp('Nix App'), {
      settings: fakeSettings(),
      notification: fakeNotification(),
      DetectorClass: detectorFor({type: PackageType.NIX, identifier: 'nix-pkg'}),
      GuardClass: UnprotectedGuard,
    });

    let nixUninstalled = false;
    manager._uninstallNix = () => {
      nixUninstalled = true;
    };

    manager._performUninstall({type: PackageType.NIX, identifier: 'nix-pkg'});
    assertTrue(nixUninstalled, 'Expected Nix uninstall routine to run');
  }));

  tests.push(await runAsyncTest('dispatches Custom standalone uninstallation', async () => {
    const manager = new UninstallManager(null, fakeApp('Custom App'), {
      settings: fakeSettings(),
      notification: fakeNotification(),
      DetectorClass: detectorFor({
        type: PackageType.CUSTOM,
        identifier: 'my-custom-app',
        details: {isUserLevel: false, installDir: '/opt/my-custom-app'},
      }),
      GuardClass: UnprotectedGuard,
    });

    let customUninstalled = false;
    manager._uninstallCustom = () => {
      customUninstalled = true;
    };

    manager._performUninstall({
      type: PackageType.CUSTOM,
      identifier: 'my-custom-app',
      details: {isUserLevel: false, installDir: '/opt/my-custom-app'},
    });
    assertTrue(customUninstalled, 'Expected Custom uninstall routine to run');
  }));

  return tests;
}
