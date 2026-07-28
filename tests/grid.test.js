import { describe, it, expect } from 'vitest';
import { generateLockedGrid, assignPattern } from '../src/grid.js';

const EPSILON = 1e-9;
const PITCH = 50;
const SQRT3_OVER_2 = Math.sqrt(3) / 2;

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function triangleSides(v) {
  return [dist(v[0], v[1]), dist(v[1], v[2]), dist(v[2], v[0])];
}

function isEquilateral(v, tol = 1e-6) {
  const [a, b, c] = triangleSides(v);
  return Math.abs(a - b) < tol && Math.abs(b - c) < tol;
}

function centroid(v) {
  return {
    x: (v[0].x + v[1].x + v[2].x) / 3,
    y: (v[0].y + v[1].y + v[2].y) / 3,
  };
}

function gridDims(numCols, numRows, pitch = PITCH) {
  return {
    innerW: numCols * pitch * SQRT3_OVER_2,
    innerH: numRows * pitch,
  };
}

function makeGrid(numCols, numRows, pitch = PITCH) {
  const { innerW, innerH } = gridDims(numCols, numRows, pitch);
  const getLightnessAt = () => 0.5;
  return generateLockedGrid(innerW, innerH, numCols, numRows, [], getLightnessAt);
}

// ── assignPattern ──────────────────────────────────────────────────

describe('assignPattern', () => {
  it('returns null when no patterns', () => {
    expect(assignPattern(0.5, [])).toBeNull();
    expect(assignPattern(0.5, null)).toBeNull();
    expect(assignPattern(0.5, undefined)).toBeNull();
  });

  it('single pattern always returns it', () => {
    expect(assignPattern(0, [10])).toBe(10);
    expect(assignPattern(0.5, [10])).toBe(10);
    expect(assignPattern(1, [10])).toBe(10);
  });

  it('two patterns split at 0.5', () => {
    expect(assignPattern(0.0, [0, 1])).toBe(0);
    expect(assignPattern(0.49, [0, 1])).toBe(0);
    expect(assignPattern(0.5, [0, 1])).toBe(1);
    expect(assignPattern(0.99, [0, 1])).toBe(1);
  });

  it('three patterns split at thirds', () => {
    const p = [100, 200, 300];
    expect(assignPattern(0.0, p)).toBe(100);
    expect(assignPattern(0.32, p)).toBe(100);
    expect(assignPattern(0.34, p)).toBe(200);
    expect(assignPattern(0.65, p)).toBe(200);
    expect(assignPattern(0.67, p)).toBe(300);
    expect(assignPattern(1.0, p)).toBe(300);
  });

  it('clamps lightness to last bucket', () => {
    expect(assignPattern(1.0, [0, 1])).toBe(1);
    expect(assignPattern(10, [0, 1])).toBe(1);
  });
});

// ── Equilateral triangles ──────────────────────────────────────────

describe('grid: all triangles are equilateral', () => {
  it('odd numCols', () => {
    const tris = makeGrid(41, 10);
    for (const tri of tris) {
      expect(isEquilateral(tri.vertices)).toBe(true);
    }
  });

  it('even numCols', () => {
    const tris = makeGrid(42, 10);
    for (const tri of tris) {
      expect(isEquilateral(tri.vertices)).toBe(true);
    }
  });

  it('numCols=1', () => {
    const tris = makeGrid(1, 10);
    for (const tri of tris) {
      expect(isEquilateral(tri.vertices)).toBe(true);
    }
  });

  it('numCols=2', () => {
    const tris = makeGrid(2, 10);
    for (const tri of tris) {
      expect(isEquilateral(tri.vertices)).toBe(true);
    }
  });

  it('numRows=1', () => {
    const tris = makeGrid(10, 1);
    for (const tri of tris) {
      expect(isEquilateral(tri.vertices)).toBe(true);
    }
  });

  it('1x1', () => {
    const tris = makeGrid(1, 1);
    for (const tri of tris) {
      expect(isEquilateral(tri.vertices)).toBe(true);
    }
  });

  it('2x1', () => {
    const tris = makeGrid(2, 1);
    for (const tri of tris) {
      expect(isEquilateral(tri.vertices)).toBe(true);
    }
  });

  it('1x2', () => {
    const tris = makeGrid(1, 2);
    for (const tri of tris) {
      expect(isEquilateral(tri.vertices)).toBe(true);
    }
  });
});

// ── Side length = pitch ────────────────────────────────────────────

describe('grid: side length equals pitch', () => {
  it('even numCols', () => {
    const tris = makeGrid(20, 10);
    for (const tri of tris) {
      for (const s of triangleSides(tri.vertices)) {
        expect(Math.abs(s - PITCH)).toBeLessThan(1e-6);
      }
    }
  });

  it('odd numCols', () => {
    const tris = makeGrid(21, 10);
    for (const tri of tris) {
      for (const s of triangleSides(tri.vertices)) {
        expect(Math.abs(s - PITCH)).toBeLessThan(1e-6);
      }
    }
  });
});

