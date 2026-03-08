// @ts-nocheck
const globalScope = typeof globalThis !== 'undefined' ? globalThis : window;

  function toggleLineComments(editor, monaco) {
    const model = editor.getModel();
    if (!model) {
      return;
    }

    const selections = editor.getSelections() || [];
    if (selections.length === 0) {
      return;
    }

    const lineNums = [];
    for (const sel of selections) {
      const start = sel.startLineNumber;
      const end = sel.endLineNumber;
      for (let line = start; line <= end; line += 1) {
        lineNums.push(line);
      }
    }

    const uniqueLines = Array.from(new Set(lineNums)).sort((a, b) => a - b);
    const allCommented = uniqueLines.every((line) => {
      const text = model.getLineContent(line);
      return text.trimStart().startsWith('//');
    });

    const edits = [];
    for (const line of uniqueLines) {
      const text = model.getLineContent(line);
      const indent = text.match(/^\s*/)?.[0].length || 0;

      if (allCommented) {
        const commentPos = text.indexOf('//', indent);
        if (commentPos >= 0) {
          edits.push({
            range: new monaco.Range(line, commentPos + 1, line, commentPos + 3),
            text: ''
          });
        }
      } else {
        edits.push({
          range: new monaco.Range(line, indent + 1, line, indent + 1),
          text: '//'
        });
      }
    }

    if (edits.length > 0) {
      editor.executeEdits('qanvas5-toggle-line-comment', edits);
    }
  }

  function registerQCompletions(monaco, catalog) {
    const keywords = Array.isArray(globalScope.BOOTHROYD_Q_SYNTAX?.keywords) ? globalScope.BOOTHROYD_Q_SYNTAX.keywords : [];
    const allWords = Array.from(new Set([...keywords, ...catalog.QANVAS5_API_FUNCTIONS]));
    if (allWords.length === 0) {
      return;
    }

    monaco.languages.registerCompletionItemProvider('kbd/q', {
      triggerCharacters: ['.', '`', '_'],
      provideCompletionItems(model, position) {
        const wordInfo = model.getWordUntilPosition(position);
        const range = new monaco.Range(
          position.lineNumber,
          wordInfo.startColumn,
          position.lineNumber,
          wordInfo.endColumn
        );
        const prefix = (wordInfo.word || '').toLowerCase();

        const suggestions = allWords
          .filter((word) => !prefix || word.toLowerCase().startsWith(prefix))
          .map((word) => ({
            label: word,
            kind: catalog.QANVAS5_API_FUNCTIONS.includes(word)
              ? monaco.languages.CompletionItemKind.Function
              : monaco.languages.CompletionItemKind.Keyword,
            insertText: word,
            range
          }));

        return { suggestions };
      }
    });

    monaco.languages.registerCompletionItemProvider('kbd/q', {
      triggerCharacters: ['/'],
      provideCompletionItems(model, position) {
        const linePrefix = model.getLineContent(position.lineNumber).slice(0, position.column - 1);
        const match = linePrefix.match(/\/[A-Za-z]*$/);
        if (!match) {
          return { suggestions: [] };
        }
        const typed = match[0].toLowerCase();
        const startCol = position.column - match[0].length;
        const range = new monaco.Range(position.lineNumber, startCol, position.lineNumber, position.column);

        const suggestions = catalog.TABLE_SNIPPETS.filter((snippet) => snippet.label.startsWith(typed)).map((snippet) => ({
          label: snippet.label,
          kind: monaco.languages.CompletionItemKind.Snippet,
          documentation: snippet.documentation,
          insertText: snippet.insertText,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range
        }));

        return { suggestions };
      }
    });
  }

  function createEditorHub({ refs, state, catalog, getActiveTab, onCodeChange }) {
    function getEditorCode() {
      if (state.monacoEditor) {
        return state.monacoEditor.getValue();
      }
      return refs.editorEl.textContent || '';
    }

    function setEditorCode(code) {
      if (state.monacoEditor) {
        state.monacoEditor.setValue(code);
        return;
      }
      refs.editorEl.textContent = code;
    }

    function initMonacoEditor() {
      const initial = getActiveTab().code;
      if (!globalScope.require) {
        setEditorCode(initial);
        return;
      }

      globalScope.require.config({
        paths: {
          vs: '/vendor/monaco-editor/min/vs'
        }
      });

      globalScope.require(['vs/editor/editor.main'], () => {
        const monaco = globalScope.monaco;
        if (!monaco) {
          setEditorCode(initial);
          return;
        }

        if (!monaco.languages.getLanguages().some((lang) => lang.id === 'kbd/q')) {
          monaco.languages.register({ id: 'kbd/q' });
          monaco.languages.setMonarchTokensProvider('kbd/q', globalScope.BOOTHROYD_Q_SYNTAX || {});
        }
        registerQCompletions(monaco, catalog);

        monaco.editor.defineTheme('qanvas5-dark', {
          base: 'vs-dark',
          inherit: true,
          rules: [
            { token: '', foreground: 'E9EDF2' },
            { token: 'keyword', foreground: '5FB3FF', fontStyle: 'bold' },
            { token: 'variable', foreground: 'E6F2FF' },
            { token: 'delimiter', foreground: 'FFB86C' },
            { token: 'symbol', foreground: 'A6E22E' },
            { token: 'number', foreground: 'F8D66D' },
            { token: 'number.float', foreground: 'F8D66D' },
            { token: 'date', foreground: '9BE9A8' },
            { token: 'time', foreground: '9BE9A8' },
            { token: 'string', foreground: 'F6A5C0' },
            { token: 'comment', foreground: '7D8B99', fontStyle: 'italic' }
          ],
          colors: {
            'editor.background': '#121722',
            'editor.foreground': '#E9EDF2',
            'editorLineNumber.foreground': '#5B6572',
            'editorLineNumber.activeForeground': '#9FB2C6',
            'editorCursor.foreground': '#FFD166',
            'editor.selectionBackground': '#2A3A52',
            'editor.inactiveSelectionBackground': '#243246',
            'editorIndentGuide.background1': '#1E2736',
            'editorIndentGuide.activeBackground1': '#2F415B'
          }
        });

        state.monacoEditor = monaco.editor.create(refs.editorEl, {
          value: initial,
          language: 'kbd/q',
          theme: 'qanvas5-dark',
          minimap: { enabled: false },
          fontFamily: 'Menlo, Consolas, monospace',
          fontSize: 14,
          lineHeight: 21,
          automaticLayout: true,
          wordWrap: 'off'
        });

        state.monacoEditor.onDidChangeModelContent(() => {
          const tab = getActiveTab();
          if (tab) {
            tab.code = state.monacoEditor.getValue();
          }
          onCodeChange();
        });

        state.monacoEditor.addCommand(globalScope.monaco.KeyMod.CtrlCmd | globalScope.monaco.KeyCode.Slash, () => {
          toggleLineComments(state.monacoEditor, monaco);
        });
      });
    }

    return {
      getEditorCode,
      setEditorCode,
      initMonacoEditor
    };
  }

  const api = {
    createEditorHub,
    toggleLineComments,
    registerQCompletions
  };

  globalScope.Qanvas5App = globalScope.Qanvas5App || {};
  globalScope.Qanvas5App.editor = api;

export default api;
