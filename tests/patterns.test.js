import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NUM_PATTERNS, REAL_PATTERNS, paintPatternTile, buildPatternSvg } from '../src/patterns.js';

// Path2D is a browser API; provide a minimal mock for Node.js tests
let origPath2D;
beforeAll(() => {
  origPath2D = globalThis.Path2D;
  globalThis.Path2D = class {
    constructor(d) { this.d = d; }
  };
});
afterAll(() => {
  globalThis.Path2D = origPath2D;
});

// ── REAL_PATTERNS data integrity ────────────────────────────────────

describe('patterns: REAL_PATTERNS data integrity', () => {
  it('has exactly NUM_PATTERNS entries', () => {
    expect(REAL_PATTERNS.length).toBe(NUM_PATTERNS);
    expect(NUM_PATTERNS).toBe(46);
  });

  it('every pattern has w, h, and paths', () => {
    for (let i = 0; i < REAL_PATTERNS.length; i++) {
      const pat = REAL_PATTERNS[i];
      expect(typeof pat.w).toBe('number');
      expect(pat.w).toBeGreaterThan(0);
      expect(typeof pat.h).toBe('number');
      expect(pat.h).toBeGreaterThan(0);
      expect(Array.isArray(pat.paths)).toBe(true);
      expect(pat.paths.length).toBeGreaterThan(0);
    }
  });

  it('every pattern has consistent w/h ratio (~2/sqrt(3) for equilateral)', () => {
    const expectedRatio = 2 / Math.sqrt(3);
    for (let i = 0; i < REAL_PATTERNS.length; i++) {
      const pat = REAL_PATTERNS[i];
      const ratio = pat.w / pat.h;
      expect(Math.abs(ratio - expectedRatio)).toBeLessThan(0.01);
    }
  });

  it('all patterns have the same base dimensions (may vary slightly)', () => {
    const ws = REAL_PATTERNS.map(p => p.w);
    const hs = REAL_PATTERNS.map(p => p.h);
    const maxW = Math.max(...ws);
    const minW = Math.min(...ws);
    const maxH = Math.max(...hs);
    const minH = Math.min(...hs);
    expect(maxW - minW).toBeLessThan(1);
    expect(maxH - minH).toBeLessThan(1);
  });

  it('every path string starts with M or m (moveTo)', () => {
    for (let i = 0; i < REAL_PATTERNS.length; i++) {
      for (const path of REAL_PATTERNS[i].paths) {
        const first = path.trim()[0];
        expect(first === 'M' || first === 'm').toBe(true);
      }
    }
  });
});

// ── buildPatternSvg ─────────────────────────────────────────────────

describe('patterns: buildPatternSvg', () => {
  it('returns valid SVG for every pattern', () => {
    for (let i = 1; i <= NUM_PATTERNS; i++) {
      const svg = buildPatternSvg(i, 90, 90, '#000000', '#ffffff', false);
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain('<rect');
      expect(svg).toContain('<path');
    }
  });

  it('returns empty string for out-of-range index', () => {
    expect(buildPatternSvg(0, 90, 90, '#000', '#fff', false)).toBe('');
    expect(buildPatternSvg(47, 90, 90, '#000', '#fff', false)).toBe('');
    expect(buildPatternSvg(-1, 90, 90, '#000', '#fff', false)).toBe('');
  });

  it('includes viewBox with correct dimensions', () => {
    const svg = buildPatternSvg(1, 100, 80, '#000', '#fff', false);
    expect(svg).toContain('viewBox="0 0 100 80"');
    expect(svg).toContain('width="100"');
    expect(svg).toContain('height="80"');
  });

  it('inverted flag adds rotate(180) transform', () => {
    const normal = buildPatternSvg(1, 90, 90, '#000', '#fff', false);
    const inverted = buildPatternSvg(1, 90, 90, '#000', '#fff', true);
    expect(inverted).toContain('rotate(180)');
    expect(normal).not.toContain('rotate(180)');
  });

  it('uses provided colors', () => {
    const svg = buildPatternSvg(1, 90, 90, '#ff0000', '#00ff00', false);
    expect(svg).toContain('stroke="#ff0000"');
    expect(svg).toContain('fill="rgba(0,255,0,1)"');
  });

  it('produces different SVGs for different patterns', () => {
    const svg1 = buildPatternSvg(1, 90, 90, '#000', '#fff', false);
    const svg2 = buildPatternSvg(2, 90, 90, '#000', '#fff', false);
    expect(svg1).not.toBe(svg2);
  });

  it('scaling factor matches tile dimensions', () => {
    const pat = REAL_PATTERNS[0];
    const w = 50, h = 43.3;
    const svg = buildPatternSvg(1, w, h, '#000', '#fff', false);
    const expectedScaleX = w / pat.w;
    const expectedScaleY = h / pat.h;
    expect(svg).toContain(`scale(${expectedScaleX} ${expectedScaleY})`);
  });
});

