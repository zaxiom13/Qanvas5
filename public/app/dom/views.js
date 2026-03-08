(function (globalScope) {
  function createViewHub({ refs, state, schedulePersistAppState }) {
    function setPreviewLiveState(isLive) {
      if (!refs.previewView) {
        return;
      }
      refs.previewView.classList.toggle('is-live', Boolean(isLive));
      if (refs.previewEmptyStateEl) {
        refs.previewEmptyStateEl.setAttribute('aria-hidden', isLive ? 'true' : 'false');
      }
    }

    function syncFpsOverlay() {
      if (!refs.fpsOverlayEl) {
        return;
      }
      refs.fpsOverlayEl.hidden = !state.showFpsOverlay;
    }

    function setFpsOverlayEnabled(nextValue) {
      state.showFpsOverlay = Boolean(nextValue);
      if (refs.fpsToggleEl) {
        refs.fpsToggleEl.checked = state.showFpsOverlay;
      }
      syncFpsOverlay();
      schedulePersistAppState();
    }

    function openMenu() {
      refs.menuPanel.hidden = false;
      refs.menuBtn.setAttribute('aria-expanded', 'true');
      closeExamplesMenu();
    }

    function closeMenu() {
      refs.menuPanel.hidden = true;
      refs.menuBtn.setAttribute('aria-expanded', 'false');
    }

    function openExamplesMenu() {
      refs.examplePanel.hidden = false;
      refs.exampleBtn.setAttribute('aria-expanded', 'true');
      closeMenu();
    }

    function closeExamplesMenu() {
      refs.examplePanel.hidden = true;
      refs.exampleBtn.setAttribute('aria-expanded', 'false');
    }

    function showPreviewTab() {
      refs.previewView.hidden = false;
      refs.libraryView.hidden = true;
      refs.helpView.hidden = true;
      refs.setupView.hidden = true;
      refs.previewToggleWrap.hidden = false;
      refs.previewTabBtn.classList.add('active');
      refs.libraryTabBtn.classList.remove('active');
      refs.helpTabBtn.classList.remove('active');
      refs.setupTabBtn.classList.remove('active');
    }

    function showLibraryTab() {
      refs.previewView.hidden = true;
      refs.libraryView.hidden = false;
      refs.helpView.hidden = true;
      refs.setupView.hidden = true;
      refs.previewToggleWrap.hidden = true;
      refs.libraryTabBtn.classList.add('active');
      refs.previewTabBtn.classList.remove('active');
      refs.helpTabBtn.classList.remove('active');
      refs.setupTabBtn.classList.remove('active');
    }

    function showHelpTab() {
      refs.previewView.hidden = true;
      refs.libraryView.hidden = true;
      refs.helpView.hidden = false;
      refs.setupView.hidden = true;
      refs.previewToggleWrap.hidden = true;
      refs.helpTabBtn.classList.add('active');
      refs.previewTabBtn.classList.remove('active');
      refs.libraryTabBtn.classList.remove('active');
      refs.setupTabBtn.classList.remove('active');
    }

    function showSetupTab() {
      refs.previewView.hidden = true;
      refs.libraryView.hidden = true;
      refs.helpView.hidden = true;
      refs.setupView.hidden = false;
      refs.previewToggleWrap.hidden = true;
      refs.setupTabBtn.classList.add('active');
      refs.previewTabBtn.classList.remove('active');
      refs.libraryTabBtn.classList.remove('active');
      refs.helpTabBtn.classList.remove('active');
    }

    return {
      setPreviewLiveState,
      syncFpsOverlay,
      setFpsOverlayEnabled,
      openMenu,
      closeMenu,
      openExamplesMenu,
      closeExamplesMenu,
      showPreviewTab,
      showLibraryTab,
      showHelpTab,
      showSetupTab
    };
  }

  const api = { createViewHub };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  globalScope.Qanvas5App = globalScope.Qanvas5App || {};
  globalScope.Qanvas5App.views = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
