/**
 * Image editor window.
 *
 * Opened with one image (a clipboard picture, or a screenshot) and four tools
 * people actually reach for when marking up a picture: crop, mosaic, brush,
 * arrow — plus text. Saving overwrites the clipboard.
 *
 * The heavy lifting is fabric.js; this file is the tool logic around it.
 */

import { cropBox, fitScale, mosaicBlock, shiftForCrop } from './editor-geometry.js';
import {
  Canvas,
  FabricImage,
  Group,
  Line,
  PencilBrush,
  Rect,
  Textbox,
  Triangle,
  util,
} from 'fabric';

const ACCENT = '#f2b544';
const MAX_SNAPSHOTS = 20;
const HISTORY_PADDING = 32;

let originalUrl = null;

const params = new URLSearchParams(location.search);

const state = {
  canvas: null,
  base: null,
  tool: 'move',
  snapshots: [],
  drag: null,
  arrowPreview: null,
};

const nodes = {
  canvas: document.getElementById('stage'),
  wrap: document.getElementById('stage-wrap'),
  hint: document.getElementById('hint'),
  size: document.getElementById('size'),
  toolHint: document.getElementById('tool-hint'),
  undo: document.getElementById('undo'),
  reset: document.getElementById('reset'),
  save: document.getElementById('save'),
  cancel: document.getElementById('cancel'),
};

/* ---------- theme ---------- */

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
  if (state.canvas) {
    state.canvas.backgroundColor = canvasBackground();
    state.canvas.requestRenderAll();
  }
}

function canvasBackground() {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--canvas-bg').trim();
  return value || '#ede3d2';
}

/* ---------- setup ---------- */

function visibleScale(width, height) {
  return fitScale(
    width,
    height,
    Math.max(320, window.innerWidth - 300),
    Math.max(240, window.innerHeight - 190),
  );
}

async function createCanvas(dataUrl) {
  const image = await FabricImage.fromURL(dataUrl);
  const scale = visibleScale(image.width, image.height);
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);

  if (state.canvas) state.canvas.dispose();

  const canvas = new Canvas('stage', {
    width,
    height,
    backgroundColor: canvasBackground(),
    preserveObjectStacking: true,
    selection: true,
  });

  image.set({
    left: 0,
    top: 0,
    originX: 'left',
    originY: 'top',
    selectable: false,
    evented: false,
    hoverCursor: 'default',
  });
  image.scale(scale);
  canvas.add(image);

  state.canvas = canvas;
  state.base = image;
  state.snapshots = [];
  bindCanvasEvents(canvas);

  nodes.size.textContent = `${image.width} × ${image.height}`;
  nodes.hint.hidden = true;
  return scale;
}

/* ---------- history ---------- */

function snapshot() {
  if (!state.canvas) return;
  state.snapshots.push(JSON.stringify(state.canvas.toJSON()));
  if (state.snapshots.length > MAX_SNAPSHOTS) state.snapshots.shift();
  nodes.undo.disabled = false;
}

async function undo() {
  const previous = state.snapshots.pop();
  if (!previous) return;

  await state.canvas.loadFromJSON(JSON.parse(previous));
  state.canvas.requestRenderAll();
  state.base = state.canvas.getObjects()[0] ?? null;
  nodes.undo.disabled = state.snapshots.length === 0;
}

/* ---------- tools ---------- */

function setTool(tool) {
  state.tool = tool;
  const canvas = state.canvas;
  if (!canvas) return;

  canvas.isDrawingMode = tool === 'pen';
  if (tool === 'pen') {
    const brush = new PencilBrush(canvas);
    brush.color = ACCENT;
    brush.width = 4;
    canvas.freeDrawingBrush = brush;
  }

  const selecting = tool === 'crop' || tool === 'mosaic';
  canvas.selection = tool === 'move';
  canvas.skipTargetFind = selecting;
  canvas.defaultCursor = selecting ? 'crosshair' : 'default';

  for (const button of document.querySelectorAll('.tool')) {
    button.classList.toggle('is-active', button.dataset.tool === tool);
  }

  nodes.toolHint.textContent = {
    move: '拖动对象可移动，选「文字」可编辑文字',
    crop: '框选要保留的区域，松开鼠标即裁剪',
    mosaic: '框选需要打码的区域，松开鼠标即应用',
    pen: '按住鼠标直接画',
    arrow: '从起点拖到终点画箭头',
    text: '点一下画布输入文字，Esc 结束输入',
  }[tool];
}

