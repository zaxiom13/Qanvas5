// @ts-nocheck
const globalScope = typeof globalThis !== 'undefined' ? globalThis : window;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  const api = { clone };

  globalScope.Qanvas5App = globalScope.Qanvas5App || {};
  globalScope.Qanvas5App.utils = api;

export default api;
