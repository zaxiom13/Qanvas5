// @ts-nocheck
const globalScope = typeof globalThis !== 'undefined' ? globalThis : window;

  function createDefaultWorkspace(catalog, clone) {
    return clone(catalog.EXAMPLES[0].workspace);
  }

  function createAppState(catalog, clone) {
    return {
      monacoEditor: null,
      ws: null,
      runGate: null,
      p5Instance: null,
      sketchRunning: false,
      awaitingFrame: false,
      activeCommands: [],
      setupApplied: false,
      canvasEl: null,
      showFpsOverlay: true,
      fpsDisplayValue: 0,
      fpsSampleCount: 0,
      fpsLastPaintAt: 0,
      runtimeStatus: null,
      updateState: null,
      currentSketchId: null,
      savedSketches: [],
      walkthroughSeen: false,
      appStateLoaded: false,
      persistAppStateTimer: null,
      sketchDialogState: null,
      walkthroughState: {
        active: false,
        index: 0
      },
      keysDown: new Set(),
      inputState: {
        mx: 0,
        my: 0,
        pmx: 0,
        pmy: 0,
        mousePressed: false,
        mouseButton: 'none',
        key: '',
        keyCode: 0,
        keyPressed: false,
        keyReleased: false,
        wheelDelta: 0,
        ts: Date.now()
      },
      workspace: createDefaultWorkspace(catalog, clone)
    };
  }

  const api = { createAppState, createDefaultWorkspace };

  globalScope.Qanvas5App = globalScope.Qanvas5App || {};
  globalScope.Qanvas5App.state = api;

export default api;