// ── Triangle count ─────────────────────────────────────────────────

describe('grid: triangle count', () => {
  it('odd numCols', () => {
    const numCols = 21;
    const numRows = 10;
    const tris = makeGrid(numCols, numRows);
    // flipFirst=false. Even cols: numRows inverted + (numRows+1) non-inverted
    // Odd cols: (numRows+1) inverted + numRows non-inverted
    const evenCols = Math.ceil(numCols / 2);
    const oddCols = Math.floor(numCols / 2);
    const expectedInverted = evenCols * numRows + oddCols * (numRows + 1);
    const expectedNonInverted = evenCols * (numRows + 1) + oddCols * numRows;
    expect(tris.filter(t => t.isInverted).length).toBe(expectedInverted);
    expect(tris.filter(t => !t.isInverted).length).toBe(expectedNonInverted);
    expect(tris.length).toBe(expectedInverted + expectedNonInverted);
  });

  it('even numCols', () => {
    const numCols = 20;
    const numRows = 10;
    const tris = makeGrid(numCols, numRows);
    // flipFirst=true reverses parity. Even-indexed cols are odd-parity:
    // Even cols (odd-parity): (numRows+1) inverted + numRows non-inverted
    // Odd cols (even-parity): numRows inverted + (numRows+1) non-inverted
    const evenCols = Math.ceil(numCols / 2);
    const oddCols = Math.floor(numCols / 2);
    const expectedInverted = evenCols * (numRows + 1) + oddCols * numRows;
    const expectedNonInverted = evenCols * numRows + oddCols * (numRows + 1);
    expect(tris.filter(t => t.isInverted).length).toBe(expectedInverted);
    expect(tris.filter(t => !t.isInverted).length).toBe(expectedNonInverted);
    expect(tris.length).toBe(expectedInverted + expectedNonInverted);
  });

  it('all triangles have valid vertices', () => {
    const tris = makeGrid(10, 8);
    for (const tri of tris) {
      expect(tri.vertices).toHaveLength(3);
      for (const v of tri.vertices) {
        expect(typeof v.x).toBe('number');
        expect(typeof v.y).toBe('number');
        expect(isFinite(v.x)).toBe(true);
        expect(isFinite(v.y)).toBe(true);
      }
    }
  });
});

// ── Centroid ───────────────────────────────────────────────────────

describe('grid: center is centroid of vertices', () => {
  it('every triangle center matches its centroid', () => {
    const tris = makeGrid(15, 10);
    for (const tri of tris) {
      const c = centroid(tri.vertices);
      expect(Math.abs(tri.center.x - c.x)).toBeLessThan(EPSILON);
      expect(Math.abs(tri.center.y - c.y)).toBeLessThan(EPSILON);
    }
  });
});

// ── Distinct vertices per triangle ─────────────────────────────────

describe('grid: each triangle has 3 distinct vertices', () => {
  it('no degenerate triangles', () => {
    const tris = makeGrid(10, 8);
    for (const tri of tris) {
      expect(dist(tri.vertices[0], tri.vertices[1])).toBeGreaterThan(EPSILON);
      expect(dist(tri.vertices[1], tri.vertices[2])).toBeGreaterThan(EPSILON);
      expect(dist(tri.vertices[2], tri.vertices[0])).toBeGreaterThan(EPSILON);
    }
  });
});

// ── flipFirst ──────────────────────────────────────────────────────

describe('grid: flipFirst behavior', () => {
  it('odd numCols: col 0 is even (vertices at y = 0, h, 2h, ...)', () => {
    const tris = makeGrid(5, 5);
    // col 0 is even-parity, right-pointing triangles have isInverted=true
    const col0 = tris.filter(t => t.col === 0 && t.isInverted);
    expect(col0.length).toBeGreaterThan(0);
    for (const tri of col0) {
      const ys = tri.vertices.map(v => v.y).sort((a, b) => a - b);
      // Lowest y among vertices of first triangle should be 0
      expect(ys[0]).toBeGreaterThanOrEqual(-EPSILON);
    }
  });

  it('even numCols: col 0 is odd (vertices at y = -h/2, h/2, ...)', () => {
    const tris = makeGrid(6, 5);
    const col0 = tris.filter(t => t.col === 0);
    const ys = col0.flatMap(t => t.vertices.map(v => v.y));
    const minY = Math.min(...ys);
    // With flip, col 0 is odd: y starts at -h/2 = -25
    expect(minY).toBeLessThan(-EPSILON);
    expect(Math.abs(minY + PITCH / 2)).toBeLessThan(EPSILON);
  });
});

