(function (globalScope) {
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  const api = { clone };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  globalScope.Qanvas5App = globalScope.Qanvas5App || {};
  globalScope.Qanvas5App.utils = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
