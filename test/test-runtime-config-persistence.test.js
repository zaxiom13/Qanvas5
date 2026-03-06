const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const {
  loadRuntimeConfig,
  resolveAndPersistRuntime
} = require('../electron/runtime-config');

test('resolveAndPersistRuntime saves a working unix q binary for later runs', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'p5q-runtime-config-'));
  const userDataPath = path.join(tmpRoot, 'user-data');
  const fakeQ = path.join(tmpRoot, 'q');
  const originalEnv = process.env.P5Q_Q_BIN;

  try {
    await fs.writeFile(fakeQ, '#!/bin/sh\nexit 0\n', { mode: 0o755 });
    process.env.P5Q_Q_BIN = fakeQ;

    const status = await resolveAndPersistRuntime(userDataPath, 'darwin');
    const saved = await loadRuntimeConfig(userDataPath);

    assert.equal(status.configured, true);
    assert.equal(status.resolvedPath, fakeQ);
    assert.equal(saved.qBinary, fakeQ);
  } finally {
    if (originalEnv === undefined) {
      delete process.env.P5Q_Q_BIN;
    } else {
      process.env.P5Q_Q_BIN = originalEnv;
    }
    await fs.rm(tmpRoot, { recursive: true, force: true });
  }
});
