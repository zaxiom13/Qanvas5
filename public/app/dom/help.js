(function (globalScope) {
  function createHelpHub({ refs, catalog }) {
    function fillList(element, lines) {
      element.innerHTML = '';
      for (const line of lines) {
        const li = document.createElement('li');
        li.textContent = line;
        element.appendChild(li);
      }
    }

    function fillHelpContent() {
      fillList(refs.setupDrawGuideEl, catalog.SETUP_DRAW_GUIDE);
      fillList(refs.apiGlossaryEl, catalog.API_GLOSSARY);
      fillList(refs.primitiveColumnsEl, catalog.PRIMITIVE_COLUMN_HELP);
      fillList(refs.inputDocumentFieldsEl, catalog.INPUT_DOCUMENT_HELP);
    }

    return { fillHelpContent };
  }

  const api = { createHelpHub };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  globalScope.Qanvas5App = globalScope.Qanvas5App || {};
  globalScope.Qanvas5App.help = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
