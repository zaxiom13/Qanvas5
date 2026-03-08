let configured = false;

export function configureMonacoQ(monaco: MonacoNamespace) {
  if (configured) {
    return;
  }

  configured = true;

  monaco.languages.register({ id: "q" });
  monaco.languages.setMonarchTokensProvider("q", {
    tokenizer: {
      root: [
        [/\/\/.*$/, "comment"],
        [/\/.*$/, "comment"],
        [/"([^"\\]|\\.)*$/, "string.invalid"],
        [/"([^"\\]|\\.)*"/, "string"],
        [/`[A-Za-z_][\w.]*/, "type.identifier"],
        [/\b(setup|draw|select|from|update|where|each|first|enlist|string|count|sin|cos|floor|if)\b/, "keyword"],
        [/[A-Za-z_][\w.]*(?=\s*:)/, "variable"],
        [/\b\d+(?:\.\d+)?(?:[efijhbtn])?\b/, "number"],
        [/[{}()[\]]/, "@brackets"],
        [/[;,:]/, "delimiter"],
        [/[+\-*/%&|=!<>]+/, "operator"]
      ]
    }
  });

  monaco.editor.defineTheme("qanvas5-workbench", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "7a6f61", fontStyle: "italic" },
      { token: "keyword", foreground: "8e351f", fontStyle: "bold" },
      { token: "number", foreground: "0e6570" },
      { token: "string", foreground: "815f0a" },
      { token: "variable", foreground: "3c4d5b" },
      { token: "type.identifier", foreground: "7a2d58" }
    ],
    colors: {
      "editor.background": "#fffaf0",
      "editor.foreground": "#17140f",
      "editor.lineHighlightBackground": "#f3ead7",
      "editor.selectionBackground": "#ead4b2",
      "editor.inactiveSelectionBackground": "#efe6d4",
      "editorCursor.foreground": "#b4492b",
      "editorLineNumber.foreground": "#9c8d74",
      "editorLineNumber.activeForeground": "#3e3529"
    }
  });
}
