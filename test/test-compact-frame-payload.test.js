const test = require('node:test');

function buildLegacyStepPayload() {
  return {
    type: 'step',
    input: {
      m: [412.25, 238.5],
      pm: [406.75, 236.25],
      mx: 412.25,
      my: 238.5,
      pmx: 406.75,
      pmy: 236.25,
      mousePressed: true,
      mouseButton: 'left',
      keysDown: ['shift', 'a'],
      key: 'a',
      keyCode: 65,
      keyPressed: true,
      keyReleased: false,
      wheelDelta: -12,
      ts: 1700000000123
    },
    document: {
      c: [720, 420],
      v: [1440, 900],
      d: [1440, 2400],
      s: [0, 640],
      cw: 720,
      ch: 420,
      vw: 1440,
      vh: 900,
      dw: 1440,
      dh: 2400,
      sx: 0,
      sy: 640,
      dpr: 2,
      ts: 1700000000124
    }
  };
}

function buildCompactStepPayload() {
  return {
    type: 'step',
    input: [412.25, 238.5, 406.75, 236.25, true, 'left', ['shift', 'a'], 'a', 65, true, false, -12, 1700000000123],
    document: [720, 420, 1440, 900, 1440, 2400, 0, 640, 2, 1700000000124]
  };
}

function measureStringifyMs(factory, iterations) {
  const startedAt = process.hrtime.bigint();
  for (let i = 0; i < iterations; i += 1) {
    JSON.stringify(factory());
  }
  const elapsedNs = process.hrtime.bigint() - startedAt;
  return Number(elapsedNs) / 1e6;
}

test('report compact frame websocket payload savings', (t) => {
  const legacyJson = JSON.stringify(buildLegacyStepPayload());
  const compactJson = JSON.stringify(buildCompactStepPayload());
  const savedBytes = Buffer.byteLength(legacyJson) - Buffer.byteLength(compactJson);
  const savedPct = (savedBytes / Buffer.byteLength(legacyJson)) * 100;

  t.diagnostic(`legacy frame payload bytes: ${Buffer.byteLength(legacyJson)}`);
  t.diagnostic(`compact frame payload bytes: ${Buffer.byteLength(compactJson)}`);
  t.diagnostic(`bytes saved per frame: ${savedBytes} (${savedPct.toFixed(1)}%)`);
});

test('report compact frame websocket stringify cost over 100k iterations', (t) => {
  const iterations = 100000;
  const legacyMs = measureStringifyMs(buildLegacyStepPayload, iterations);
  const compactMs = measureStringifyMs(buildCompactStepPayload, iterations);
  const speedup = legacyMs > 0 ? legacyMs / compactMs : 0;

  t.diagnostic(`legacy stringify ${iterations}x: ${legacyMs.toFixed(2)}ms`);
  t.diagnostic(`compact stringify ${iterations}x: ${compactMs.toFixed(2)}ms`);
  t.diagnostic(`relative stringify speedup: ${speedup.toFixed(2)}x`);
});
