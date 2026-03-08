// @ts-nocheck
const globalScope = typeof globalThis !== 'undefined' ? globalThis : window;

  const APP_STATE_KEY = 'qanvas5:app-state:v2';
  const APP_STATE_SAVE_DELAY_MS = 250;
  const APP_STATE_ENDPOINT = '/app-state';
  const LEGACY_WORKSPACE_STATE_KEY = 'qanvas5:workspace:v1';
  const LEGACY_SKETCH_KEY = 'qanvas5:lastSketch:v3';
  const FPS_TOGGLE_KEY = 'qanvas5:showFps:v1';

  const DEFAULT_SKETCH = `// q sketch contract (function-style API):
// - setup[document] initializes and returns state table
// - draw[state;input;document] updates and returns state table
// - shape primitives + text are table-only

setup:{[document]
  viewport:first document[\`v];
  w:360f | 0.82 * (viewport 0);
  h:220f | 0.56 * w;
  createCanvas[w;h];
  frameRate[24];
  textSize[16];
  ([] demo:enlist 0i)
};

draw:{[state;input;document]
  tick:first input[\`tick];
  mouse:first input[\`m];
  canvas:first document[\`c];
  viewport:first document[\`v];
  mx:mouse 0;
  cw:canvas 0;
  ch:canvas 1;
  vw:viewport 0;
  dpr:first document[\`dpr];
  cx:0.22 0.36 0.5 0.64 0.78 * cw;
  cy:5#(0.52 * ch);
  wobble:10f * sin tick * 0.12;
  t:([] p:flip (cx + wobble; cy);
    d:0.07 0.085 0.1 0.085 0.07 * ch;
    fill:flip (235 235 235 235 235i; 94 120 140 170 200i; 40 60 90 120 160i));

  background[20;20;24];
  circle[t];

  txt:([] txt:("mouse x:"; string floor mx; "canvas:" , string floor cw , "x" , string floor ch; "viewport:" , string floor vw , " dpr=" , string dpr);
    p:flip (20 108 20 20f; 32 32 58 80f);
    fill:flip (245 235 205 180i; 245 120 225 200i; 245 40 245 220i));
  text[txt];
  rect[([] p:enlist 18 44f;
    size:enlist 160 4f)];
  triangle[([] p1:enlist 188 48f;
    p2:enlist 204 40f;
    p3:enlist 204 56f)];

  state
};
`;

  const EMPTY_SKETCH = `setup:{[document]
  createCanvas[360;220];
  ([] ready:enlist 1b)
};

draw:{[state;input;document]
  background[20;20;24];
  state
};
`;

  const HELPER_TEMPLATE = `// Helper tabs may only contain function definitions.
// Example:
// wave:{[tick;lo;hi] lo + (hi-lo) * 0.5 * (1 + sin tick * 0.08)};
`;

  const API_GLOSSARY = [
    'Canvas: createCanvas[w;h], resizeCanvas[w;h], frameRate[f], background[r;g;b], clear[]',
    'Primitives (table-only): line[t], rect[t], circle[t], ellipse[t], triangle[t], point[t], text[t] with packed vector columns',
    'Text options: textSize[n], textAlign[a; b], textFont[name; size]',
    'Transforms: push[], pop[], translate[x;y], rotate[a], scale[sx; sy]',
    'Math: use q built-ins directly where needed'
  ];

  const QANVAS5_API_FUNCTIONS = [
    'createCanvas',
    'resizeCanvas',
    'frameRate',
    'background',
    'clear',
    'line',
    'rect',
    'circle',
    'ellipse',
    'triangle',
    'point',
    'text',
    'textSize',
    'textAlign',
    'textFont',
    'push',
    'pop',
    'translate',
    'rotate',
    'scale'
  ];

  const PRIMITIVE_COLUMN_HELP = [
    'circle[t]: requires packed p:[x y] plus d; optional packed fill/stroke as [r g b] or [r g b a]',
    'rect[t]: requires packed p:[x y] plus size:[w h]; optional r plus packed fill/stroke arrays',
    'line[t]: requires packed p1:[x1 y1] and p2:[x2 y2]; optional packed stroke array and strokeWeight',
    'ellipse[t]: requires packed p:[x y] plus size:[w h]; optional packed fill/stroke arrays',
    'triangle[t]: requires packed p1/p2/p3 point arrays; optional packed fill/stroke arrays',
    'point[t]: requires packed p:[x y]; optional packed stroke array and strokeWeight',
    'text[t]: required txt (or text) plus packed p:[x y]; optional packed fill/stroke arrays'
  ];

  const TABLE_SNIPPETS = [
    {
      label: '/circle',
      documentation: 'Insert circle table template',
      insertText: 'circle[([] p:enlist ${1:120 90f}; d:enlist ${2:36f}; fill:enlist ${3:255 255 255i})];'
    },
    {
      label: '/rect',
      documentation: 'Insert rect table template',
      insertText: 'rect[([] p:enlist ${1:100 70f}; size:enlist ${2:140 80f}; fill:enlist ${3:255 255 255i})];'
    },
    {
      label: '/line',
      documentation: 'Insert line table template',
      insertText: 'line[([] p1:enlist ${1:20 20f}; p2:enlist ${2:180 100f}; stroke:enlist ${3:255 255 255i}; strokeWeight:enlist ${4:2f})];'
    },
    {
      label: '/ellipse',
      documentation: 'Insert ellipse table template',
      insertText: 'ellipse[([] p:enlist ${1:120 90f}; size:enlist ${2:70 40f}; fill:enlist ${3:255 255 255i})];'
    },
    {
      label: '/triangle',
      documentation: 'Insert triangle table template',
      insertText: 'triangle[([] p1:enlist ${1:80 50f}; p2:enlist ${2:130 120f}; p3:enlist ${3:30 120f}; fill:enlist ${4:255 255 255i})];'
    },
    {
      label: '/point',
      documentation: 'Insert point table template',
      insertText: 'point[([] p:enlist ${1:120 90f}; stroke:enlist ${2:255 255 255i}; strokeWeight:enlist ${3:2f})];'
    },
    {
      label: '/text',
      documentation: 'Insert text table template',
      insertText: 'text[([] txt:enlist "${1:hello}"; p:enlist ${2:24 40f}; fill:enlist ${3:255 255 255i})];'
    }
  ];

  const INPUT_DOCUMENT_HELP = [
    'input[`tick]: current frame/tick number for this draw step',
    'input[`m]: current mouse [x y] in canvas coordinates',
    'input[`pm]: previous frame mouse [x y]',
    'input[`mx], input[`my], input[`pmx], input[`pmy]: split aliases for the packed mouse vectors',
    'input[`mousePressed]: true while mouse button is down',
    'input[`mouseButton]: `left | `center | `right | `none',
    'input[`keysDown]: symbols for currently-held keys (lowercase)',
    'input[`key]: last key string seen by key events',
    'input[`keyCode]: last key code (integer)',
    'input[`keyPressed], input[`keyReleased]: one-frame edge flags',
    'input[`wheelDelta]: wheel delta accumulated for this frame',
    'input[`ts]: input snapshot timestamp (ms)',
    'document[`c]: current canvas [w h]',
    'document[`v]: browser viewport [w h]',
    'document[`d]: full document scrollable [w h]',
    'document[`s]: page scroll [x y]',
    'document[`cw], document[`ch], document[`vw], document[`vh], document[`dw], document[`dh], document[`sx], document[`sy]: split aliases for those packed vectors',
    'document[`dpr]: device pixel ratio',
    'document[`ts]: document snapshot timestamp (ms)'
  ];

  const WALKTHROUGH_STEPS = [
    {
      selector: '#runBtn',
      title: 'Run your sketch',
      body: 'Start here: Run sends setup once, then streams draw frames so the Preview comes alive.'
    },
    {
      selector: '#editor',
      title: 'Edit q code',
      body: 'Write setup/draw in the main tab, then add helper functions in extra tabs with + Tab.'
    },
    {
      selector: '#exampleBtn',
      title: 'Load examples',
      body: 'Open Examples to quickly swap in working sketches and learn the table patterns.'
    },
    {
      selector: '#helpTabBtn',
      title: 'Use Help when stuck',
      body: 'Help summarizes setup/draw, primitive columns, and input/document fields.'
    },
    {
      selector: '#setupTabBtn',
      title: 'Connect runtime in Setup',
      body: 'Setup links your local q runtime once so future runs are one-click.'
    },
    {
      selector: '#menuBtn',
      title: 'Save + walkthrough',
      body: 'Use the menu for saving named sketches, reopening them later, and restarting this walkthrough any time.'
    }
  ];

  const SETUP_DRAW_GUIDE = [
    '`setup[document]` runs once per Run and must return a table state.',
    '`draw[state;input;document]` runs every frame and must return the next state table.',
    '`input` is a one-row table for frame/mouse/keyboard fields, including `tick`.',
    '`document` is a separate one-row global table with packed vectors (`c`, `v`, `d`, `s`) plus split aliases, available in setup and draw.',
    'Primitive tables are packed-only: use `p`, `size`, `p1`/`p2`/`p3`, `fill`, `stroke`, and `strokeWeight` inside the table itself.',
    'Each helper tab must contain only function definitions (`name:{...};`).',
    'Helper functions are loaded before the main sketch and can be called from setup/draw.',
    'Shapes and text are table-only. One row = one draw call; many rows = vectorized draw.'
  ];

  const EXAMPLES = [
    {
      id: 'bouncers',
      label: 'Bouncing Dots',
      workspace: {
        activeTabId: 'sketch',
        tabs: [
          {
            id: 'sketch',
            name: 'Sketch.q',
            kind: 'main',
            code: `setup:{[document]
  viewport:first document[\`v];
  w:420f | 0.82 * (viewport 0);
  h:260f | 0.58 * w;
  createCanvas[w;h];
  frameRate[30];
  textSize[15];
  n:90;
  p:([] p:flip (14f + n?(w-28f); 16f + n?(h-32f));
    v:flip ((n?2f)-1f; (n?2f)-1f);
    d:3.5 + n?6f;
    fill:flip (120 + n?120i; 140 + n?110i; 190 + n?65i));
  ([] particles:enlist p)
};

draw:{[state;input;document]
  canvas:first document[\`c];
  ps:stepBouncers[first state[\`particles]; canvas];
  cw:canvas 0;
  ch:canvas 1;

  background[12;16;24];
  circle[ps];
  text[([] txt:("Bouncing dots"; "canvas " , string floor cw , "x" , string floor ch);
    p:flip (24 24f; 30 52f);
    fill:flip (252 210i; 252 220i; 252 230i))];

  update particles:enlist ps from state
};`
          },
          {
            id: 'helpers',
            name: 'bouncers.q',
            kind: 'helper',
            code: `stepBouncers:{[t;size]
  t1:update p:p+v from t;
  update
    p:{[size;x] ((0f;0f) | (size & x))}[size] each p,
    v:{[size;p;v] v * (1f - 2f * ((p < (0f;0f)) or p > size))}[size]'[p;v]
  from t1
};`
          }
        ]
      }
    },
    {
      id: 'default',
      label: 'Default Orbit',
      workspace: {
        activeTabId: 'sketch',
        tabs: [{ id: 'sketch', name: 'Sketch.q', kind: 'main', code: DEFAULT_SKETCH }]
      }
    },
    {
      id: 'particles',
      label: 'Particle Fountain',
      workspace: {
        activeTabId: 'sketch',
        tabs: [
          {
            id: 'sketch',
            name: 'Sketch.q',
            kind: 'main',
            code: `setup:{[document]
  viewport:first document[\`v];
  w:460f | 0.84 * (viewport 0);
  h:280f | 0.56 * w;
  createCanvas[w;h];
  frameRate[30];
  textSize[16];
  empty:([] p:0#enlist 0 0f;
    v:0#enlist 0 0f;
    life:0#0f;
    d:0#0f;
    fill:0#enlist 0 0 0i);
  ([] particles:enlist empty)
};

draw:{[state;input;document]
  tick:first input[\`tick];
  mouse:first input[\`m];
  canvas:first document[\`c];
  cw:canvas 0;
  ch:canvas 1;
  dpr:first document[\`dpr];
  ps:stepParticles select from (first state[\`particles]) where life > 0;
  if[first input[\`mousePressed]; ps:ps,spawnParticles[mouse;10]];

  background[12;16;22];
  circle[ps];
  text[([] txt:("Hold mouse and drag to emit particles"; "particles " , string count ps; "canvas " , string floor cw , "x" , string floor ch , " dpr=" , string dpr);
    p:flip (20 20 20f; 28 52 76f);
    fill:flip (245 245 205i; 245 245 225i; 245 245 245i))];

  update particles:enlist ps from state
};`
          },
          {
            id: 'helpers',
            name: 'particles.q',
            kind: 'helper',
            code: `spawnParticles:{[m;n]
  da:((n?1f)-0.5;n?1f);
  ([]
    p:flip m+(10;4)*da;
    v:flip (2.2;2.8)*da;
    life:0.6 + 0.4*(n?1f);
    d:2 + 8*(n?1f);
    fill:flip (220 + n?35i; 130 + n?90i; 50 + n?60i))
};

stepParticles:{[t]
  update p:p+v, v:{x+0 0.08} each v, life:life-0.02, d:1 + 10*life from t where life>0
};`
          }
        ]
      }
    }
  ];

  const INPUT_WIRE_FIELDS = Object.freeze({
    mx: 0,
    my: 1,
    pmx: 2,
    pmy: 3,
    mousePressed: 4,
    mouseButton: 5,
    keysDown: 6,
    key: 7,
    keyCode: 8,
    keyPressed: 9,
    keyReleased: 10,
    wheelDelta: 11,
    ts: 12
  });

  const DOCUMENT_WIRE_FIELDS = Object.freeze({
    cw: 0,
    ch: 1,
    vw: 2,
    vh: 3,
    dw: 4,
    dh: 5,
    sx: 6,
    sy: 7,
    dpr: 8,
    ts: 9
  });

  const api = {
    APP_STATE_KEY,
    APP_STATE_SAVE_DELAY_MS,
    APP_STATE_ENDPOINT,
    LEGACY_WORKSPACE_STATE_KEY,
    LEGACY_SKETCH_KEY,
    FPS_TOGGLE_KEY,
    DEFAULT_SKETCH,
    EMPTY_SKETCH,
    HELPER_TEMPLATE,
    API_GLOSSARY,
    QANVAS5_API_FUNCTIONS,
    PRIMITIVE_COLUMN_HELP,
    TABLE_SNIPPETS,
    INPUT_DOCUMENT_HELP,
    WALKTHROUGH_STEPS,
    SETUP_DRAW_GUIDE,
    EXAMPLES,
    INPUT_WIRE_FIELDS,
    DOCUMENT_WIRE_FIELDS
  };

  globalScope.Qanvas5App = globalScope.Qanvas5App || {};
  globalScope.Qanvas5App.catalog = api;

export default api;
