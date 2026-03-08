(function (globalScope) {
  function createWorkspaceHub({
    refs,
    state,
    catalog,
    clone,
    getEditorCode,
    setEditorCode,
    getDocumentWireSnapshot,
    closeMenu,
    closeExamplesMenu,
    log,
    onLoadNewSketch
  }) {
    function createDefaultWorkspace() {
      return clone(catalog.EXAMPLES[0].workspace);
    }

    function createDefaultAppState() {
      return {
        workspace: createDefaultWorkspace(),
        savedSketches: [],
        currentSketchId: null,
        showFpsOverlay: true,
        walkthroughSeen: false
      };
    }

    function sanitizeWorkspace(raw) {
      if (!raw || typeof raw !== 'object') {
        return createDefaultWorkspace();
      }
      const tabs = Array.isArray(raw.tabs) ? raw.tabs : [];
      const normalized = tabs
        .filter((tab) => tab && typeof tab === 'object')
        .map((tab, idx) => ({
          id: String(tab.id || `tab-${idx + 1}`),
          name: String(tab.name || `Tab${idx + 1}.q`),
          kind: tab.kind === 'helper' ? 'helper' : 'main',
          code: String(tab.code || '')
        }));

      const mainTabs = normalized.filter((tab) => tab.kind === 'main');
      if (mainTabs.length === 0) {
        normalized.unshift({ id: 'sketch', name: 'Sketch.q', kind: 'main', code: catalog.DEFAULT_SKETCH });
      }
      if (normalized.filter((tab) => tab.kind === 'main').length > 1) {
        const firstMain = normalized.find((tab) => tab.kind === 'main');
        for (const tab of normalized) {
          if (tab !== firstMain && tab.kind === 'main') {
            tab.kind = 'helper';
          }
        }
      }

      const activeTabId = normalized.some((tab) => tab.id === raw.activeTabId) ? raw.activeTabId : normalized[0].id;
      return { tabs: normalized, activeTabId };
    }

    function sanitizeSavedSketches(raw) {
      const seenIds = new Set();
      return (Array.isArray(raw) ? raw : [])
        .filter((item) => item && typeof item === 'object')
        .map((item, idx) => {
          const id = String(item.id || `saved-${idx + 1}`);
          if (seenIds.has(id)) {
            return null;
          }
          seenIds.add(id);
          return {
            id,
            name: String(item.name || `Sketch ${idx + 1}`),
            workspace: sanitizeWorkspace(item.workspace),
            createdAt: Number(item.createdAt) || Date.now(),
            updatedAt: Number(item.updatedAt) || Date.now()
          };
        })
        .filter(Boolean);
    }

    function readLocalAppState() {
      const saved = localStorage.getItem(catalog.APP_STATE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }

      const legacyWorkspaceState = localStorage.getItem(catalog.LEGACY_WORKSPACE_STATE_KEY);
      if (legacyWorkspaceState) {
        try {
          const parsed = JSON.parse(legacyWorkspaceState);
          return {
            workspace: parsed,
            showFpsOverlay:
              localStorage.getItem(catalog.FPS_TOGGLE_KEY) == null
                ? undefined
                : localStorage.getItem(catalog.FPS_TOGGLE_KEY) === 'true'
          };
        } catch {}
      }

      const legacyWorkspace = localStorage.getItem(catalog.LEGACY_SKETCH_KEY);
      const legacyFps = localStorage.getItem(catalog.FPS_TOGGLE_KEY);
      if (legacyWorkspace || legacyFps != null) {
        return {
          workspace: legacyWorkspace
            ? {
                activeTabId: 'sketch',
                tabs: [{ id: 'sketch', name: 'Sketch.q', kind: 'main', code: legacyWorkspace }]
              }
            : undefined,
          showFpsOverlay: legacyFps == null ? undefined : legacyFps === 'true'
        };
      }

      return null;
    }

    function writeLocalAppState(nextState) {
      localStorage.setItem(catalog.APP_STATE_KEY, JSON.stringify(nextState));
      localStorage.setItem(catalog.FPS_TOGGLE_KEY, nextState.showFpsOverlay ? 'true' : 'false');
    }

    async function loadStoredAppState() {
      try {
        const response = await fetch(catalog.APP_STATE_ENDPOINT, { cache: 'no-store' });
        if (response.ok) {
          const payload = await response.json();
          if (payload && typeof payload === 'object') {
            writeLocalAppState(payload);
            return payload;
          }
        }
      } catch {}

      return readLocalAppState();
    }

    async function writeStoredAppState(nextState) {
      writeLocalAppState(nextState);

      try {
        await fetch(catalog.APP_STATE_ENDPOINT, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nextState)
        });
      } catch {}
    }

    function sanitizeAppState(raw) {
      const fallback = readLocalAppState();
      const source = raw && typeof raw === 'object' ? raw : fallback && typeof fallback === 'object' ? fallback : {};
      const defaults = createDefaultAppState();
      const sketches = sanitizeSavedSketches(source.savedSketches);
      const currentId = typeof source.currentSketchId === 'string' ? source.currentSketchId : null;

      return {
        workspace: sanitizeWorkspace(source.workspace || defaults.workspace),
        savedSketches: sketches,
        currentSketchId: sketches.some((sketch) => sketch.id === currentId) ? currentId : null,
        showFpsOverlay: typeof source.showFpsOverlay === 'boolean' ? source.showFpsOverlay : defaults.showFpsOverlay,
        walkthroughSeen: Boolean(source.walkthroughSeen)
      };
    }

    function applyAppState(raw) {
      const nextState = sanitizeAppState(raw);
      state.workspace = nextState.workspace;
      state.savedSketches = nextState.savedSketches;
      state.currentSketchId = nextState.currentSketchId;
      state.showFpsOverlay = nextState.showFpsOverlay;
      state.walkthroughSeen = nextState.walkthroughSeen;
    }

    function persistActiveTabCode() {
      const tab = state.workspace.tabs.find((item) => item.id === state.workspace.activeTabId);
      if (!tab) {
        return;
      }
      tab.code = getEditorCode();
    }

    function collectAppState() {
      persistActiveTabCode();
      return {
        workspace: sanitizeWorkspace(clone(state.workspace)),
        savedSketches: state.savedSketches.map((sketch) => ({
          id: sketch.id,
          name: sketch.name,
          workspace: sanitizeWorkspace(clone(sketch.workspace)),
          createdAt: sketch.createdAt,
          updatedAt: sketch.updatedAt
        })),
        currentSketchId: state.currentSketchId,
        showFpsOverlay: state.showFpsOverlay,
        walkthroughSeen: state.walkthroughSeen
      };
    }

    function schedulePersistAppState() {
      if (!state.appStateLoaded) {
        return;
      }
      if (state.persistAppStateTimer) {
        clearTimeout(state.persistAppStateTimer);
      }
      state.persistAppStateTimer = setTimeout(() => {
        state.persistAppStateTimer = null;
        void persistAppState();
      }, catalog.APP_STATE_SAVE_DELAY_MS);
    }

    async function persistAppState() {
      if (!state.appStateLoaded) {
        return;
      }
      await writeStoredAppState(collectAppState());
    }

    function persistAppStateWithBeacon() {
      if (!state.appStateLoaded || typeof navigator.sendBeacon !== 'function') {
        return false;
      }

      try {
        const payload = JSON.stringify(collectAppState());
        const sent = navigator.sendBeacon(
          catalog.APP_STATE_ENDPOINT,
          new Blob([payload], { type: 'application/json' })
        );
        if (sent) {
          writeLocalAppState(collectAppState());
        }
        return sent;
      } catch {
        return false;
      }
    }

    function activeTab() {
      return state.workspace.tabs.find((tab) => tab.id === state.workspace.activeTabId) || state.workspace.tabs[0];
    }

    function mainTab() {
      return state.workspace.tabs.find((tab) => tab.kind === 'main') || state.workspace.tabs[0];
    }

    function helperTabs() {
      return state.workspace.tabs.filter((tab) => tab.kind === 'helper');
    }

    function currentSavedSketch() {
      return state.savedSketches.find((sketch) => sketch.id === state.currentSketchId) || null;
    }

    function sketchTimestampLabel(value) {
      const stamp = Number(value);
      if (!stamp) {
        return 'Saved just now';
      }
      return `Updated ${new Date(stamp).toLocaleString()}`;
    }

    function renderSavedSketches() {
      if (!refs.savedSketchesListEl) {
        return;
      }

      refs.savedSketchesListEl.innerHTML = '';
      if (refs.savedSketchCountEl) {
        refs.savedSketchCountEl.textContent = `${state.savedSketches.length} saved`;
      }
      if (state.savedSketches.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'savedSketchesEmpty';
        empty.textContent = 'No saved sketches yet. Save the draft you are working on to start a reusable library.';
        refs.savedSketchesListEl.appendChild(empty);
      } else {
        const ordered = [...state.savedSketches].sort((a, b) => b.updatedAt - a.updatedAt);
        for (const sketch of ordered) {
          const item = document.createElement('div');
          item.className = `savedSketchItem ${sketch.id === state.currentSketchId ? 'active' : ''}`;

          const meta = document.createElement('button');
          meta.className = 'savedSketchMeta';
          meta.type = 'button';
          meta.title = `Open ${sketch.name}`;
          const title = document.createElement('strong');
          title.textContent = sketch.name;
          const stamp = document.createElement('span');
          stamp.textContent = sketchTimestampLabel(sketch.updatedAt);
          meta.append(title, stamp);
          meta.addEventListener('click', () => {
            openSavedSketch(sketch.id);
          });
          item.appendChild(meta);

          const actions = document.createElement('div');
          actions.className = 'savedSketchActions';

          const renameBtn = document.createElement('button');
          renameBtn.className = 'ghost savedSketchAction';
          renameBtn.type = 'button';
          renameBtn.textContent = 'Rename';
          renameBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            void renameSavedSketch(sketch.id);
          });
          actions.appendChild(renameBtn);

          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'ghost savedSketchAction';
          deleteBtn.type = 'button';
          deleteBtn.textContent = 'Delete';
          deleteBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            void deleteSavedSketch(sketch.id);
          });
          actions.appendChild(deleteBtn);

          item.appendChild(actions);
          refs.savedSketchesListEl.appendChild(item);
        }
      }

      if (refs.menuCurrentSketchEl) {
        const current = currentSavedSketch();
        refs.menuCurrentSketchEl.textContent = current ? `Current: ${current.name}` : 'Current: Unsaved draft';
      }
      if (refs.menuUpdateSavedBtn) {
        refs.menuUpdateSavedBtn.disabled = !currentSavedSketch();
      }
    }

    function renderTabs() {
      refs.tabListEl.innerHTML = '';
      for (const tab of state.workspace.tabs) {
        const chip = document.createElement('div');
        chip.className = `tabChip ${tab.id === state.workspace.activeTabId ? 'active' : ''}`;
        chip.addEventListener('click', () => switchTab(tab.id));

        const label = document.createElement('span');
        label.className = 'tabChipLabel';
        label.textContent = tab.name;
        chip.appendChild(label);

        if (tab.kind === 'helper') {
          const close = document.createElement('button');
          close.className = 'tabClose';
          close.textContent = '×';
          close.title = 'Delete helper tab';
          close.addEventListener('click', (event) => {
            event.stopPropagation();
            removeTab(tab.id);
          });
          chip.appendChild(close);
        }

        refs.tabListEl.appendChild(chip);
      }

      renderSavedSketches();
    }

    function switchTab(tabId) {
      if (tabId === state.workspace.activeTabId) {
        return;
      }
      persistActiveTabCode();
      state.workspace.activeTabId = tabId;
      setEditorCode(activeTab().code);
      renderTabs();
      saveWorkspace();
    }

    function removeTab(tabId) {
      const tab = state.workspace.tabs.find((item) => item.id === tabId);
      if (!tab || tab.kind !== 'helper') {
        return;
      }
      persistActiveTabCode();
      state.workspace.tabs = state.workspace.tabs.filter((item) => item.id !== tabId);
      if (state.workspace.activeTabId === tabId) {
        state.workspace.activeTabId = mainTab().id;
        setEditorCode(activeTab().code);
      }
      renderTabs();
      saveWorkspace();
    }

    function addHelperTab() {
      persistActiveTabCode();
      let idx = 1;
      while (state.workspace.tabs.some((tab) => tab.name === `helper${idx}.q`)) {
        idx += 1;
      }
      const tab = {
        id: `helper-${Date.now()}`,
        name: `helper${idx}.q`,
        kind: 'helper',
        code: catalog.HELPER_TEMPLATE
      };
      state.workspace.tabs.push(tab);
      state.workspace.activeTabId = tab.id;
      setEditorCode(tab.code);
      renderTabs();
      saveWorkspace();
    }

    function nextSketchName(baseName, excludeId = null) {
      const base = String(baseName || 'Untitled Sketch').trim() || 'Untitled Sketch';
      if (!state.savedSketches.some((sketch) => sketch.id !== excludeId && sketch.name === base)) {
        return base;
      }

      let idx = 2;
      while (state.savedSketches.some((sketch) => sketch.id !== excludeId && sketch.name === `${base} (${idx})`)) {
        idx += 1;
      }
      return `${base} (${idx})`;
    }

    function ensureSketchDialogElements() {
      let overlay = document.getElementById('sketchDialogOverlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'sketchDialogOverlay';
        overlay.className = 'sketchDialogOverlay';
        overlay.hidden = true;
        overlay.innerHTML = `
          <section id="sketchDialogCard" class="sketchDialogCard" role="dialog" aria-modal="true" aria-labelledby="sketchDialogTitle">
            <p id="sketchDialogEyebrow" class="eyebrow">Sketch</p>
            <h3 id="sketchDialogTitle" class="sketchDialogTitle"></h3>
            <p id="sketchDialogBody" class="sketchDialogBody"></p>
            <label id="sketchDialogFieldWrap" class="sketchDialogFieldWrap" hidden>
              <span class="sketchDialogLabel">Name</span>
              <input id="sketchDialogInput" class="sketchDialogInput" type="text" maxlength="120" />
            </label>
            <div class="sketchDialogActions">
              <button id="sketchDialogCancelBtn" class="ghost" type="button">Cancel</button>
              <button id="sketchDialogConfirmBtn" type="button">Save</button>
            </div>
          </section>
        `;
        document.body.appendChild(overlay);
      }

      if (!overlay.dataset.bound) {
        overlay.addEventListener('click', (event) => {
          if (event.target === overlay) {
            closeSketchDialog(null);
          }
        });
        overlay.dataset.bound = '1';
      }

      const input = document.getElementById('sketchDialogInput');
      const cancelBtn = document.getElementById('sketchDialogCancelBtn');
      const confirmBtn = document.getElementById('sketchDialogConfirmBtn');

      if (cancelBtn && !cancelBtn.dataset.bound) {
        cancelBtn.addEventListener('click', () => {
          closeSketchDialog(null);
        });
        cancelBtn.dataset.bound = '1';
      }

      if (confirmBtn && !confirmBtn.dataset.bound) {
        confirmBtn.addEventListener('click', () => {
          if (!state.sketchDialogState) {
            return;
          }
          if (state.sketchDialogState.mode === 'text') {
            const clean = String(input?.value || '').trim();
            closeSketchDialog(clean || null);
            return;
          }
          closeSketchDialog(true);
        });
        confirmBtn.dataset.bound = '1';
      }

      if (input && !input.dataset.bound) {
        input.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            const clean = String(input.value || '').trim();
            closeSketchDialog(clean || null);
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            closeSketchDialog(null);
          }
        });
        input.dataset.bound = '1';
      }

      return {
        overlay,
        title: document.getElementById('sketchDialogTitle'),
        body: document.getElementById('sketchDialogBody'),
        fieldWrap: document.getElementById('sketchDialogFieldWrap'),
        input,
        confirmBtn
      };
    }

    function closeSketchDialog(result) {
      if (!state.sketchDialogState) {
        return;
      }
      const { overlay, resolve } = state.sketchDialogState;
      state.sketchDialogState = null;
      if (overlay) {
        overlay.hidden = true;
      }
      resolve(result);
    }

    function openSketchNameDialog({ title, body, defaultValue, confirmLabel }) {
      const { overlay, title: titleEl, body: bodyEl, fieldWrap, input, confirmBtn } = ensureSketchDialogElements();
      if (!overlay || !titleEl || !bodyEl || !fieldWrap || !input || !confirmBtn) {
        return Promise.resolve(null);
      }

      titleEl.textContent = title;
      bodyEl.textContent = body;
      fieldWrap.hidden = false;
      input.value = defaultValue || '';
      confirmBtn.textContent = confirmLabel || 'Save';
      overlay.hidden = false;
      state.sketchDialogState = {
        mode: 'text',
        overlay,
        resolve: (value) => value
      };

      return new Promise((resolve) => {
        state.sketchDialogState.resolve = resolve;
        requestAnimationFrame(() => {
          input.focus();
          input.select();
        });
      });
    }

    function openSketchConfirmDialog({ title, body, confirmLabel }) {
      const { overlay, title: titleEl, body: bodyEl, fieldWrap, input, confirmBtn } = ensureSketchDialogElements();
      if (!overlay || !titleEl || !bodyEl || !fieldWrap || !confirmBtn) {
        return Promise.resolve(false);
      }

      titleEl.textContent = title;
      bodyEl.textContent = body;
      fieldWrap.hidden = true;
      if (input) {
        input.value = '';
      }
      confirmBtn.textContent = confirmLabel || 'Confirm';
      overlay.hidden = false;
      state.sketchDialogState = {
        mode: 'confirm',
        overlay,
        resolve: (value) => value
      };

      return new Promise((resolve) => {
        state.sketchDialogState.resolve = resolve;
        requestAnimationFrame(() => {
          confirmBtn.focus();
        });
      });
    }

    async function saveCurrentSketchAs() {
      persistActiveTabCode();
      const suggested = nextSketchName(currentSavedSketch()?.name || 'Untitled Sketch');
      const name = await openSketchNameDialog({
        title: 'Save Sketch As',
        body: 'Give this sketch a name so you can reopen and update it later.',
        defaultValue: suggested,
        confirmLabel: 'Save'
      });
      if (!name) {
        return;
      }

      const stamp = Date.now();
      const sketch = {
        id: `saved-${stamp}`,
        name: nextSketchName(name),
        workspace: sanitizeWorkspace(clone(state.workspace)),
        createdAt: stamp,
        updatedAt: stamp
      };
      state.savedSketches = [...state.savedSketches, sketch];
      state.currentSketchId = sketch.id;
      renderSavedSketches();
      saveWorkspace();
      closeMenu();
      log(`Saved sketch: ${sketch.name}`);
    }

    function updateCurrentSavedSketch() {
      persistActiveTabCode();
      const current = currentSavedSketch();
      if (!current) {
        void saveCurrentSketchAs();
        return;
      }

      current.workspace = sanitizeWorkspace(clone(state.workspace));
      current.updatedAt = Date.now();
      renderSavedSketches();
      saveWorkspace();
      closeMenu();
      log(`Updated sketch: ${current.name}`);
    }

    function openSavedSketch(sketchId) {
      const sketch = state.savedSketches.find((item) => item.id === sketchId);
      if (!sketch) {
        return;
      }

      persistActiveTabCode();
      state.workspace = sanitizeWorkspace(clone(sketch.workspace));
      state.currentSketchId = sketch.id;
      setEditorCode(activeTab().code);
      renderTabs();
      saveWorkspace();
      closeMenu();
      log(`Opened sketch: ${sketch.name}`);
    }

    async function renameSavedSketch(sketchId = state.currentSketchId) {
      const sketch = state.savedSketches.find((item) => item.id === sketchId);
      if (!sketch) {
        return;
      }

      const nextName = await openSketchNameDialog({
        title: 'Rename Sketch',
        body: 'Choose a new name for this saved sketch.',
        defaultValue: sketch.name,
        confirmLabel: 'Rename'
      });
      if (!nextName) {
        return;
      }

      sketch.name = nextSketchName(nextName, sketch.id);
      sketch.updatedAt = Date.now();
      renderSavedSketches();
      saveWorkspace();
      closeMenu();
      log(`Renamed sketch to ${sketch.name}`);
    }

    async function deleteSavedSketch(sketchId = state.currentSketchId) {
      const sketch = state.savedSketches.find((item) => item.id === sketchId);
      if (!sketch) {
        return;
      }
      const confirmed = await openSketchConfirmDialog({
        title: 'Delete Saved Sketch',
        body: `Delete "${sketch.name}" from your saved sketches? This will not change the currently open draft unless it is reopened later.`,
        confirmLabel: 'Delete'
      });
      if (!confirmed) {
        return;
      }

      state.savedSketches = state.savedSketches.filter((item) => item.id !== sketch.id);
      if (state.currentSketchId === sketch.id) {
        state.currentSketchId = null;
      }
      renderSavedSketches();
      saveWorkspace();
      closeMenu();
      log(`Deleted sketch: ${sketch.name}`);
    }

    function buildRunPayload() {
      persistActiveTabCode();
      const main = mainTab();
      const files = helperTabs().map((tab) => ({ name: tab.name, code: tab.code }));
      return { code: main.code, files, document: getDocumentWireSnapshot() };
    }

    function loadExample(exampleId) {
      const found = catalog.EXAMPLES.find((example) => example.id === exampleId);
      if (!found) {
        return;
      }
      persistActiveTabCode();
      state.workspace = sanitizeWorkspace(clone(found.workspace));
      state.currentSketchId = null;
      setEditorCode(activeTab().code);
      renderTabs();
      saveWorkspace();
      closeExamplesMenu();
      log(`Loaded example: ${found.label}`);
    }

    function createEmptyWorkspace() {
      return sanitizeWorkspace({
        activeTabId: 'sketch',
        tabs: [{ id: 'sketch', name: 'Sketch.q', kind: 'main', code: catalog.EMPTY_SKETCH }]
      });
    }

    function loadNewSketch() {
      onLoadNewSketch();
      state.workspace = createEmptyWorkspace();
      state.currentSketchId = null;
      setEditorCode(activeTab().code);
      renderTabs();
      saveWorkspace();
      log('Loaded new empty sketch');
    }

    function fillExamplesDropdown() {
      refs.examplePanel.innerHTML = '';
      for (const example of catalog.EXAMPLES) {
        const btn = document.createElement('button');
        btn.className = 'ghost menuItem';
        btn.type = 'button';
        btn.textContent = example.label;
        btn.addEventListener('click', () => {
          loadExample(example.id);
        });
        refs.examplePanel.appendChild(btn);
      }
    }

    function saveWorkspace() {
      persistActiveTabCode();
      schedulePersistAppState();
    }

    return {
      readLocalAppState,
      loadStoredAppState,
      applyAppState,
      persistAppState,
      persistAppStateWithBeacon,
      collectAppState,
      schedulePersistAppState,
      sanitizeWorkspace,
      renderSavedSketches,
      renderTabs,
      activeTab,
      mainTab,
      helperTabs,
      currentSavedSketch,
      saveWorkspace,
      addHelperTab,
      switchTab,
      removeTab,
      saveCurrentSketchAs,
      updateCurrentSavedSketch,
      openSavedSketch,
      renameSavedSketch,
      deleteSavedSketch,
      buildRunPayload,
      loadExample,
      loadNewSketch,
      fillExamplesDropdown,
      closeSketchDialog
    };
  }

  const api = { createWorkspaceHub };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  globalScope.Qanvas5App = globalScope.Qanvas5App || {};
  globalScope.Qanvas5App.workspace = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
