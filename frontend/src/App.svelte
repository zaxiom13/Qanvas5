<script lang="ts">
  import { onMount } from "svelte";
  import catalog from "../../shared/catalog-data.ts";
  import { configureMonacoQ } from "./lib/monaco-q";
  import type {
    Workspace,
    SketchTab,
    SavedSketch,
    AppSnapshot,
    CatalogData,
    ConsoleEntry,
    RuntimeStatus,
    UpdateState
  } from "./types.ts";
  import AppHeader from "./components/AppHeader.svelte";
  import EditorSection from "./components/EditorSection.svelte";
  import PreviewSection from "./components/PreviewSection.svelte";

  // ── Type declarations ──────────────────────────────────────────────────────

  type MonacoEditor = {
    getValue: () => string;
    setValue: (value: string) => void;
    dispose: () => void;
    onDidChangeModelContent: (listener: () => void) => { dispose: () => void };
  };

  type MonacoNamespace = typeof import("monaco-editor");

  declare global {
    interface Window {
      monaco: MonacoNamespace;
      p5: new (sketch: (s: unknown) => void, host: HTMLElement) => { remove: () => void; width: number; height: number; frameRate: () => number; mouseX: number; mouseY: number; mouseIsPressed: boolean; mouseButton: unknown };
      require: { config: (cfg: unknown) => void; (deps: string[], cb: () => void): void };
      qanvas5Desktop?: {
        getRuntimeStatus?: () => Promise<RuntimeStatus>;
        autoConfigureRuntime?: () => Promise<RuntimeStatus>;
        chooseRuntimeBinary?: () => Promise<RuntimeStatus>;
        clearRuntimeBinary?: () => Promise<RuntimeStatus>;
        getUpdateState?: () => Promise<UpdateState>;
        checkForUpdates?: () => Promise<UpdateState>;
        installUpdateNow?: () => Promise<void>;
        openExternal?: (url: string) => void;
        onUpdateState?: (cb: (s: UpdateState) => void) => () => void;
      };
    }
  }

  // ── Constants ──────────────────────────────────────────────────────────────

  const appCatalog = catalog as unknown as CatalogData;
  const APP_STATE_KEY = "qanvas5:app-state:v2";
  const APP_STATE_ENDPOINT = "/app-state";
  const APP_STATE_SAVE_DELAY_MS = 250;
  const desktopApi = window.qanvas5Desktop;

  // ── DOM refs ───────────────────────────────────────────────────────────────

  let editorHost: HTMLDivElement | null = null;
  let canvasHost: HTMLDivElement | null = null;

  // ── Runtime handles ────────────────────────────────────────────────────────

  let editor: MonacoEditor | null = null;
  let editorDisposer: { dispose: () => void } | null = null;
  let previewSketch: ReturnType<typeof window.p5> | null = null;
  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let persistTimer: ReturnType<typeof setTimeout> | null = null;
  let removeUpdateListener: (() => void) | null = null;

  // ── UI state ───────────────────────────────────────────────────────────────

  let showFpsOverlay = true;
  let statusText = "Connecting...";
  let consoleEntries: ConsoleEntry[] = [];
  let workspace = cloneWorkspace(appCatalog.EXAMPLES[0].workspace);
  let savedSketches: SavedSketch[] = [];
  let currentSketchId: string | null = null;
  let runtimeStatus: RuntimeStatus | null = null;
  let showExampleTray = false;
  let updateState: UpdateState = {
    status: "idle",
    version: "-",
    availableVersion: null,
    message: "Updates have not been checked yet."
  };

  // ── Sketch session ─────────────────────────────────────────────────────────

  let appStateLoaded = false;
  let setupApplied = false;
  let sketchRunning = false;
  let awaitingFrame = false;
  let frameTick = 0;
  let canvasElement: HTMLCanvasElement | null = null;
  let previewNotice: { tone: "info" | "error"; title: string; detail: string } | null = {
    tone: "info",
    title: "Preview booting",
    detail: "Loading the canvas renderer..."
  };
  let activeCommands: unknown[] = [];
  let fpsDisplay = "FPS --";
  let fpsDisplayValue = 0;
  let fpsSampleCount = 0;
  let fpsLastPaintAt = 0;

  const keysDown = new Set<string>();
  const inputState = {
    mx: 0, my: 0, pmx: 0, pmy: 0,
    mousePressed: false, mouseButton: "none",
    key: "", keyCode: 0,
    keyPressed: false, keyReleased: false,
    wheelDelta: 0, ts: Date.now()
  };

  // ── Utilities ──────────────────────────────────────────────────────────────

  function cloneWorkspace<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
  }

  function defaultWorkspace() {
    return cloneWorkspace(appCatalog.EXAMPLES[0].workspace);
  }

  function sanitizeWorkspace(raw: unknown): Workspace {
    if (!raw || typeof raw !== "object") return defaultWorkspace();
    const incoming = raw as Partial<Workspace>;
    const tabs = Array.isArray(incoming.tabs)
      ? incoming.tabs
          .filter((tab) => Boolean(tab && typeof tab === "object"))
          .map((tab, index) => {
            const next = tab as Partial<SketchTab>;
            return {
              id: String(next.id || `tab-${index + 1}`),
              name: String(next.name || `Tab${index + 1}.q`),
              kind: (next.kind === "helper" ? "helper" : "main") as "helper" | "main",
              code: String(next.code || "")
            };
          })
      : [];
    if (tabs.length === 0) tabs.push({ id: "sketch", name: "Sketch.q", kind: "main", code: appCatalog.DEFAULT_SKETCH });
    if (!tabs.some((tab) => tab.kind === "main")) tabs.unshift({ id: "sketch", name: "Sketch.q", kind: "main", code: appCatalog.DEFAULT_SKETCH });
    let seenMain = false;
    for (const tab of tabs) {
      if (tab.kind !== "main") continue;
      if (!seenMain) { seenMain = true; continue; }
      tab.kind = "helper";
    }
    const activeTabId = tabs.some((tab) => tab.id === incoming.activeTabId)
      ? String(incoming.activeTabId)
      : tabs[0].id;
    return { activeTabId, tabs };
  }

  function sanitizeSavedSketches(raw: unknown): SavedSketch[] {
    const seen = new Set<string>();
    return (Array.isArray(raw) ? raw : [])
      .filter((item): item is Partial<SavedSketch> => Boolean(item && typeof item === "object"))
      .map((item, index) => {
        const id = String(item.id || `saved-${index + 1}`);
        if (seen.has(id)) return null;
        seen.add(id);
        return {
          id,
          name: String(item.name || `Sketch ${index + 1}`),
          workspace: sanitizeWorkspace(item.workspace),
          createdAt: Number(item.createdAt) || Date.now(),
          updatedAt: Number(item.updatedAt) || Date.now()
        };
      })
      .filter((item): item is SavedSketch => Boolean(item));
  }

  function sanitizeAppSnapshot(raw: unknown): AppSnapshot {
    const source = raw && typeof raw === "object" ? (raw as Partial<AppSnapshot>) : {};
    const sketches = sanitizeSavedSketches(source.savedSketches);
    return {
      workspace: sanitizeWorkspace(source.workspace),
      savedSketches: sketches,
      currentSketchId: sketches.some((item) => item.id === source.currentSketchId) ? String(source.currentSketchId) : null,
      showFpsOverlay: typeof source.showFpsOverlay === "boolean" ? source.showFpsOverlay : true
    };
  }

  function activeTab(): SketchTab {
    return workspace.tabs.find((tab) => tab.id === workspace.activeTabId) || workspace.tabs[0];
  }

  function mainTab(): SketchTab {
    return workspace.tabs.find((tab) => tab.kind === "main") || workspace.tabs[0];
  }

  function helperTabs() {
    return workspace.tabs.filter((tab) => tab.kind === "helper");
  }

  function currentSavedSketch() {
    return savedSketches.find((sketch) => sketch.id === currentSketchId) || null;
  }

  function currentSketchName() {
    return currentSavedSketch()?.name || "Unsaved draft";
  }

  function sourceLabel(source: string | null | undefined) {
    if (source === "saved") return "Saved selection";
    if (source === "auto") return "Auto-detected";
    if (source === "path") return "PATH";
    if (source === "wsl") return "WSL";
    if (source === "session") return "Active session";
    return "Not connected";
  }

  // ── Editor sync ────────────────────────────────────────────────────────────

  function syncEditorIntoWorkspace() {
    if (!editor) return;
    const tab = workspace.tabs.find((item) => item.id === workspace.activeTabId);
    if (tab) tab.code = editor.getValue();
  }

  function setEditorValue(value: string) {
    if (!editor) return;
    if (editor.getValue() !== value) editor.setValue(value);
  }

  // ── Persistence ────────────────────────────────────────────────────────────

  function collectSnapshot(): AppSnapshot {
    syncEditorIntoWorkspace();
    return {
      workspace: sanitizeWorkspace(cloneWorkspace(workspace)),
      savedSketches: savedSketches.map((sketch) => ({
        ...sketch,
        workspace: sanitizeWorkspace(cloneWorkspace(sketch.workspace))
      })),
      currentSketchId,
      showFpsOverlay
    };
  }

  function writeLocalSnapshot(snapshot: AppSnapshot) {
    localStorage.setItem(APP_STATE_KEY, JSON.stringify(snapshot));
  }

  async function persistSnapshot() {
    if (!appStateLoaded) return;
    const snapshot = collectSnapshot();
    writeLocalSnapshot(snapshot);
    try {
      await fetch(APP_STATE_ENDPOINT, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot)
      });
    } catch {}
  }

  function schedulePersist() {
    if (!appStateLoaded) return;
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      persistTimer = null;
      void persistSnapshot();
    }, APP_STATE_SAVE_DELAY_MS);
  }

  function persistWithBeacon() {
    if (!appStateLoaded || typeof navigator.sendBeacon !== "function") return;
    const snapshot = collectSnapshot();
    writeLocalSnapshot(snapshot);
    navigator.sendBeacon(APP_STATE_ENDPOINT, new Blob([JSON.stringify(snapshot)], { type: "application/json" }));
  }

  async function loadSnapshot() {
    let raw: unknown = null;
    try {
      const response = await fetch(APP_STATE_ENDPOINT, { cache: "no-store" });
      if (response.ok) raw = await response.json();
    } catch {}
    if (!raw) {
      try {
        raw = JSON.parse(localStorage.getItem(APP_STATE_KEY) || "null");
      } catch { raw = null; }
    }
    const snapshot = sanitizeAppSnapshot(raw);
    workspace = snapshot.workspace;
    savedSketches = snapshot.savedSketches;
    currentSketchId = snapshot.currentSketchId;
    showFpsOverlay = snapshot.showFpsOverlay;
    appStateLoaded = true;
    setEditorValue(activeTab().code);
  }

  // ── Console ────────────────────────────────────────────────────────────────

  function logInfo(message: string) {
    consoleEntries = [...consoleEntries, { id: crypto.randomUUID(), kind: "info", summary: message, stamp: new Date().toLocaleTimeString() }];
  }

  function logError(message: string, trace?: string | null) {
    consoleEntries = [...consoleEntries, { id: crypto.randomUUID(), kind: "error", summary: message, trace: trace || undefined, stamp: new Date().toLocaleTimeString() }];
  }

  function clearConsole() {
    consoleEntries = [];
  }

  function setPreviewNotice(tone: "info" | "error", title: string, detail: string) {
    previewNotice = { tone, title, detail };
  }

  // ── Runtime status ─────────────────────────────────────────────────────────

  function renderRuntimeStatus(status: RuntimeStatus) {
    runtimeStatus = status;
  }

  function renderUpdateState(nextState: UpdateState) {
    updateState = nextState;
  }

  async function refreshRuntimeStatus() {
    if (desktopApi?.getRuntimeStatus) {
      renderRuntimeStatus(await desktopApi.getRuntimeStatus());
      return;
    }
    try {
      const response = await fetch("/desktop-runtime-status", { cache: "no-store" });
      if (response.ok) {
        const payload = (await response.json()) as RuntimeStatus | null;
        if (payload) { renderRuntimeStatus(payload); return; }
      }
    } catch {}
    renderRuntimeStatus({
      platform: "desktop",
      configured: false,
      source: null,
      qBinary: null,
      resolvedPath: null,
      message: "Runtime actions are limited in this build. If a sketch runs, q is available for this session."
    });
  }

  async function refreshUpdateStatus() {
    if (!desktopApi?.getUpdateState) {
      renderUpdateState({ status: "idle", version: "-", availableVersion: null, message: "Update checks are available in packaged desktop builds." });
      return;
    }
    renderUpdateState(await desktopApi.getUpdateState());
  }

  async function autoConfigureRuntime() {
    if (!desktopApi?.autoConfigureRuntime) { return; }
    renderRuntimeStatus(await desktopApi.autoConfigureRuntime());
  }

  async function chooseRuntimeBinary() {
    if (!desktopApi?.chooseRuntimeBinary) { return; }
    renderRuntimeStatus(await desktopApi.chooseRuntimeBinary());
  }

  async function clearRuntimeBinary() {
    if (!desktopApi?.clearRuntimeBinary) return;
    renderRuntimeStatus(await desktopApi.clearRuntimeBinary());
  }

  async function checkForUpdates() {
    if (!desktopApi?.checkForUpdates) return;
    renderUpdateState({ ...updateState, status: "checking", message: "Checking GitHub Releases for a newer version..." });
    renderUpdateState(await desktopApi.checkForUpdates());
  }

  async function installUpdateNow() {
    if (!desktopApi?.installUpdateNow) return;
    await desktopApi.installUpdateNow();
  }

  function openExternal(url: string) {
    if (desktopApi?.openExternal) { void desktopApi.openExternal(url); return; }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // ── Preview / p5 ──────────────────────────────────────────────────────────

  function normalizeCommands(raw: unknown): unknown[][] {
    if (!Array.isArray(raw)) return [];
    if (raw.length > 0 && typeof raw[0] === "string") return [raw as unknown[]];
    return raw as unknown[][];
  }

  function normalizeTextArgs(args: unknown[]) {
    if (!Array.isArray(args) || args.length === 0 || !Array.isArray(args[0])) return args;
    const text = args[0].map((part) => (part == null ? "" : String(part))).join("");
    return [text, ...args.slice(1)];
  }

  function applyCommands(commands: unknown[]) {
    for (const command of normalizeCommands(commands)) {
      if (!Array.isArray(command) || command.length === 0 || !previewSketch) continue;
      const [fnName, ...args] = command;
      if (typeof fnName !== "string") continue;
      const fn = (previewSketch as Record<string, (...values: unknown[]) => void>)[fnName];
      const safeArgs = fnName === "text" ? normalizeTextArgs(args) : args;
      if (typeof fn !== "function") continue;
      try { fn.apply(previewSketch, safeArgs); } catch (error) {
        logInfo(`Command failed (${fnName}): ${String((error as Error)?.message || error)}`);
      }
    }
  }

  function paintFps(reading: number) {
    fpsDisplay = `FPS ${Math.round(reading)}`;
  }

  function updateFps(sketch: ReturnType<typeof window.p5>) {
    const now = performance.now();
    const measured = Number(sketch.frameRate()) || 0;
    if (measured > 0) {
      fpsSampleCount += 1;
      fpsDisplayValue += (measured - fpsDisplayValue) / Math.min(fpsSampleCount, 12);
    }
    if (now - fpsLastPaintAt < 250) return;
    fpsLastPaintAt = now;
    paintFps(fpsDisplayValue || measured || 0);
  }

  function toMouseButtonName(btn: unknown) {
    if (btn === "left" || btn === (globalThis as { LEFT?: unknown }).LEFT) return "left";
    if (btn === "right" || btn === (globalThis as { RIGHT?: unknown }).RIGHT) return "right";
    if (btn === "center" || btn === (globalThis as { CENTER?: unknown }).CENTER) return "center";
    return "none";
  }

  function clearInputFrameEdges() {
    inputState.keyPressed = false;
    inputState.keyReleased = false;
    inputState.wheelDelta = 0;
  }

  function documentSnapshot() {
    const documentEl = document.documentElement;
    const body = document.body;
    const docWidth = Math.max(documentEl?.scrollWidth || 0, documentEl?.clientWidth || 0, body?.scrollWidth || 0, body?.clientWidth || 0);
    const docHeight = Math.max(documentEl?.scrollHeight || 0, documentEl?.clientHeight || 0, body?.scrollHeight || 0, body?.clientHeight || 0);
    return {
      cw: Number(previewSketch?.width) || 0,
      ch: Number(previewSketch?.height) || 0,
      vw: Number(window.innerWidth) || 0,
      vh: Number(window.innerHeight) || 0,
      dw: Number(docWidth) || 0,
      dh: Number(docHeight) || 0,
      sx: Number(window.scrollX) || 0,
      sy: Number(window.scrollY) || 0,
      dpr: Number(window.devicePixelRatio) || 1,
      ts: Date.now()
    };
  }

  function inputSnapshot() {
    inputState.ts = Date.now();
    return {
      tick: frameTick,
      mx: Number(inputState.mx) || 0,
      my: Number(inputState.my) || 0,
      pmx: Number(inputState.pmx) || 0,
      pmy: Number(inputState.pmy) || 0,
      mousePressed: Boolean(inputState.mousePressed),
      mouseButton: inputState.mouseButton,
      keysDown: Array.from(keysDown),
      key: inputState.key,
      keyCode: Number(inputState.keyCode) || 0,
      keyPressed: Boolean(inputState.keyPressed),
      keyReleased: Boolean(inputState.keyReleased),
      wheelDelta: Number(inputState.wheelDelta) || 0,
      ts: Number(inputState.ts) || Date.now()
    };
  }

  function resetSketchSession() {
    sketchRunning = false;
    awaitingFrame = false;
    setupApplied = false;
    activeCommands = [];
    frameTick = 0;
    fpsDisplayValue = 0;
    fpsSampleCount = 0;
    fpsLastPaintAt = 0;
    paintFps(0);
  }

  function sendMessage(payload: Record<string, unknown>) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      logInfo("Socket not connected yet");
      return false;
    }
    ws.send(JSON.stringify(payload));
    return true;
  }

  function buildRunPayload() {
    syncEditorIntoWorkspace();
    return {
      code: mainTab().code,
      files: helperTabs().map((tab) => ({ name: tab.name, code: tab.code })),
      document: documentSnapshot()
    };
  }

  function runSketch() {
    if (!sendMessage({ type: "run", ...buildRunPayload() })) {
      setPreviewNotice("info", "Preview backend unavailable", "Waiting for the local websocket connection before starting the sketch.");
      return;
    }
    clearConsole();
    resetSketchSession();
    logInfo("Run requested");
  }

  function stopSketch() {
    resetSketchSession();
    sendMessage({ type: "stop" });
  }

  function createP5Preview() {
    if (!canvasHost) {
      setPreviewNotice("error", "Canvas host missing", "The preview stage could not find its canvas mount point.");
      logError("Canvas host was not available when the preview booted.");
      return;
    }
    if (!window.p5) {
      setPreviewNotice("error", "p5 failed to load", "The preview renderer script did not initialize, so the canvas could not be created.");
      logError("p5 failed to load.");
      return;
    }
    previewSketch = new window.p5((sketch: ReturnType<typeof window.p5>) => {
      (sketch as unknown as { setup: () => void }).setup = () => {
        const renderer = (sketch as unknown as { createCanvas: (w: number, h: number) => { elt: HTMLCanvasElement } }).createCanvas(640, 360);
        canvasElement = renderer.elt;
        previewNotice = null;
        paintFps(0);
      };
      (sketch as unknown as { draw: () => void }).draw = () => {
        if (!setupApplied) return;
        const pointerInsideCanvas =
          sketch.mouseX >= 0 && sketch.mouseX < sketch.width &&
          sketch.mouseY >= 0 && sketch.mouseY < sketch.height;
        inputState.pmx = inputState.mx;
        inputState.pmy = inputState.my;
        if (pointerInsideCanvas) {
          inputState.mx = sketch.mouseX;
          inputState.my = sketch.mouseY;
          inputState.mousePressed = sketch.mouseIsPressed;
          inputState.mouseButton = sketch.mouseIsPressed ? toMouseButtonName(sketch.mouseButton) : "none";
        } else {
          inputState.mousePressed = false;
          inputState.mouseButton = "none";
        }
        applyCommands(activeCommands);
        if (showFpsOverlay) updateFps(sketch);
        if (sketchRunning && !awaitingFrame && ws?.readyState === WebSocket.OPEN) {
          awaitingFrame = true;
          const sent = sendMessage({ type: "step", input: inputSnapshot(), document: documentSnapshot() });
          if (sent) { frameTick += 1; clearInputFrameEdges(); }
        }
      };
    }, canvasHost);
  }

  function connect() {
    const scheme = location.protocol === "https:" ? "wss" : "ws";
    ws = new WebSocket(`${scheme}://${location.host}/ws`);
    ws.addEventListener("open", () => {
      statusText = "Connected";
      if (!setupApplied && !previewSketch) {
        setPreviewNotice("info", "Preview booting", "Loading the canvas renderer...");
      }
    });
    ws.addEventListener("close", () => {
      statusText = "Disconnected - retrying";
      resetSketchSession();
       setPreviewNotice("info", "Preview backend disconnected", "Trying to reconnect to the local sketch runtime now.");
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect, 1000);
    });
    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data) as {
        type: string; setup?: unknown[]; commands?: unknown[];
        line?: string; message?: string; trace?: string | null;
      };
      if (msg.type === "runResult") {
        activeCommands = [];
        applyCommands(msg.setup || []);
        setupApplied = true;
        sketchRunning = true;
        awaitingFrame = false;
        previewNotice = null;
        if (!runtimeStatus?.configured) {
          runtimeStatus = {
            ...(runtimeStatus || { platform: "desktop", configured: false, source: null, qBinary: null, resolvedPath: null, message: "" }),
            configured: true,
            source: runtimeStatus?.source || "session",
            resolvedPath: runtimeStatus?.resolvedPath || runtimeStatus?.qBinary || "Connected for this session",
            qBinary: runtimeStatus?.qBinary || runtimeStatus?.resolvedPath || null,
            message: "q is connected for this session. This sketch started successfully."
          };
        }
        logInfo("Sketch started");
        return;
      }
      if (msg.type === "stepResult") { awaitingFrame = false; activeCommands = msg.commands || []; return; }
      if (msg.type === "stdout") { logInfo(String(msg.line || "")); return; }
      if (msg.type === "runtimeError" || msg.type === "serverError") {
        resetSketchSession();
        setPreviewNotice("error", "Sketch failed to render", String(msg.message || "q runtime error"));
        logError(String(msg.message || "q runtime error"), msg.trace || undefined);
        return;
      }
      if (msg.type === "stopped") {
        resetSketchSession();
        setPreviewNotice("info", "Sketch stopped", "Press Run to start the canvas again.");
        logInfo("Sketch stopped");
      }
    });
  }

  // ── Workspace management ───────────────────────────────────────────────────

  function nextSketchName(baseName: string, excludeId: string | null = null) {
    const base = String(baseName || "Untitled Sketch").trim() || "Untitled Sketch";
    if (!savedSketches.some((item) => item.id !== excludeId && item.name === base)) return base;
    let index = 2;
    while (savedSketches.some((item) => item.id !== excludeId && item.name === `${base} (${index})`)) index += 1;
    return `${base} (${index})`;
  }

  function switchTab(tabId: string) {
    if (tabId === workspace.activeTabId) return;
    syncEditorIntoWorkspace();
    workspace.activeTabId = tabId;
    setEditorValue(activeTab().code);
    schedulePersist();
  }

  function addHelperTab() {
    syncEditorIntoWorkspace();
    let index = 1;
    while (workspace.tabs.some((tab) => tab.name === `helper${index}.q`)) index += 1;
    const tab: SketchTab = { id: `helper-${Date.now()}`, name: `helper${index}.q`, kind: "helper", code: appCatalog.HELPER_TEMPLATE };
    workspace = { ...workspace, activeTabId: tab.id, tabs: [...workspace.tabs, tab] };
    setEditorValue(tab.code);
    schedulePersist();
  }

  function removeTab(tabId: string) {
    const tab = workspace.tabs.find((item) => item.id === tabId);
    if (!tab || tab.kind !== "helper") return;
    syncEditorIntoWorkspace();
    const tabs = workspace.tabs.filter((item) => item.id !== tabId);
    const activeTabId = workspace.activeTabId === tabId ? tabs[0].id : workspace.activeTabId;
    workspace = { activeTabId, tabs };
    setEditorValue(activeTab().code);
    schedulePersist();
  }

  function loadExample(exampleId: string) {
    const example = appCatalog.EXAMPLES.find((item) => item.id === exampleId);
    if (!example) return;
    stopSketch();
    workspace = sanitizeWorkspace(cloneWorkspace(example.workspace));
    currentSketchId = null;
    setEditorValue(activeTab().code);
    schedulePersist();
    logInfo(`Loaded example: ${example.label}`);
  }

  function loadNewSketch() {
    stopSketch();
    workspace = { activeTabId: "sketch", tabs: [{ id: "sketch", name: "Sketch.q", kind: "main", code: appCatalog.EMPTY_SKETCH }] };
    currentSketchId = null;
    setEditorValue(activeTab().code);
    schedulePersist();
    logInfo("Loaded new empty sketch");
  }

  function saveCurrentSketchAs() {
    syncEditorIntoWorkspace();
    const suggested = nextSketchName(currentSavedSketch()?.name || "Untitled Sketch");
    const name = window.prompt("Save sketch as", suggested)?.trim();
    if (!name) return;
    const stamp = Date.now();
    const sketch: SavedSketch = { id: `saved-${stamp}`, name: nextSketchName(name), workspace: sanitizeWorkspace(cloneWorkspace(workspace)), createdAt: stamp, updatedAt: stamp };
    savedSketches = [...savedSketches, sketch];
    currentSketchId = sketch.id;
    schedulePersist();
    logInfo(`Saved sketch: ${sketch.name}`);
  }

  function updateCurrentSavedSketch() {
    syncEditorIntoWorkspace();
    const current = currentSavedSketch();
    if (!current) { saveCurrentSketchAs(); return; }
    current.workspace = sanitizeWorkspace(cloneWorkspace(workspace));
    current.updatedAt = Date.now();
    savedSketches = [...savedSketches];
    schedulePersist();
    logInfo(`Updated sketch: ${current.name}`);
  }

  function openSavedSketch(sketchId: string) {
    const sketch = savedSketches.find((item) => item.id === sketchId);
    if (!sketch) return;
    stopSketch();
    workspace = sanitizeWorkspace(cloneWorkspace(sketch.workspace));
    currentSketchId = sketch.id;
    setEditorValue(activeTab().code);
    schedulePersist();
    logInfo(`Opened sketch: ${sketch.name}`);
  }

  function renameSavedSketch(sketchId: string) {
    const sketch = savedSketches.find((item) => item.id === sketchId);
    if (!sketch) return;
    const nextName = window.prompt("Rename sketch", sketch.name)?.trim();
    if (!nextName) return;
    sketch.name = nextSketchName(nextName, sketch.id);
    sketch.updatedAt = Date.now();
    savedSketches = [...savedSketches];
    schedulePersist();
    logInfo(`Renamed sketch to ${sketch.name}`);
  }

  function deleteSavedSketch(sketchId: string) {
    const sketch = savedSketches.find((item) => item.id === sketchId);
    if (!sketch) return;
    if (!window.confirm(`Delete "${sketch.name}" from your saved sketches?`)) return;
    savedSketches = savedSketches.filter((item) => item.id !== sketch.id);
    if (currentSketchId === sketch.id) currentSketchId = null;
    schedulePersist();
    logInfo(`Deleted sketch: ${sketch.name}`);
  }

  // ── Input event handlers ───────────────────────────────────────────────────

  function handleKeyDown(event: KeyboardEvent) {
    inputState.key = event.key || "";
    inputState.keyCode = event.keyCode || 0;
    inputState.keyPressed = true;
    keysDown.add(String(event.key || "").toLowerCase());
  }

  function handleKeyUp(event: KeyboardEvent) {
    inputState.key = event.key || "";
    inputState.keyCode = event.keyCode || 0;
    inputState.keyReleased = true;
    keysDown.delete(String(event.key || "").toLowerCase());
  }

  function handleWheel(event: WheelEvent) {
    if (!canvasElement) return;
    const rect = canvasElement.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (inside) inputState.wheelDelta += event.deltaY;
  }

  // ── Script loader ──────────────────────────────────────────────────────────

  function loadScript(src: string) {
    return new Promise<void>((resolve, reject) => {
      const existing = document.querySelector(`script[data-qanvas5-src="${src}"]`) as HTMLScriptElement | null;
      if (existing) {
        if (existing.dataset.loaded === "true") { resolve(); return; }
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.dataset.qanvas5Src = src;
      script.addEventListener("load", () => { script.dataset.loaded = "true"; resolve(); }, { once: true });
      script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      document.head.appendChild(script);
    });
  }

  function loadMonaco() {
    if (window.monaco) return Promise.resolve(window.monaco);
    return new Promise<MonacoNamespace>((resolve, reject) => {
      if (!window.require) { reject(new Error("Monaco loader is unavailable.")); return; }
      window.require.config({ paths: { vs: "/vendor/monaco-editor/min/vs" } });
      window.require(["vs/editor/editor.main"], () => {
        if (window.monaco) resolve(window.monaco);
        else reject(new Error("Monaco failed to initialize."));
      });
    });
  }

  function setupEditor() {
    if (!editorHost || !window.monaco) return;
    configureMonacoQ(window.monaco);
    editor = window.monaco.editor.create(editorHost, {
      value: activeTab().code,
      language: "q",
      theme: "qanvas5-workbench",
      automaticLayout: true,
      fontFamily: "SFMono-Regular, Menlo, Monaco, monospace",
      fontSize: 14,
      lineHeight: 21,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      padding: { top: 18, bottom: 18 },
      wordWrap: "on",
      smoothScrolling: true,
      tabSize: 2
    });
    editorDisposer = editor.onDidChangeModelContent(() => {
      syncEditorIntoWorkspace();
      schedulePersist();
    });
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  onMount(() => {
    void loadScript("/vendor/p5/lib/p5.min.js")
      .then(() => {
        createP5Preview();
        return loadScript("/vendor/monaco-editor/min/vs/loader.js");
      })
      .then(() => loadMonaco())
      .then(() => { setupEditor(); })
      .catch((error) => {
        const message = String((error as Error)?.message || error);
        if (!previewSketch) {
          setPreviewNotice("error", "Preview failed to start", message);
        }
        logError(message);
      });

    connect();
    void loadSnapshot();
    void refreshRuntimeStatus();
    void refreshUpdateStatus();
    if (desktopApi?.onUpdateState) removeUpdateListener = desktopApi.onUpdateState((payload) => renderUpdateState(payload));

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("beforeunload", persistWithBeacon);

    return () => {
      if (persistTimer) clearTimeout(persistTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      removeUpdateListener?.();
      editorDisposer?.dispose();
      editor?.dispose();
      previewSketch?.remove();
      ws?.close();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("beforeunload", persistWithBeacon);
    };
  });
</script>

<svelte:head>
  <title>Qanvas5 Studio</title>
</svelte:head>

<div class="app-container">
  <AppHeader
    {statusText}
    currentSketchName={currentSketchName()}
    bind:showExampleTray
    catalog={appCatalog}
    onrun={runSketch}
    onstop={stopSketch}
    onnewsketch={loadNewSketch}
    onclearconsole={clearConsole}
    onloadexample={loadExample}
  />

  <main class="workspace">
    <EditorSection
      {workspace}
      {consoleEntries}
      bind:editorHost
      onswitchtab={switchTab}
      onaddhelpertab={addHelperTab}
      onremovetab={removeTab}
    />

    <PreviewSection
      {setupApplied}
      bind:showFpsOverlay
      {fpsDisplay}
      {previewNotice}
      {savedSketches}
      {currentSketchId}
      currentSketchName={currentSketchName()}
      catalog={appCatalog}
      {runtimeStatus}
      {updateState}
      {sourceLabel}
      bind:canvasHost
      onsaveas={saveCurrentSketchAs}
      onupdatesaved={updateCurrentSavedSketch}
      onopensketch={openSavedSketch}
      onrenamesketch={renameSavedSketch}
      ondeletesketch={deleteSavedSketch}
      onautodetect={autoConfigureRuntime}
      onchoosebinary={chooseRuntimeBinary}
      onclearbinary={clearRuntimeBinary}
      oncheckupdates={checkForUpdates}
      oninstall={installUpdateNow}
      onopenexternal={openExternal}
    />
  </main>
</div>
