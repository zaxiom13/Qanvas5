const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DEFAULT_SKETCH } = require('../shared/catalog-data.js');

test('default sketch loads in q without syntax error', () => {
  const sketchPath = path.join(os.tmpdir(), `qanvas5-default-${Date.now()}.q`);
  require('node:fs').writeFileSync(sketchPath, `${DEFAULT_SKETCH}\n`, 'utf8');

  const res =
    process.platform === 'win32'
      ? spawnSync('wsl.exe', ['bash', '-ic', `q -q "${sketchPath.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, d) => `/mnt/${d.toLowerCase()}`)}"`], {
          encoding: 'utf8'
        })
      : spawnSync('q', ['-q', sketchPath], { encoding: 'utf8' });

  assert.equal(
    res.status,
    0,
    `Expected q to load sketch successfully.\nstdout:\n${res.stdout}\nstderr:\n${res.stderr}`
  );
});
