(function (globalScope) {
  function normalizeTextArgs(args) {
    if (!Array.isArray(args) || args.length === 0) {
      return args;
    }
    if (!Array.isArray(args[0])) {
      return args;
    }

    const text = args[0]
      .map((part) => (part == null ? '' : String(part)))
      .join('');
    return [text, ...args.slice(1)];
  }

  function normalizeCommands(raw) {
    if (!Array.isArray(raw)) {
      return [];
    }
    if (raw.length > 0 && typeof raw[0] === 'string') {
      return [raw];
    }
    return raw;
  }

  function createPreviewHub({
    refs,
    state,
    catalog,
    consoleHub,
    viewHub,
    runtimeHub,
    runtimeStatusApi,
    desktopApi
  }) {
    function paintFps(reading) {
      if (!refs.fpsOverlayEl || !state.showFpsOverlay) {
        return;
      }
      refs.fpsOverlayEl.textContent = `FPS ${Math.round(reading)}`;
    }

    function updateFpsOverlay(sketch) {
      const now = performance.now();
      const measured = Number(sketch.frameRate()) || 0;
      if (measured > 0) {
        state.fpsSampleCount += 1;
        state.fpsDisplayValue += (measured - state.fpsDisplayValue) / Math.min(state.fpsSampleCount, 12);
      }
      if (now - state.fpsLastPaintAt < 250) {
        return;
      }
      state.fpsLastPaintAt = now;
      paintFps(state.fpsDisplayValue || measured || 0);
    }

    function send(msg) {
      if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
        consoleHub.log('Socket not connected yet');
        return false;
      }
      state.ws.send(JSON.stringify(msg));
      return true;
    }

    state.runGate = globalScope.createRunGate((payload) => send({ type: 'run', ...payload }));

    function resetSketchSession() {
      state.sketchRunning = false;
      state.awaitingFrame = false;
      state.activeCommands = [];
      state.setupApplied = false;
      viewHub.setPreviewLiveState(false);
    }

    function connect() {
      state.ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);

      state.ws.addEventListener('open', () => consoleHub.setStatus('Connected'));
      state.ws.addEventListener('close', () => {
        consoleHub.setStatus('Disconnected - retrying');
        state.runGate.cancelRun();
        setTimeout(connect, 1000);
      });

      state.ws.addEventListener('message', (event) => {
        const msg = JSON.parse(event.data);

        if (msg.type === 'runResult') {
          state.setupApplied = true;
          state.activeCommands = [];
          applyCommands(msg.setup || []);
          state.sketchRunning = true;
          viewHub.setPreviewLiveState(true);
          if (!desktopApi?.getRuntimeStatus && runtimeStatusApi?.inferRuntimeStatusFromSketch) {
            runtimeHub.renderRuntimeStatus(runtimeStatusApi.inferRuntimeStatusFromSketch(state.runtimeStatus));
          }
          state.runGate.resolveRun();
          consoleHub.log('Sketch started');
        }

        if (msg.type === 'stepResult') {
          state.awaitingFrame = false;
          state.activeCommands = msg.commands || [];
        }

        if (msg.type === 'stdout') {
          consoleHub.log(String(msg.line || ''));
        }

        if (msg.type === 'runtimeError' || msg.type === 'serverError') {
          resetSketchSession();
          state.runGate.resolveRun();
          const detail = String(msg.message || '').trim();
          consoleHub.logRuntimeError(detail || 'Error', msg.trace || '');
        }

        if (msg.type === 'stopped') {
          resetSketchSession();
          consoleHub.log('Sketch stopped');
        }
      });
    }

    function toMouseButtonName(btn) {
      if (btn === 'left' || (typeof LEFT !== 'undefined' && btn === LEFT)) {
        return 'left';
      }
      if (btn === 'right' || (typeof RIGHT !== 'undefined' && btn === RIGHT)) {
        return 'right';
      }
      if (btn === 'center' || (typeof CENTER !== 'undefined' && btn === CENTER)) {
        return 'center';
      }
      return 'none';
    }

    function isCanvasEvent(event) {
      if (!state.canvasEl || !event) {
        return false;
      }
      if (event.target instanceof Node && state.canvasEl.contains(event.target)) {
        return true;
      }
      const { clientX, clientY } = event;
      if (typeof clientX !== 'number' || typeof clientY !== 'number') {
        return false;
      }
      const rect = state.canvasEl.getBoundingClientRect();
      return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
    }

    function getInputWireSnapshot() {
      state.inputState.ts = Date.now();
      const payload = [];
      payload[catalog.INPUT_WIRE_FIELDS.mx] = Number(state.inputState.mx) || 0;
      payload[catalog.INPUT_WIRE_FIELDS.my] = Number(state.inputState.my) || 0;
      payload[catalog.INPUT_WIRE_FIELDS.pmx] = Number(state.inputState.pmx) || 0;
      payload[catalog.INPUT_WIRE_FIELDS.pmy] = Number(state.inputState.pmy) || 0;
      payload[catalog.INPUT_WIRE_FIELDS.mousePressed] = Boolean(state.inputState.mousePressed);
      payload[catalog.INPUT_WIRE_FIELDS.mouseButton] = state.inputState.mouseButton || 'none';
      payload[catalog.INPUT_WIRE_FIELDS.keysDown] = Array.from(state.keysDown);
      payload[catalog.INPUT_WIRE_FIELDS.key] = state.inputState.key || '';
      payload[catalog.INPUT_WIRE_FIELDS.keyCode] = Number(state.inputState.keyCode) || 0;
      payload[catalog.INPUT_WIRE_FIELDS.keyPressed] = Boolean(state.inputState.keyPressed);
      payload[catalog.INPUT_WIRE_FIELDS.keyReleased] = Boolean(state.inputState.keyReleased);
      payload[catalog.INPUT_WIRE_FIELDS.wheelDelta] = Number(state.inputState.wheelDelta) || 0;
      payload[catalog.INPUT_WIRE_FIELDS.ts] = Number(state.inputState.ts) || Date.now();
      return payload;
    }

    function getDocumentWireSnapshot() {
      const docEl = document.documentElement;
      const body = document.body;
      const docWidth = Math.max(
        docEl ? docEl.scrollWidth : 0,
        docEl ? docEl.clientWidth : 0,
        body ? body.scrollWidth : 0,
        body ? body.clientWidth : 0
      );
      const docHeight = Math.max(
        docEl ? docEl.scrollHeight : 0,
        docEl ? docEl.clientHeight : 0,
        body ? body.scrollHeight : 0,
        body ? body.clientHeight : 0
      );

      const sketch = state.p5Instance;
      const payload = [];
      payload[catalog.DOCUMENT_WIRE_FIELDS.cw] = Number(sketch?.width) || 0;
      payload[catalog.DOCUMENT_WIRE_FIELDS.ch] = Number(sketch?.height) || 0;
      payload[catalog.DOCUMENT_WIRE_FIELDS.vw] = Number(window.innerWidth) || 0;
      payload[catalog.DOCUMENT_WIRE_FIELDS.vh] = Number(window.innerHeight) || 0;
      payload[catalog.DOCUMENT_WIRE_FIELDS.dw] = Number(docWidth) || 0;
      payload[catalog.DOCUMENT_WIRE_FIELDS.dh] = Number(docHeight) || 0;
      payload[catalog.DOCUMENT_WIRE_FIELDS.sx] = Number(window.scrollX) || 0;
      payload[catalog.DOCUMENT_WIRE_FIELDS.sy] = Number(window.scrollY) || 0;
      payload[catalog.DOCUMENT_WIRE_FIELDS.dpr] = Number(window.devicePixelRatio) || 1;
      payload[catalog.DOCUMENT_WIRE_FIELDS.ts] = Date.now();
      return payload;
    }

    function clearInputFrameEdges() {
      state.inputState.keyPressed = false;
      state.inputState.keyReleased = false;
      state.inputState.wheelDelta = 0;
    }

    function applyCommands(commands) {
      const sketch = state.p5Instance;
      for (const command of normalizeCommands(commands)) {
        if (!Array.isArray(command) || command.length === 0) {
          continue;
        }

        const [fnName, ...args] = command;
        const fn = sketch?.[fnName];
        const safeArgs = fnName === 'text' ? normalizeTextArgs(args) : args;

        if (typeof fn === 'function') {
          try {
            fn.apply(sketch, safeArgs);
          } catch (err) {
            consoleHub.log(`Command failed (${fnName}): ${err.message}`);
          }
        }
      }
    }

    function initPreviewSketch() {
      new p5((sketch) => {
        state.p5Instance = sketch;

        sketch.setup = () => {
          const renderer = sketch.createCanvas(640, 360);
          state.canvasEl = renderer.elt;
          sketch.background(230);
          viewHub.syncFpsOverlay();
          paintFps(0);
        };

        sketch.draw = () => {
          if (!state.setupApplied) {
            return;
          }

          const pointerInsideCanvas =
            sketch.mouseX >= 0 &&
            sketch.mouseX < sketch.width &&
            sketch.mouseY >= 0 &&
            sketch.mouseY < sketch.height;

          state.inputState.pmx = state.inputState.mx;
          state.inputState.pmy = state.inputState.my;
          if (pointerInsideCanvas) {
            state.inputState.mx = sketch.mouseX;
            state.inputState.my = sketch.mouseY;
            state.inputState.mousePressed = sketch.mouseIsPressed;
            state.inputState.mouseButton = sketch.mouseIsPressed ? toMouseButtonName(sketch.mouseButton) : 'none';
          } else {
            state.inputState.mousePressed = false;
            state.inputState.mouseButton = 'none';
          }

          applyCommands(state.activeCommands);
          updateFpsOverlay(sketch);

          if (state.sketchRunning && !state.awaitingFrame && state.ws && state.ws.readyState === WebSocket.OPEN) {
            state.awaitingFrame = true;
            const sent = send({
              type: 'step',
              input: getInputWireSnapshot(),
              document: getDocumentWireSnapshot()
            });
            if (sent) {
              clearInputFrameEdges();
            }
          }
        };
      }, 'canvasHost');
    }

    return {
      connect,
      send,
      resetSketchSession,
      toMouseButtonName,
      isCanvasEvent,
      getInputWireSnapshot,
      getDocumentWireSnapshot,
      clearInputFrameEdges,
      applyCommands,
      initPreviewSketch
    };
  }

  const api = {
    createPreviewHub,
    normalizeTextArgs,
    normalizeCommands
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  globalScope.Qanvas5App = globalScope.Qanvas5App || {};
  globalScope.Qanvas5App.preview = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
