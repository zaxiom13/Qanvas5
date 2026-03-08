// @ts-nocheck
const globalScope = typeof globalThis !== 'undefined' ? globalThis : window;

  function createWalkthroughHub({
    state,
    catalog,
    log,
    schedulePersistAppState,
    closeMenu,
    closeExamplesMenu,
    showPreviewTab,
    showHelpTab,
    showSetupTab
  }) {
    function ensureWalkthroughElements() {
      let overlay = document.getElementById('walkthroughOverlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'walkthroughOverlay';
        overlay.className = 'walkthroughOverlay';
        overlay.hidden = true;
      }

      let card = document.getElementById('walkthroughCard');
      if (!card) {
        card = document.createElement('section');
        card.id = 'walkthroughCard';
        card.className = 'walkthroughCard';
        card.hidden = true;
        card.innerHTML = `
          <p id="walkthroughStep" class="walkthroughStep"></p>
          <h3 id="walkthroughTitle" class="walkthroughTitle"></h3>
          <p id="walkthroughBody" class="walkthroughBody"></p>
          <div class="walkthroughActions">
            <button id="walkthroughSkipBtn" class="ghost" type="button">Skip</button>
            <button id="walkthroughNextBtn" type="button">Next</button>
          </div>
        `;
      }

      if (!overlay.parentElement) {
        document.body.appendChild(overlay);
      }
      if (!card.parentElement) {
        document.body.appendChild(card);
      }

      return { overlay, card };
    }

    function getWalkthroughStepElements() {
      return {
        stepEl: document.getElementById('walkthroughStep'),
        titleEl: document.getElementById('walkthroughTitle'),
        bodyEl: document.getElementById('walkthroughBody'),
        nextBtn: document.getElementById('walkthroughNextBtn'),
        skipBtn: document.getElementById('walkthroughSkipBtn')
      };
    }

    function clearWalkthroughHighlights() {
      document.querySelectorAll('.walkthroughFocus').forEach((el) => {
        el.classList.remove('walkthroughFocus');
      });
    }

    function syncWalkthroughCard(target) {
      const card = document.getElementById('walkthroughCard');
      if (!card || !target) {
        return;
      }
      const rect = target.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const margin = 14;
      const desiredLeft = rect.left + window.scrollX;
      const maxLeft = Math.max(margin, window.scrollX + window.innerWidth - cardRect.width - margin);
      const left = Math.min(Math.max(window.scrollX + margin, desiredLeft), maxLeft);

      const belowTop = rect.bottom + window.scrollY + margin;
      const aboveTop = rect.top + window.scrollY - cardRect.height - margin;
      const placeAbove =
        belowTop + cardRect.height > window.scrollY + window.innerHeight - margin && aboveTop >= window.scrollY + margin;
      const top = placeAbove ? aboveTop : belowTop;

      card.style.left = `${Math.round(left)}px`;
      card.style.top = `${Math.round(top)}px`;
    }

    function stopWalkthrough(message) {
      state.walkthroughState.active = false;
      state.walkthroughState.index = 0;
      clearWalkthroughHighlights();
      state.walkthroughSeen = true;
      schedulePersistAppState();
      const overlay = document.getElementById('walkthroughOverlay');
      const card = document.getElementById('walkthroughCard');
      if (overlay) {
        overlay.hidden = true;
      }
      if (card) {
        card.hidden = true;
      }
      if (message) {
        log(message);
      }
    }

    function renderWalkthroughStep() {
      if (!state.walkthroughState.active) {
        return;
      }
      const step = catalog.WALKTHROUGH_STEPS[state.walkthroughState.index];
      if (!step) {
        stopWalkthrough('Walkthrough complete. Happy sketching.');
        return;
      }

      const target = document.querySelector(step.selector);
      if (!target) {
        stopWalkthrough('Walkthrough ended early because a target element was not found.');
        return;
      }

      closeMenu();
      closeExamplesMenu();

      if (step.selector === '#helpTabBtn') {
        showHelpTab();
      }
      if (step.selector === '#setupTabBtn') {
        showSetupTab();
      }
      if (step.selector === '#runBtn' || step.selector === '#editor' || step.selector === '#exampleBtn' || step.selector === '#menuBtn') {
        showPreviewTab();
      }

      clearWalkthroughHighlights();
      target.classList.add('walkthroughFocus');
      target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });

      const { stepEl, titleEl, bodyEl, nextBtn } = getWalkthroughStepElements();
      if (!stepEl || !titleEl || !bodyEl || !nextBtn) {
        stopWalkthrough('Walkthrough UI failed to initialize.');
        return;
      }

      stepEl.textContent = `Step ${state.walkthroughState.index + 1} of ${catalog.WALKTHROUGH_STEPS.length}`;
      titleEl.textContent = step.title;
      bodyEl.textContent = step.body;
      nextBtn.textContent = state.walkthroughState.index === catalog.WALKTHROUGH_STEPS.length - 1 ? 'Finish' : 'Next';

      const overlay = document.getElementById('walkthroughOverlay');
      const card = document.getElementById('walkthroughCard');
      if (overlay) {
        overlay.hidden = false;
      }
      if (card) {
        card.hidden = false;
      }
      requestAnimationFrame(() => {
        syncWalkthroughCard(target);
      });
    }

    function nextWalkthroughStep() {
      if (!state.walkthroughState.active) {
        return;
      }
      state.walkthroughState.index += 1;
      renderWalkthroughStep();
    }

    function startWalkthrough() {
      ensureWalkthroughElements();
      const { nextBtn, skipBtn } = getWalkthroughStepElements();
      if (nextBtn && !nextBtn.dataset.bound) {
        nextBtn.addEventListener('click', () => {
          nextWalkthroughStep();
        });
        nextBtn.dataset.bound = '1';
      }
      if (skipBtn && !skipBtn.dataset.bound) {
        skipBtn.addEventListener('click', () => {
          stopWalkthrough('Walkthrough skipped. Start it again from the menu any time.');
        });
        skipBtn.dataset.bound = '1';
      }

      state.walkthroughSeen = true;
      schedulePersistAppState();
      state.walkthroughState.active = true;
      state.walkthroughState.index = 0;
      renderWalkthroughStep();
      log('Walkthrough started.');
    }

    return {
      startWalkthrough,
      stopWalkthrough,
      renderWalkthroughStep,
      syncWalkthroughCard
    };
  }

  const api = { createWalkthroughHub };

  globalScope.Qanvas5App = globalScope.Qanvas5App || {};
  globalScope.Qanvas5App.walkthrough = api;

export default api;