function scenePoint(event) {
  const canvas = state.canvas;
  return canvas.getScenePoint ? canvas.getScenePoint(event) : canvas.getPointer(event);
}

function beginRect(point) {
  snapshot();
  state.drag = { x: point.x, y: point.y };
  state.arrowPreview = new Rect({
    left: point.x,
    top: point.y,
    width: 0,
    height: 0,
    fill: 'rgba(242, 181, 68, 0.18)',
    stroke: ACCENT,
    strokeWidth: 1,
    strokeDashArray: [4, 3],
    selectable: false,
    evented: false,
  });
  state.canvas.add(state.arrowPreview);
}

function updateRect(point) {
  if (!state.drag || !state.arrowPreview) return;

  const left = Math.min(state.drag.x, point.x);
  const top = Math.min(state.drag.y, point.y);
  state.arrowPreview.set({
    left,
    top,
    width: Math.abs(point.x - state.drag.x),
    height: Math.abs(point.y - state.drag.y),
  });
  state.canvas.requestRenderAll();
}

async function endRect(point) {
  if (!state.drag || !state.arrowPreview) return;

  const left = Math.min(state.drag.x, point.x);
  const top = Math.min(state.drag.y, point.y);
  const width = Math.abs(point.x - state.drag.x);
  const height = Math.abs(point.y - state.drag.y);
  const tool = state.tool;
  const box = state.arrowPreview;

  state.drag = null;
  state.arrowPreview = null;
  state.canvas.remove(box);

  if (width < 8 || height < 8) {
    setTool(state.tool);
    return;
  }

  if (tool === 'crop') await applyCrop({ left, top, width, height });
  else if (tool === 'mosaic') applyMosaic({ left, top, width, height });
}

/* ---------- operations ---------- */

async function applyCrop(box) {
  const base = state.base;
  if (!base) return;

  const scale = base.scaleX || 1;
  const element = base.getElement ? base.getElement() : base._element;
  const source = cropBox(
    box,
    scale,
    element.naturalWidth || element.width,
    element.naturalHeight || element.height,
  );

  const offscreen = document.createElement('canvas');
  offscreen.width = Math.max(1, Math.round(source.width));
  offscreen.height = Math.max(1, Math.round(source.height));
  offscreen
    .getContext('2d')
    .drawImage(element, source.left, source.top, source.width, source.height, 0, 0, offscreen.width, offscreen.height);

  // Annotations keep their place relative to the crop.
  const annotations = state.canvas
    .getObjects()
    .filter((object) => object !== base)
    .map((object) => ({
      json: object.toObject(),
      left: object.left ?? 0,
      top: object.top ?? 0,
    }));

  const newScale = await createCanvas(offscreen.toDataURL('image/png'));
  const ratio = newScale / scale;

  const restored = await util.enlivenObjects(annotations.map((item) => item.json));
  restored.forEach((object, index) => {
    const item = annotations[index];
    const moved = shiftForCrop(item.left, item.top, box.left, box.top, ratio);
    object.set({ left: moved.left, top: moved.top });
    state.canvas.add(object);
  });
  state.canvas.requestRenderAll();

  state.base = state.canvas.getObjects()[0] ?? state.base;
  state.canvas.requestRenderAll();
  state.snapshots = [];
  nodes.undo.disabled = true;
  setTool(state.tool);
}

function applyMosaic(box) {
  const base = state.base;
  if (!base) return;
  snapshot();

  const scale = base.scaleX || 1;
  const element = base.getElement ? base.getElement() : base._element;
  const sx = box.left / scale;
  const sy = box.top / scale;
  const sw = box.width / scale;
  const sh = box.height / scale;

  const width = Math.max(1, Math.round(sw));
  const height = Math.max(1, Math.round(sh));
  const block = mosaicBlock(width, height);

  const small = document.createElement('canvas');
  small.width = Math.max(1, Math.round(width / block));
  small.height = Math.max(1, Math.round(height / block));
  const smallContext = small.getContext('2d');
  smallContext.imageSmoothingEnabled = false;
  smallContext.drawImage(element, sx, sy, sw, sh, 0, 0, small.width, small.height);

  const pixels = document.createElement('canvas');
  pixels.width = width;
  pixels.height = height;
  const pixelContext = pixels.getContext('2d');
  pixelContext.imageSmoothingEnabled = false;
  pixelContext.drawImage(small, 0, 0, width, height);

  FabricImage.fromURL(pixels.toDataURL('image/png')).then((mosaic) => {
    mosaic.set({ left: box.left, top: box.top, originX: 'left', originY: 'top' });
    state.canvas.add(mosaic);
    state.canvas.requestRenderAll();
  });
}

