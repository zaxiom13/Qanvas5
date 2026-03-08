(function (globalScope) {
  function renderTraceLine(line, caretIndex = -1) {
    const row = document.createElement('div');
    row.className = 'consoleTraceLine';

    if (caretIndex < 0 || caretIndex >= line.length) {
      row.textContent = line;
      return row;
    }

    const focusIndex = Math.max(0, Math.min(caretIndex, line.length - 1));
    let clauseStart = focusIndex;
    let clauseEnd = focusIndex;
    while (clauseStart > 0 && !';,{}'.includes(line[clauseStart - 1])) {
      clauseStart -= 1;
    }
    while (clauseStart < line.length && line[clauseStart] === ' ') {
      clauseStart += 1;
    }
    while (clauseEnd < line.length && !';,{}'.includes(line[clauseEnd])) {
      clauseEnd += 1;
    }
    while (clauseEnd > clauseStart && line[clauseEnd - 1] === ' ') {
      clauseEnd -= 1;
    }
    const markStart = Math.max(0, clauseStart);
    const markEnd = Math.min(line.length, Math.max(clauseEnd, clauseStart + 1));
    row.appendChild(document.createTextNode(line.slice(0, markStart)));
    const mark = document.createElement('span');
    mark.className = 'consoleTraceMark';
    mark.textContent = line.slice(markStart, markEnd) || ' ';
    row.appendChild(mark);
    row.appendChild(document.createTextNode(line.slice(markEnd)));
    return row;
  }

  function renderConsoleTrace(trace, errorMessage) {
    const block = document.createElement('div');
    block.className = 'consoleTrace';
    const lines = String(trace || '').split('\n');

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const next = lines[i + 1] || '';
      if (/^\s*\^/.test(next)) {
        block.appendChild(renderTraceLine(line, next.indexOf('^'), errorMessage));
        i += 1;
        continue;
      }
      const row = document.createElement('div');
      row.className = 'consoleTraceLine';
      row.textContent = line;
      block.appendChild(row);
    }

    return block;
  }

  function createConsoleHub({ refs }) {
    function log(message) {
      const ts = new Date().toLocaleTimeString();
      const entry = document.createElement('div');
      entry.className = 'consoleEntry';
      entry.textContent = `[${ts}] ${message}`;
      refs.consoleEl.appendChild(entry);
      refs.consoleEl.scrollTop = refs.consoleEl.scrollHeight;
    }

    function logRuntimeError(message, trace) {
      const ts = new Date().toLocaleTimeString();
      const entry = document.createElement('div');
      entry.className = 'consoleEntry consoleEntry-error';

      const summary = document.createElement('div');
      summary.className = 'consoleErrorSummary';
      summary.textContent = `[${ts}] ${message}`;
      entry.appendChild(summary);

      if (trace) {
        entry.appendChild(renderConsoleTrace(trace, message));
      }

      refs.consoleEl.appendChild(entry);
      refs.consoleEl.scrollTop = refs.consoleEl.scrollHeight;
    }

    function clearConsole() {
      refs.consoleEl.replaceChildren();
    }

    function setStatus(text) {
      refs.statusEl.textContent = text;
    }

    return {
      log,
      logRuntimeError,
      clearConsole,
      setStatus
    };
  }

  const api = {
    createConsoleHub,
    renderTraceLine,
    renderConsoleTrace
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  globalScope.Qanvas5App = globalScope.Qanvas5App || {};
  globalScope.Qanvas5App.consoleDomain = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
