import {run as runPackageDetectorTests} from './test_packageDetector.js';
import {run as runSystemAppGuardTests} from './test_systemAppGuard.js';
import {run as runUninstallManagerTests} from './test_uninstallManager.js';

function summarize(results) {
  const total = results.length;
  const failed = results.filter(r => !r.ok).length;
  const passed = total - failed;

  print(`\nTest summary: ${passed}/${total} passed, ${failed} failed`);
  if (failed > 0)
    return 1;
  return 0;
}

const uninstallManagerResults = await runUninstallManagerTests();
const packageDetectorResults = await runPackageDetectorTests();
const systemAppGuardResults = runSystemAppGuardTests();

const results = [
  ...packageDetectorResults,
  ...systemAppGuardResults,
  ...uninstallManagerResults,
];

const code = summarize(results);
if (code !== 0)
  throw new Error('Unit tests failed');
