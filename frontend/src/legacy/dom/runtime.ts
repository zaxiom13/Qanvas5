// @ts-nocheck
const globalScope = typeof globalThis !== 'undefined' ? globalThis : window;

  function updateBadgeClass(status) {
    if (status === 'up-to-date' || status === 'downloaded') {
      return 'runtimeBadge-ready';
    }
    if (status === 'error') {
      return 'runtimeBadge-pending';
    }
    return 'runtimeBadge-pending';
  }

  function updateBadgeText(status) {
    if (status === 'checking') return 'Checking';
    if (status === 'available') return 'Found';
    if (status === 'downloading') return 'Downloading';
    if (status === 'downloaded') return 'Ready to install';
    if (status === 'up-to-date') return 'Up to date';
    if (status === 'error') return 'Update error';
    return 'Idle';
  }

  function createRuntimeHub({ refs, state, desktopApi, runtimeStatusApi }) {
    function renderRuntimeStatus(status) {
      state.runtimeStatus = status;
      const linkedPath = status?.resolvedPath || status?.qBinary || 'Issue: q path not set';
      const configured = Boolean(status?.configured);
      const hasRuntimeControls = Boolean(desktopApi?.getRuntimeStatus);
      const hasUpdateControls = Boolean(desktopApi?.getUpdateState);

      refs.runtimeSummaryEl.textContent = status?.message || 'Issue: the app has not resolved a q runtime path yet.';
      refs.runtimePlatformEl.textContent = status?.platform || 'desktop';
      refs.runtimePathEl.textContent = linkedPath;
      refs.runtimeSourceEl.textContent = runtimeStatusApi?.sourceLabel ? runtimeStatusApi.sourceLabel(status?.source) : 'Not connected';
      refs.runtimeBadgeEl.textContent = configured ? 'Connected' : 'Not connected';
      refs.runtimeBadgeEl.className = `runtimeBadge ${configured ? 'runtimeBadge-ready' : 'runtimeBadge-pending'}`;
      if (refs.runtimeActionsEl) {
        refs.runtimeActionsEl.hidden = !hasRuntimeControls;
      }
      if (refs.updateCardEl) {
        refs.updateCardEl.hidden = !hasUpdateControls;
      }
      if (refs.updateActionsEl) {
        refs.updateActionsEl.hidden = !hasUpdateControls;
      }
    }

    function renderUpdateState(nextState) {
      state.updateState = nextState;
      const status = nextState?.status || 'idle';
      refs.updateBadgeEl.textContent = updateBadgeText(status);
      refs.updateBadgeEl.className = `runtimeBadge ${updateBadgeClass(status)}`;
      refs.updateVersionEl.textContent = nextState?.version || '-';
      refs.updateAvailableEl.textContent = nextState?.availableVersion || '-';
      refs.updateMessageEl.textContent = nextState?.message || 'Updates have not been checked yet.';
      refs.installUpdateBtn.disabled = status !== 'downloaded';
    }

    async function refreshRuntimeStatus() {
      if (!desktopApi?.getRuntimeStatus) {
        try {
          const response = await fetch('/desktop-runtime-status', { cache: 'no-store' });
          if (response.ok) {
            const status = await response.json();
            if (status) {
              renderRuntimeStatus(status);
              return;
            }
          }
        } catch {}

        renderRuntimeStatus(
          runtimeStatusApi?.fallbackRuntimeStatus
            ? runtimeStatusApi.fallbackRuntimeStatus()
            : {
                configured: false,
                platform: 'desktop',
                source: null,
                qBinary: null,
                resolvedPath: null,
                message: 'Runtime actions are limited in this build. If a sketch runs, q is available for this session.'
              }
        );
        return;
      }

      renderRuntimeStatus(await desktopApi.getRuntimeStatus());
    }

    async function refreshUpdateState() {
      if (!desktopApi?.getUpdateState) {
        renderUpdateState({
          status: 'idle',
          version: '-',
          availableVersion: null,
          message: 'Update checks are available in the packaged desktop app.'
        });
        return;
      }

      renderUpdateState(await desktopApi.getUpdateState());
    }

    function openExternal(url) {
      if (desktopApi?.openExternal) {
        desktopApi.openExternal(url);
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    }

    return {
      renderRuntimeStatus,
      renderUpdateState,
      refreshRuntimeStatus,
      refreshUpdateState,
      openExternal
    };
  }

  const api = {
    createRuntimeHub,
    updateBadgeClass,
    updateBadgeText
  };

  globalScope.Qanvas5App = globalScope.Qanvas5App || {};
  globalScope.Qanvas5App.runtime = api;

export default api;
