// @ts-nocheck
import './shared/catalog';
import './shared/utils';
import './core/dom';
import './core/state';
import './dom/console';
import './dom/views';
import './dom/help';
import './dom/runtime';
import './dom/editor';
import './domain/workspace';
import './domain/preview';
import './domain/walkthrough';
import './runtimeStatus';
import './runGate';
import './qSyntax';

let started = false;

export function bootstrapLegacyApp() {
  if (started) {
    return;
  }
  started = true;

  const globalScope = typeof globalThis !== 'undefined' ? globalThis : window;
  const desktopApi = globalScope.qanvas5Desktop || null;
  const runtimeStatusApi = globalScope.qanvas5RuntimeStatus || null;
  const appModules = globalScope.Qanvas5App || {};

  const requiredModules = [
    'catalog',
    'utils',
    'dom',
    'state',
    'consoleDomain',
    'views',
    'help',
    'runtime',
    'editor',
    'workspace',
    'preview',
    'walkthrough'
  ];

  for (const moduleName of requiredModules) {
    if (!appModules[moduleName]) {
      throw new Error(`Missing app module: ${moduleName}`);
    }
  }

  const refs = appModules.dom.getDomRefs(document);
  const state = appModules.state.createAppState(appModules.catalog, appModules.utils.clone);

  let workspaceHub;
  let previewHub;

  const consoleHub = appModules.consoleDomain.createConsoleHub({ refs });
  const viewHub = appModules.views.createViewHub({
    refs,
    state,
    schedulePersistAppState: () => workspaceHub?.schedulePersistAppState()
  });

  const editorHub = appModules.editor.createEditorHub({
    refs,
    state,
    catalog: appModules.catalog,
    getActiveTab: () => workspaceHub?.activeTab() || state.workspace.tabs[0],
    onCodeChange: () => workspaceHub?.schedulePersistAppState()
  });

  const runtimeHub = appModules.runtime.createRuntimeHub({
    refs,
    state,
    desktopApi,
    runtimeStatusApi
  });

  previewHub = appModules.preview.createPreviewHub({
    refs,
    state,
    catalog: appModules.catalog,
    consoleHub,
    viewHub,
    runtimeHub,
    runtimeStatusApi,
    desktopApi
  });

  workspaceHub = appModules.workspace.createWorkspaceHub({
    refs,
    state,
    catalog: appModules.catalog,
    clone: appModules.utils.clone,
    getEditorCode: editorHub.getEditorCode,
    setEditorCode: editorHub.setEditorCode,
    getDocumentWireSnapshot: previewHub.getDocumentWireSnapshot,
    closeMenu: viewHub.closeMenu,
    closeExamplesMenu: viewHub.closeExamplesMenu,
    log: consoleHub.log,
    onLoadNewSketch: () => {
      state.runGate.cancelRun();
      previewHub.resetSketchSession();
      previewHub.send({ type: 'stop' });
      consoleHub.clearConsole();
    }
  });

  const helpHub = appModules.help.createHelpHub({
    refs,
    catalog: appModules.catalog
  });

  const walkthroughHub = appModules.walkthrough.createWalkthroughHub({
    state,
    catalog: appModules.catalog,
    log: consoleHub.log,
    schedulePersistAppState: workspaceHub.schedulePersistAppState,
    closeMenu: viewHub.closeMenu,
    closeExamplesMenu: viewHub.closeExamplesMenu,
    showPreviewTab: viewHub.showPreviewTab,
    showHelpTab: viewHub.showHelpTab,
    showSetupTab: viewHub.showSetupTab
  });

  function runSketch() {
    consoleHub.clearConsole();
    workspaceHub.saveWorkspace();
    previewHub.resetSketchSession();
    const sentNow = state.runGate.requestRun(workspaceHub.buildRunPayload());
    if (!sentNow) {
      consoleHub.log('Run queued');
    }
  }

  function stopSketch() {
    state.runGate.cancelRun();
    previewHub.resetSketchSession();
    previewHub.send({ type: 'stop' });
  }

  function handleEscapeKey(event) {
    if (event.key === 'Escape' && state.sketchDialogState) {
      workspaceHub.closeSketchDialog(null);
      return true;
    }
    if (event.key === 'Escape') {
      viewHub.closeMenu();
      viewHub.closeExamplesMenu();
      if (state.walkthroughState.active) {
        walkthroughHub.stopWalkthrough('Walkthrough closed.');
      }
      return true;
    }
    return false;
  }

  function bindEventListeners() {
    refs.runBtn.addEventListener('click', runSketch);
    refs.stopBtn.addEventListener('click', stopSketch);
    refs.newSketchBtn.addEventListener('click', () => {
      workspaceHub.loadNewSketch();
    });
    refs.resendBtn.addEventListener('click', () => {
      consoleHub.clearConsole();
    });
    refs.menuSaveAsBtn?.addEventListener('click', () => {
      void workspaceHub.saveCurrentSketchAs();
    });
    refs.menuUpdateSavedBtn?.addEventListener('click', () => {
      workspaceHub.updateCurrentSavedSketch();
    });
    refs.menuResetBtn.addEventListener('click', () => {
      workspaceHub.loadExample('bouncers');
      viewHub.closeMenu();
    });
    refs.menuWalkthroughBtn?.addEventListener('click', () => {
      viewHub.closeMenu();
      walkthroughHub.startWalkthrough();
    });
    refs.addTabBtn.addEventListener('click', () => {
      workspaceHub.addHelperTab();
    });

    refs.menuBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      if (refs.menuPanel.hidden) {
        viewHub.openMenu();
      } else {
        viewHub.closeMenu();
      }
    });
    refs.menuPanel.addEventListener('click', (event) => {
      event.stopPropagation();
    });

    refs.exampleBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      if (refs.examplePanel.hidden) {
        viewHub.openExamplesMenu();
      } else {
        viewHub.closeExamplesMenu();
      }
    });
    refs.examplePanel.addEventListener('click', (event) => {
      event.stopPropagation();
    });

    refs.previewTabBtn.addEventListener('click', () => {
      viewHub.showPreviewTab();
    });
    refs.libraryTabBtn?.addEventListener('click', () => {
      viewHub.showLibraryTab();
    });
    refs.helpTabBtn.addEventListener('click', () => {
      viewHub.showHelpTab();
    });
    refs.setupTabBtn.addEventListener('click', () => {
      viewHub.showSetupTab();
    });

    document.addEventListener('click', () => {
      viewHub.closeMenu();
      viewHub.closeExamplesMenu();
    });

    document.addEventListener('keydown', (event) => {
      if (handleEscapeKey(event)) {
        return;
      }
      state.inputState.key = event.key || '';
      state.inputState.keyCode = event.keyCode || 0;
      state.inputState.keyPressed = true;
      state.keysDown.add(String(event.key || '').toLowerCase());
    });

    document.addEventListener('keyup', (event) => {
      state.inputState.key = event.key || '';
      state.inputState.keyCode = event.keyCode || 0;
      state.inputState.keyReleased = true;
      state.keysDown.delete(String(event.key || '').toLowerCase());
    });

    refs.fpsToggleEl?.addEventListener('change', () => {
      viewHub.setFpsOverlayEnabled(refs.fpsToggleEl.checked);
    });

    refs.runtimeAutoBtn?.addEventListener('click', async () => {
      if (!desktopApi?.autoConfigureRuntime) {
        viewHub.showSetupTab();
        return;
      }
      refs.runtimeSummaryEl.textContent = 'Testing and connecting your local q runtime...';
      runtimeHub.renderRuntimeStatus(await desktopApi.autoConfigureRuntime());
    });

    refs.runtimePickBtn?.addEventListener('click', async () => {
      if (!desktopApi?.chooseRuntimeBinary) {
        viewHub.showSetupTab();
        return;
      }
      refs.runtimeSummaryEl.textContent = 'Choose the q executable you installed with KDB-X...';
      runtimeHub.renderRuntimeStatus(await desktopApi.chooseRuntimeBinary());
    });

    refs.runtimeClearBtn?.addEventListener('click', async () => {
      if (!desktopApi?.clearRuntimeBinary) {
        return;
      }
      refs.runtimeSummaryEl.textContent = 'Clearing the saved runtime path...';
      runtimeHub.renderRuntimeStatus(await desktopApi.clearRuntimeBinary());
    });

    refs.checkUpdatesBtn?.addEventListener('click', async () => {
      if (!desktopApi?.checkForUpdates) {
        return;
      }
      runtimeHub.renderUpdateState({
        ...(state.updateState || {}),
        status: 'checking',
        message: 'Checking GitHub Releases for a newer version...'
      });
      runtimeHub.renderUpdateState(await desktopApi.checkForUpdates());
    });

    refs.installUpdateBtn?.addEventListener('click', async () => {
      if (!desktopApi?.installUpdateNow) {
        return;
      }
      await desktopApi.installUpdateNow();
    });

    refs.openProductBtn?.addEventListener('click', () => {
      runtimeHub.openExternal(state.runtimeStatus?.guides?.links?.product || 'https://kx.com/products/kdb-x/');
    });
    refs.openDownloadBtn?.addEventListener('click', () => {
      runtimeHub.openExternal(state.runtimeStatus?.guides?.links?.download || 'https://kx.com/developer/downloads/');
    });
    refs.openDocsBtn?.addEventListener('click', () => {
      runtimeHub.openExternal(state.runtimeStatus?.guides?.links?.docs || 'https://code.kx.com/');
    });

    document.addEventListener(
      'wheel',
      (event) => {
        if (!previewHub.isCanvasEvent(event)) {
          return;
        }
        state.inputState.wheelDelta += Number(event.deltaY) || 0;
      },
      { passive: true }
    );

    document.addEventListener('mouseup', () => {
      state.inputState.mousePressed = false;
      state.inputState.mouseButton = 'none';
    });

    window.addEventListener('beforeunload', () => {
      walkthroughHub.stopWalkthrough();
      workspaceHub.saveWorkspace();
      if (!workspaceHub.persistAppStateWithBeacon()) {
        void workspaceHub.persistAppState();
      }
    });

    window.addEventListener('resize', () => {
      if (!state.walkthroughState.active) {
        return;
      }
      const step = appModules.catalog.WALKTHROUGH_STEPS[state.walkthroughState.index];
      const target = step ? document.querySelector(step.selector) : null;
      if (target) {
        walkthroughHub.syncWalkthroughCard(target);
      }
    });
  }

  async function bootstrapApp() {
    workspaceHub.applyAppState(await workspaceHub.loadStoredAppState());
    state.appStateLoaded = true;
    initializeAppUi();
  }

  function initializeAppUi() {
    workspaceHub.fillExamplesDropdown();
    helpHub.fillHelpContent();
    workspaceHub.renderTabs();
    editorHub.initMonacoEditor();
    viewHub.setFpsOverlayEnabled(state.showFpsOverlay);
    previewHub.initPreviewSketch();
    previewHub.connect();
    void runtimeHub.refreshRuntimeStatus();
    void runtimeHub.refreshUpdateState();
    desktopApi?.onUpdateState?.((nextState) => {
      runtimeHub.renderUpdateState(nextState);
    });
    consoleHub.log('Ready. Press Run.');
    viewHub.setPreviewLiveState(false);
    if (!state.walkthroughSeen) {
      walkthroughHub.startWalkthrough();
    }
  }

  bindEventListeners();

  bootstrapApp().catch((error) => {
    workspaceHub.applyAppState(workspaceHub.readLocalAppState());
    state.appStateLoaded = true;
    initializeAppUi();
    consoleHub.log(`Fell back to local draft state: ${String(error?.message || error || 'Unknown bootstrap error')}`);
  });
}

export default bootstrapLegacyApp;
