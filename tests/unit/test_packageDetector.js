import {PackageDetector, PackageType} from '../../extension/packageDetector.js';
import {assertEqual, runAsyncTest} from './testlib.js';

function fakeApp(id, filename) {
  return {
    get_id: () => id,
    get_app_info: () => ({
      get_filename: () => filename,
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

  tests.push(await runAsyncTest('returns unknown on missing app info', async () => {
    const app = {get_id: () => 'x.desktop', get_app_info: () => null};
    const result = await detector.detect(app);
    assertEqual(result.type, PackageType.UNKNOWN);
    assertEqual(result.identifier, null);
  }));

  return tests;
}