function commitArrow(from, to) {
  if (Math.hypot(to.x - from.x, to.y - from.y) < 12) return;
  snapshot();

  const angle = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  const line = new Line([from.x, from.y, to.x, to.y], {
    stroke: ACCENT,
    strokeWidth: 3,
    strokeLineCap: 'round',
  });
  const head = new Triangle({
    width: 16,
    height: 18,
    fill: ACCENT,
    left: to.x,
    top: to.y,
    originX: 'center',
    originY: 'center',
    angle: angle + 90,
  });

  state.canvas.add(new Group([line, head], { selectable: true }));
  state.canvas.requestRenderAll();
}

/* ---------- events ---------- */

function bindCanvasEvents(canvas) {
  canvas.on('mouse:down', (event) => {
    const point = scenePoint(event.e);

    if (state.tool === 'crop' || state.tool === 'mosaic') {
      beginRect(point);
      return;
    }

    if (state.tool === 'arrow') {
      state.drag = { x: point.x, y: point.y };
      return;
    }

    if (state.tool === 'text') {
      snapshot();
      const box = new Textbox('文字', {
        left: point.x,
        top: point.y,
        width: 220,
        fontSize: 22,
        fill: ACCENT,
        fontFamily: '-apple-system, "PingFang SC", sans-serif',
      });
      canvas.add(box);
      canvas.setActiveObject(box);
      box.enterEditing();
      return;
    }
  });

  canvas.on('mouse:move', (event) => {
    if (!state.drag) return;
    const point = scenePoint(event.e);

    if (state.arrowPreview) {
      updateRect(point);
      return;
    }

    if (state.tool === 'arrow') {
      canvas.requestRenderAll();
      state.drag.to = point;
    }
  });

  canvas.on('mouse:up', (event) => {
    if (!state.drag) return;
    const point = scenePoint(event.e);

    if (state.arrowPreview) {
      endRect(point);
      return;
    }

    if (state.tool === 'arrow') {
      const from = { x: state.drag.x, y: state.drag.y };
      state.drag = null;
      commitArrow(from, point);
    }
  });

  canvas.on('path:created', () => snapshot());
  canvas.on('object:modified', () => snapshot());
}

/* ---------- boot ---------- */

applyTheme(params.get('theme'));

window.barEditor.onTheme((theme) => applyTheme(theme));

window.barEditor.onImage(async (dataUrl) => {
  if (!dataUrl) return;
  originalUrl = dataUrl;
  await createCanvas(dataUrl);
  setTool('move');

  // The window may have been hidden behind the panel: focus it and re-measure,
  // otherwise clicks land where the canvas used to be.
  window.focus();
  requestAnimationFrame(() => state.canvas?.calcOffset());
});

window.addEventListener('focus', () => state.canvas?.calcOffset());

for (const button of document.querySelectorAll('.tool')) {
  button.addEventListener('click', () => setTool(button.dataset.tool));
}

nodes.undo.addEventListener('click', undo);
nodes.reset.addEventListener('click', () => {
  if (originalUrl) createCanvas(originalUrl).then(() => setTool('move'));
});
nodes.save.addEventListener('click', () => {
  if (!state.canvas) return;
  const dataUrl = state.canvas.toDataURL({ format: 'png', multiplier: 1 });
  window.barEditor.save(dataUrl);
});
nodes.cancel.addEventListener('click', () => window.barEditor.cancel());

document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    undo();
  }
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault();
    nodes.save.click();
  }
  if (event.key === 'Escape' && !state.canvas?.getActiveObject()?.isEditing) {
    window.barEditor.cancel();
  }
});

window.addEventListener('resize', () => {
  if (state.canvas) state.canvas.calcOffset();
});

// Dev-only handle: the tools are canvas interactions, which no automation can
// drive, so a debug build exposes them for scripted verification.
if (new URLSearchParams(location.search).has('debug')) {
  window.__editor = { state, setTool, applyCrop, applyMosaic, commitArrow, undo, createCanvas };
}

console.assert(HISTORY_PADDING > 0);
