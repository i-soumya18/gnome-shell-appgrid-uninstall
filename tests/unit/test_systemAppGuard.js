import {SystemAppGuard} from '../../extension/systemAppGuard.js';
import {assertEqual, assertTrue, runTest} from './testlib.js';

function fakeApp(id, filename, shouldShow = true) {
  return {
    get_id: () => id,
    get_app_info: () => ({
      get_filename: () => filename,
      should_show: () => shouldShow,
    }),
  };
}

export function run() {
  const tests = [];
  const guard = new SystemAppGuard();

  tests.push(runTest('protects known critical app IDs', () => {
    const protectedApp = fakeApp('org.gnome.Settings.desktop', '/usr/share/applications/org.gnome.Settings.desktop');
    assertTrue(guard.isProtected(protectedApp));
  }));

  tests.push(runTest('protects hidden service apps', () => {
    const hiddenApp = fakeApp('com.example.Hidden.desktop', '/usr/share/applications/hidden.desktop', false);
    assertTrue(guard.isProtected(hiddenApp));
  }));

  tests.push(runTest('does not protect regular app by default', () => {
    const normalApp = fakeApp('org.gnome.Calculator.desktop', '/usr/share/applications/org.gnome.Calculator.desktop', true);
    assertEqual(guard.isProtected(normalApp), false);
  }));

  tests.push(runTest('protects apps configured in blocked-apps settings', () => {
    const guardWithSettings = new SystemAppGuard({
      get_strv: () => ['org.gnome.Calculator.desktop'],
    });

    const app = fakeApp('org.gnome.Calculator.desktop', '/usr/share/applications/org.gnome.Calculator.desktop', true);
    assertTrue(guardWithSettings.isProtected(app));
  }));

  tests.push(runTest('validates directory safety correctly', () => {
    // Root and system hierarchies must be rejected
    assertEqual(SystemAppGuard.isSafeDirectoryToDelete('/'), false);
    assertEqual(SystemAppGuard.isSafeDirectoryToDelete('/opt'), false);
    assertEqual(SystemAppGuard.isSafeDirectoryToDelete('/opt/'), false);
    assertEqual(SystemAppGuard.isSafeDirectoryToDelete('/usr'), false);
    assertEqual(SystemAppGuard.isSafeDirectoryToDelete('/usr/bin'), false);
    assertEqual(SystemAppGuard.isSafeDirectoryToDelete('/usr/share/applications'), false);

    // Dedicated valid subdirectories in /opt/ must be allowed
    assertEqual(SystemAppGuard.isSafeDirectoryToDelete('/opt/antigravity-ide'), true);
    assertEqual(SystemAppGuard.isSafeDirectoryToDelete('/opt/my-app/'), true);
  }));

  return tests;
}