// ── paintPatternTile ────────────────────────────────────────────────

describe('patterns: paintPatternTile', () => {
  function makeCtx(w, h) {
    const calls = [];
    const noop = () => {};
    const ctx = {
      save: () => calls.push('save'),
      restore: () => calls.push('restore'),
      translate: (x, y) => calls.push(`translate(${x},${y})`),
      rotate: noop,
      scale: noop,
      fillRect: (x, y, w, h) => calls.push(`fillRect(${x},${y},${w},${h})`),
      beginPath: () => calls.push('beginPath'),
      rect: (x, y, w, h) => calls.push(`rect(${x},${y},${w},${h})`),
      clip: () => calls.push('clip'),
      stroke: noop,
      strokeStyle: '',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      globalAlpha: 1,
      fillStyle: '',
    };
    Object.defineProperty(ctx, 'globalAlpha', {
      get() { return this._alpha || 1; },
      set(v) { this._alpha = v; calls.push(`alpha=${v}`); },
    });
    return { ctx, calls };
  }

  it('calls save/restore', () => {
    const { ctx, calls } = makeCtx(50, 50);
    paintPatternTile(ctx, 1, 10, 20, 50, 50, '#000', '#fff', false, 0.5);
    expect(calls[0]).toBe('save');
    expect(calls[calls.length - 1]).toBe('restore');
  });

  it('translates to tile position', () => {
    const { ctx, calls } = makeCtx(50, 50);
    paintPatternTile(ctx, 1, 10, 20, 50, 50, '#000', '#fff', false, 0.5);
    expect(calls).toContain('translate(10,20)');
  });

  it('clips to tile bounds', () => {
    const { ctx, calls } = makeCtx(50, 50);
    paintPatternTile(ctx, 1, 0, 0, 50, 50, '#000', '#fff', false, 0.5);
    expect(calls).toContain('rect(0,0,50,50)');
    expect(calls).toContain('clip');
  });

  it('does not throw for any pattern index', () => {
    const { ctx } = makeCtx(50, 50);
    for (let i = 1; i <= NUM_PATTERNS; i++) {
      expect(() => paintPatternTile(ctx, i, 0, 0, 50, 50, '#000', '#fff', false, 0.5)).not.toThrow();
      expect(() => paintPatternTile(ctx, i, 0, 0, 50, 50, '#000', '#fff', true, 0.5)).not.toThrow();
    }
  });

  it('does not throw for invalid pattern index', () => {
    const { ctx } = makeCtx(50, 50);
    expect(() => paintPatternTile(ctx, 0, 0, 0, 50, 50, '#000', '#fff', false, 0.5)).not.toThrow();
    expect(() => paintPatternTile(ctx, 99, 0, 0, 50, 50, '#000', '#fff', false, 0.5)).not.toThrow();
  });
});

// ── Pattern scaling: uniform scale matches tile aspect ──────────────

describe('patterns: uniform scaling', () => {
  it('scale = h / pat.w makes pattern fill tile width after rotation', () => {
    for (let i = 0; i < REAL_PATTERNS.length; i++) {
      const pat = REAL_PATTERNS[i];
      const tileW = 43.3;
      const tileH = 50;
      const scale = tileH / pat.w;
      // After -90° rotation, pattern's width (pat.w) maps to tile height
      // and pattern's height (pat.h) maps to tile width
      const patternWidthOnTile = pat.h * scale;
      // pat.h * (tileH / pat.w) ≈ tileH * pat.h / pat.w ≈ tileH * √3/2 ≈ tileW
      expect(Math.abs(patternWidthOnTile - tileW)).toBeLessThan(0.5);
    }
  });
});
