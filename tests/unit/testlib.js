export function assertTrue(condition, message) {
  if (!condition)
    throw new Error(message ?? 'Expected condition to be true');
}

export function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      message ?? `Expected ${String(expected)}, got ${String(actual)}`
    );
  }
}

export function runTest(name, fn) {
  try {
    fn();
    print(`PASS ${name}`);
    return {name, ok: true};
  } catch (error) {
    printerr(`FAIL ${name}: ${error.message}`);
    return {name, ok: false, error};
  }
}

export async function runAsyncTest(name, fn) {
  try {
    await fn();
    print(`PASS ${name}`);
    return {name, ok: true};
  } catch (error) {
    printerr(`FAIL ${name}: ${error.message}`);
    return {name, ok: false, error};
  }
}