// ── Vertex grid alignment ──────────────────────────────────────────

describe('grid: vertices align to grid', () => {
  it('even columns: y is multiple of pitch', () => {
    const tris = makeGrid(10, 8);
    const pitchX = PITCH * SQRT3_OVER_2;
    const h = PITCH;
    const flipFirst = false; // numCols=10 is even, flipFirst=true actually
    // But we just check that for even-parity columns, y is a multiple of h
    const allVertices = [];
    for (const tri of tris) {
      for (const v of tri.vertices) {
        allVertices.push(v);
      }
    }
    // Group by column
    for (const v of allVertices) {
      const col = Math.round(v.x / pitchX);
      const parityCol = (col % 2 === 1) !== true; // flipFirst=true for numCols=10
      if (!parityCol) {
        // This is an even-parity column (vertices at y = row * h)
        const row = v.y / h;
        expect(Math.abs(row - Math.round(row))).toBeLessThan(EPSILON);
      } else {
        // Odd-parity column (vertices at y = row * h - h/2)
        const row = (v.y + h / 2) / h;
        expect(Math.abs(row - Math.round(row))).toBeLessThan(EPSILON);
      }
    }
  });
});

// ── Triangle orientation: vertical base ────────────────────────────

describe('grid: all triangles have vertical base', () => {
  it('every triangle has two vertices sharing the same x', () => {
    const tris = makeGrid(10, 8);
    for (const tri of tris) {
      const xs = tri.vertices.map(v => v.x);
      const hasVerticalBase = xs.some(
        x => xs.filter(xx => Math.abs(xx - x) < EPSILON).length === 2
      );
      expect(hasVerticalBase).toBe(true);
    }
  });

  it('tip vertex is at a different x from the base', () => {
    const tris = makeGrid(10, 8);
    for (const tri of tris) {
      const xs = tri.vertices.map(v => v.x).sort((a, b) => a - b);
      // Two vertices share one x, the third is at a different x
      // With only 2 distinct x values
      const distinct = [...new Set(xs.map(x => x.toFixed(9)))];
      expect(distinct.length).toBe(2);
    }
  });
});

// ── Grid coverage ──────────────────────────────────────────────────

describe('grid: coverage', () => {
  it('centers fall within reasonable bounds', () => {
    const numCols = 10;
    const numRows = 8;
    const { innerW, innerH } = gridDims(numCols, numRows);
    const tris = makeGrid(numCols, numRows);
    for (const tri of tris) {
      expect(tri.center.x).toBeGreaterThanOrEqual(-PITCH);
      expect(tri.center.x).toBeLessThanOrEqual(innerW + PITCH);
      expect(tri.center.y).toBeGreaterThanOrEqual(-PITCH);
      expect(tri.center.y).toBeLessThanOrEqual(innerH + PITCH);
    }
  });

  it('inner triangles have centers within inner area', () => {
    const numCols = 10;
    const numRows = 8;
    const { innerW, innerH } = gridDims(numCols, numRows);
    const tris = makeGrid(numCols, numRows);
    const margin = PITCH * 0.1;
    const innerTris = tris.filter(
      t => t.center.x > margin && t.center.x < innerW - margin &&
           t.center.y > margin && t.center.y < innerH - margin
    );
    expect(innerTris.length).toBeGreaterThan(0);
    for (const tri of innerTris) {
      expect(isEquilateral(tri.vertices)).toBe(true);
    }
  });
});

// ── Pattern assignment ─────────────────────────────────────────────

describe('grid: pattern assignment', () => {
  it('triangles get patterns when activePatterns provided', () => {
    const { innerW, innerH } = gridDims(5, 5);
    const getLightnessAt = () => 0.5;
    const tris = generateLockedGrid(innerW, innerH, 5, 5, [1, 2, 3], getLightnessAt);
    for (const tri of tris) {
      expect(tri.pattern).toBeDefined();
      expect([1, 2, 3]).toContain(tri.pattern);
    }
  });

  it('null pattern when no active patterns', () => {
    const tris = makeGrid(5, 5);
    for (const tri of tris) {
      expect(tri.pattern).toBeNull();
    }
  });

  it('lightness affects pattern selection', () => {
    const { innerW, innerH } = gridDims(5, 5);
    const dark = generateLockedGrid(innerW, innerH, 5, 5, [10, 20], () => 0.1);
    const bright = generateLockedGrid(innerW, innerH, 5, 5, [10, 20], () => 0.9);
    expect(dark.some(t => t.pattern === 10)).toBe(true);
    expect(bright.some(t => t.pattern === 20)).toBe(true);
  });
});

// ── Edge cases ─────────────────────────────────────────────────────

