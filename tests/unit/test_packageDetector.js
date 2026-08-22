import {PackageDetector, PackageType} from '../../extension/packageDetector.js';
import {assertEqual, runAsyncTest} from './testlib.js';

function fakeApp(id, filename, commandline = '') {
  return {
    get_id: () => id,
    get_app_info: () => ({
      get_filename: () => filename,
      get_commandline: () => commandline,
    }),
  };
}

export async function run() {
  const tests = [];
  const detector = new PackageDetector();

  tests.push(await runAsyncTest('detects Flatpak from desktop path', async () => {
    const app = fakeApp(
      'org.gnome.Calculator.desktop',
      '/var/lib/flatpak/app/org.gnome.Calculator/current/active/export/share/applications/org.gnome.Calculator.desktop'
    );
    const result = await detector.detect(app);
    assertEqual(result.type, PackageType.FLATPAK);
    assertEqual(result.identifier, 'org.gnome.Calculator');
    assertEqual(result.scope, 'system');
  }));

  tests.push(await runAsyncTest('detects user-level Flatpak', async () => {
    const app = fakeApp(
      'org.mozilla.firefox.desktop',
      '/home/user/.local/share/flatpak/exports/share/applications/org.mozilla.firefox.desktop'
    );
    const result = await detector.detect(app);
    assertEqual(result.type, PackageType.FLATPAK);
    assertEqual(result.identifier, 'org.mozilla.firefox');
    assertEqual(result.scope, 'user');
  }));

  tests.push(await runAsyncTest('detects Snap from /snap/ desktop path', async () => {
    const app = fakeApp(
      'spotify_spotify.desktop',
      '/snap/spotify/current/meta/gui/spotify.desktop'
    );
    const result = await detector.detect(app);
    assertEqual(result.type, PackageType.SNAP);
    assertEqual(result.identifier, 'spotify');
  }));

  tests.push(await runAsyncTest('detects Snap from /var/lib/snapd/ path (Android Studio)', async () => {
    const app = fakeApp(
      'android-studio_android-studio.desktop',
      '/var/lib/snapd/desktop/applications/android-studio_android-studio.desktop',
      '/snap/bin/android-studio %f'
    );
    const result = await detector.detect(app);
    assertEqual(result.type, PackageType.SNAP);
    assertEqual(result.identifier, 'android-studio');
  }));

  tests.push(await runAsyncTest('detects Snap from /var/lib/snapd/ path (AdGuard Home)', async () => {
    const app = fakeApp(
      'adguard-home_adguard-home-web.desktop',
      '/var/lib/snapd/desktop/applications/adguard-home_adguard-home-web.desktop',
      '/snap/bin/adguard-home.adguard-home-web'
    );
    const result = await detector.detect(app);
    assertEqual(result.type, PackageType.SNAP);
    assertEqual(result.identifier, 'adguard-home');
  }));

  tests.push(await runAsyncTest('detects Snap from Exec line fallback', async () => {
    const app = fakeApp(
      'custom-snap.desktop',
      '/usr/share/applications/custom-snap.desktop',
      'snap run vlc'
    );
    const result = await detector.detect(app);
    assertEqual(result.type, PackageType.SNAP);
    assertEqual(result.identifier, 'vlc');
  }));

  tests.push(await runAsyncTest('detects AppImage from Exec path', async () => {
    const app = fakeApp(
      'appimagekit_obsidian.desktop',
      '/home/user/.local/share/applications/appimagekit_obsidian.desktop',
      '/home/user/Applications/Obsidian-1.5.12.AppImage --no-sandbox'
    );
    const result = await detector.detect(app);
    assertEqual(result.type, PackageType.APPIMAGE);
    assertEqual(result.details.binaryPath, '/home/user/Applications/Obsidian-1.5.12.AppImage');
  }));

  tests.push(await runAsyncTest('detects Web App (PWA) from Chrome', async () => {
    const app = fakeApp(
      'chrome-hnpfjngllnobngcgfapefoaidbinmjnm-Default.desktop',
      '/home/user/.local/share/applications/chrome-hnpfjngllnobngcgfapefoaidbinmjnm-Default.desktop',
      '/usr/bin/google-chrome-stable --app-id=hnpfjngllnobngcgfapefoaidbinmjnm'
    );
    const result = await detector.detect(app);
    assertEqual(result.type, PackageType.WEBAPP);
    assertEqual(result.identifier, 'hnpfjngllnobngcgfapefoaidbinmjnm');
  }));

  tests.push(await runAsyncTest('detects Steam game from desktop ID', async () => {
    const app = fakeApp(
      'steam_app_730.desktop',
      '/home/user/.local/share/applications/steam_app_730.desktop',
      'steam steam://rungameid/730'
    );
    const result = await detector.detect(app);
    assertEqual(result.type, PackageType.STEAM);
    assertEqual(result.identifier, '730');
  }));

  tests.push(await runAsyncTest('detects Pipx application', async () => {
    const app = fakeApp(
      'black.desktop',
      '/home/user/.local/share/applications/black.desktop',
      '/home/user/.local/pipx/venvs/black/bin/black'
    );
    const result = await detector.detect(app);
    assertEqual(result.type, PackageType.PIPX);
    assertEqual(result.identifier, 'black');
  }));

  tests.push(await runAsyncTest('detects Homebrew application', async () => {
    const app = fakeApp(
      'htop.desktop',
      '/home/linuxbrew/.linuxbrew/share/applications/htop.desktop',
      '/home/linuxbrew/.linuxbrew/bin/htop'
    );
    const result = await detector.detect(app);
    assertEqual(result.type, PackageType.HOMEBREW);
  }));

  tests.push(await runAsyncTest('returns unknown on missing app info', async () => {
    const app = {get_id: () => 'x.desktop', get_app_info: () => null};
    const result = await detector.detect(app);
    assertEqual(result.type, PackageType.UNKNOWN);
    assertEqual(result.identifier, null);
  }));

  return tests;
}
