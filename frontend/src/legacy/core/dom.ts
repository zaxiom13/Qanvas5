// @ts-nocheck
const globalScope = typeof globalThis !== 'undefined' ? globalThis : window;

  function getDomRefs(doc) {
    return {
      statusEl: doc.getElementById('status'),
      consoleEl: doc.getElementById('console'),
      editorEl: doc.getElementById('editor'),
      runBtn: doc.getElementById('runBtn'),
      stopBtn: doc.getElementById('stopBtn'),
      newSketchBtn: doc.getElementById('newSketchBtn'),
      resendBtn: doc.getElementById('resendBtn'),
      menuBtn: doc.getElementById('menuBtn'),
      menuPanel: doc.getElementById('menuPanel'),
      menuSaveAsBtn: doc.getElementById('menuSaveAsBtn'),
      menuUpdateSavedBtn: doc.getElementById('menuUpdateSavedBtn'),
      menuResetBtn: doc.getElementById('menuResetBtn'),
      menuCurrentSketchEl: doc.getElementById('menuCurrentSketch'),
      menuWalkthroughBtn: doc.getElementById('menuWalkthroughBtn'),
      savedSketchesListEl: doc.getElementById('savedSketchesList'),
      savedSketchCountEl: doc.getElementById('savedSketchCount'),
      tabListEl: doc.getElementById('tabList'),
      addTabBtn: doc.getElementById('addTabBtn'),
      exampleBtn: doc.getElementById('exampleBtn'),
      examplePanel: doc.getElementById('examplePanel'),
      previewTabBtn: doc.getElementById('previewTabBtn'),
      libraryTabBtn: doc.getElementById('libraryTabBtn'),
      helpTabBtn: doc.getElementById('helpTabBtn'),
      setupTabBtn: doc.getElementById('setupTabBtn'),
      previewView: doc.getElementById('previewView'),
      previewEmptyStateEl: doc.getElementById('previewEmptyState'),
      libraryView: doc.getElementById('libraryView'),
      helpView: doc.getElementById('helpView'),
      setupView: doc.getElementById('setupView'),
      previewToggleWrap: doc.getElementById('previewToggleWrap'),
      fpsToggleEl: doc.getElementById('fpsToggle'),
      fpsOverlayEl: doc.getElementById('fpsOverlay'),
      setupDrawGuideEl: doc.getElementById('setupDrawGuide'),
      apiGlossaryEl: doc.getElementById('apiGlossary'),
      primitiveColumnsEl: doc.getElementById('primitiveColumns'),
      inputDocumentFieldsEl: doc.getElementById('inputDocumentFields'),
      runtimeSummaryEl: doc.getElementById('runtimeSummary'),
      runtimeBadgeEl: doc.getElementById('runtimeBadge'),
      runtimePlatformEl: doc.getElementById('runtimePlatform'),
      runtimePathEl: doc.getElementById('runtimePath'),
      runtimeSourceEl: doc.getElementById('runtimeSource'),
      runtimeAutoBtn: doc.getElementById('runtimeAutoBtn'),
      runtimePickBtn: doc.getElementById('runtimePickBtn'),
      runtimeClearBtn: doc.getElementById('runtimeClearBtn'),
      runtimeActionsEl: doc.getElementById('runtimeActions'),
      openProductBtn: doc.getElementById('openProductBtn'),
      openDownloadBtn: doc.getElementById('openDownloadBtn'),
      openDocsBtn: doc.getElementById('openDocsBtn'),
      checkUpdatesBtn: doc.getElementById('checkUpdatesBtn'),
      installUpdateBtn: doc.getElementById('installUpdateBtn'),
      updateActionsEl: doc.getElementById('updateActions'),
      updateCardEl: doc.getElementById('updateCard'),
      updateBadgeEl: doc.getElementById('updateBadge'),
      updateVersionEl: doc.getElementById('updateVersion'),
      updateAvailableEl: doc.getElementById('updateAvailable'),
      updateMessageEl: doc.getElementById('updateMessage')
    };
  }

  const api = { getDomRefs };

  globalScope.Qanvas5App = globalScope.Qanvas5App || {};
  globalScope.Qanvas5App.dom = api;

export default api;
