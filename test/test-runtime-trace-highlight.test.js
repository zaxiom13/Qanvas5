const test = require('node:test');
const assert = require('node:assert/strict');
const { renderTraceLine } = require('../shared/trace-highlight.js');

function createDocumentStub() {
  return {
    createElement(tagName) {
      return {
        tagName,
        className: '',
        children: [],
        _textContent: '',
        appendChild(node) {
          this.children.push(node);
        },
        set textContent(value) {
          this._textContent = String(value);
          this.children = [];
        },
        get textContent() {
          if (this.children.length > 0) {
            return this.children.map((child) => child.textContent || '').join('');
          }
          return this._textContent;
        }
      };
    },
    createTextNode(text) {
      return { textContent: String(text) };
    }
  };
}

test('renderTraceLine highlights the clause at q caret for length errors', () => {
  const priorDocument = global.document;
  global.document = createDocumentStub();

  const line =
    'spawnParticles:{[m;n] da:((n?1f)-0.5;n?1f); ([] p:flip m+(10;4;4)*da; v:flip (2.2;2.8)*da; life:0.6 + 0.4*(n?1f); d:2 + 8*(n?1f); fill:flip (220 + n?35i; 130 + n?90i; 50 + n?60i)) }';
  const caretIndex = line.indexOf('life');
  const row = renderTraceLine(line, caretIndex, 'length');

  assert.equal(row.children[1].textContent, 'life:0.6 + 0.4*(n?1f)');

  global.document = priorDocument;
});