describe('grid: edge cases', () => {
  it('1x1', () => {
    const tris = makeGrid(1, 1);
    expect(tris.length).toBeGreaterThan(0);
    for (const tri of tris) {
      expect(isEquilateral(tri.vertices)).toBe(true);
    }
  });

  it('50x3 (wide)', () => {
    const tris = makeGrid(50, 3);
    expect(tris.length).toBeGreaterThan(0);
    for (const tri of tris) {
      expect(isEquilateral(tri.vertices)).toBe(true);
    }
  });

  it('3x50 (tall)', () => {
    const tris = makeGrid(3, 50);
    expect(tris.length).toBeGreaterThan(0);
    for (const tri of tris) {
      expect(isEquilateral(tri.vertices)).toBe(true);
    }
  });

  it('8x15 (non-square)', () => {
    const tris = makeGrid(8, 15);
    expect(tris.length).toBeGreaterThan(0);
    for (const tri of tris) {
      expect(isEquilateral(tri.vertices)).toBe(true);
    }
  });
});

// ── No duplicate triangles ─────────────────────────────────────────

describe('grid: no duplicate triangles', () => {
  it('all triangles have unique vertex sets', () => {
    const tris = makeGrid(10, 8);
    const seen = new Set();
    for (const tri of tris) {
      const key = tri.vertices
        .map(v => `${v.x.toFixed(9)},${v.y.toFixed(9)}`)
        .sort()
        .join('|');
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
});

// ── Shared edges ───────────────────────────────────────────────────

describe('grid: adjacent triangles share edges', () => {
  it('finds pairs sharing exactly 2 vertices', () => {
    const tris = makeGrid(5, 4);
    let sharedEdgeCount = 0;
    for (let i = 0; i < tris.length; i++) {
      const si = new Set(tris[i].vertices.map(v => `${v.x.toFixed(9)},${v.y.toFixed(9)}`));
      for (let j = i + 1; j < tris.length; j++) {
        let shared = 0;
        for (const v of tris[j].vertices) {
          if (si.has(`${v.x.toFixed(9)},${v.y.toFixed(9)}`)) shared++;
        }
        if (shared === 2) {
          sharedEdgeCount++;
          // They must not share all 3
          expect(shared).toBeLessThan(3);
        }
        expect(shared).toBeLessThan(4);
      }
    }
    // There must be at least some shared edges
    expect(sharedEdgeCount).toBeGreaterThan(0);
  });
});

// ── Pitch relationships ────────────────────────────────────────────

describe('grid: pitch relationships', () => {
  it('pitchX = innerW / numCols, h = innerH / numRows', () => {
    const numCols = 10;
    const numRows = 8;
    const { innerW, innerH } = gridDims(numCols, numRows);
    const tris = makeGrid(numCols, numRows);
    const pitchX = innerW / numCols;
    const h = innerH / numRows;

    // Verify pitchX and h are what we expect
    expect(Math.abs(pitchX - PITCH * SQRT3_OVER_2)).toBeLessThan(EPSILON);
    expect(Math.abs(h - PITCH)).toBeLessThan(EPSILON);

    // All vertex x-coords are multiples of pitchX
    for (const tri of tris) {
      for (const v of tri.vertices) {
        const col = v.x / pitchX;
        expect(Math.abs(col - Math.round(col))).toBeLessThan(EPSILON);
      }
    }
  });
});

// ── Grid structure: x-positions ────────────────────────────────────

describe('grid: x-positions', () => {
  it('vertices span from col 0 to col numCols', () => {
    const numCols = 10;
    const tris = makeGrid(numCols, 5);
    const pitchX = PITCH * SQRT3_OVER_2;
    const allX = new Set();
    for (const tri of tris) {
      for (const v of tri.vertices) {
        allX.add(Math.round(v.x / pitchX));
      }
    }
    const minX = Math.min(...allX);
    const maxX = Math.max(...allX);
    expect(minX).toBe(0);
    expect(maxX).toBe(numCols);
  });
});

// ── Custom pitch ───────────────────────────────────────────────────

describe('grid: custom pitch', () => {
  it('works with pitch=30', () => {
    const pitch = 30;
    const tris = makeGrid(10, 8, pitch);
    for (const tri of tris) {
      expect(isEquilateral(tri.vertices)).toBe(true);
      for (const s of triangleSides(tri.vertices)) {
        expect(Math.abs(s - pitch)).toBeLessThan(1e-6);
      }
    }
  });

  it('works with pitch=100', () => {
    const pitch = 100;
    const tris = makeGrid(10, 8, pitch);
    for (const tri of tris) {
      expect(isEquilateral(tri.vertices)).toBe(true);
      for (const s of triangleSides(tri.vertices)) {
        expect(Math.abs(s - pitch)).toBeLessThan(1e-6);
      }
    }
  });
});
