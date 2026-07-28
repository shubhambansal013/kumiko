export function assignPattern(lightness, activePatterns) {
  if (!activePatterns || activePatterns.length === 0) return null;
  const bucketSize = 1 / activePatterns.length;
  const bucketIdx = Math.min(activePatterns.length - 1, Math.floor(lightness / bucketSize));
  return activePatterns[bucketIdx] ?? null;
}

/**
 * Generate a proper equilateral-triangle asanoha lattice with vertical-base triangles.
 *
 * Geometry (equilateral triangles with side = pitch):
 *   horizontal spacing between columns = pitch * sqrt(3) / 2
 *   vertical spacing within columns     = pitch
 *   odd columns offset by h / 2
 *
 * Iterates over columns (not rows) so triangle bases are vertical.
 * Odd columns include extra vertices at -h/2 and (numRows+0.5)*h
 * so edge triangles are complete; the rendering clips to the inner area.
 *
 * @param {number} innerW  – inner panel width in px (after frame)
 * @param {number} innerH  – inner panel height in px (after frame)
 * @param {number} numCols – Size B: number of triangles horizontally
 * @param {number} numRows – Size A: number of triangles vertically
 * @param {Array}  activePatterns – selected pattern indices
 * @param {Function} getLightnessAt – (cx, cy) → 0..1
 * @returns {Array} triangles
 */
export function generateLockedGrid(innerW, innerH, numCols, numRows, activePatterns, getLightnessAt) {
  const pitchX = innerW / numCols;
  const h = innerH / numRows;
  const flipFirst = numCols % 2 === 0;

  const vertices = [];
  for (let col = 0; col <= numCols; col++) {
    vertices[col] = [];
    const isOdd = (col % 2 === 1) !== flipFirst;
    if (isOdd) {
      for (let row = 0; row <= numRows + 1; row++) {
        vertices[col][row] = {
          x: col * pitchX,
          y: row * h - h / 2,
        };
      }
    } else {
      for (let row = 0; row <= numRows; row++) {
        vertices[col][row] = {
          x: col * pitchX,
          y: row * h,
        };
      }
    }
  }

  const triangles = [];

  for (let col = 0; col < numCols; col++) {
    const isOdd = (col % 2 === 1) !== flipFirst;

    if (!isOdd) {
      for (let k = 0; k < numRows; k++) {
        const left = vertices[col];
        const right = vertices[col + 1];

        {
          const a = left[k];
          const b = left[k + 1];
          const d = right[k + 1];
          const cx = (a.x + b.x + d.x) / 3;
          const cy = (a.y + b.y + d.y) / 3;
          const lightness = getLightnessAt(cx, cy);
          const pattern = assignPattern(lightness, activePatterns);
          triangles.push({
            vertices: [a, b, d],
            center: { x: cx, y: cy },
            col, row: k,
            isInverted: false,
            lightness,
            pattern,
          });
        }
      }

      for (let k = 0; k <= numRows; k++) {
        const left = vertices[col];
        const right = vertices[col + 1];

        {
          const a = right[k];
          const b = right[k + 1];
          const d = left[k];
          const cx = (a.x + b.x + d.x) / 3;
          const cy = (a.y + b.y + d.y) / 3;
          const lightness = getLightnessAt(cx, cy);
          const pattern = assignPattern(lightness, activePatterns);
          triangles.push({
            vertices: [a, b, d],
            center: { x: cx, y: cy },
            col, row: k,
            isInverted: true,
            lightness,
            pattern,
          });
        }
      }
    } else {
      for (let k = 0; k <= numRows; k++) {
        const left = vertices[col];
        const right = vertices[col + 1];

        {
          const a = left[k];
          const b = left[k + 1];
          const d = right[k];
          const cx = (a.x + b.x + d.x) / 3;
          const cy = (a.y + b.y + d.y) / 3;
          const lightness = getLightnessAt(cx, cy);
          const pattern = assignPattern(lightness, activePatterns);
          triangles.push({
            vertices: [a, b, d],
            center: { x: cx, y: cy },
            col, row: k,
            isInverted: true,
            lightness,
            pattern,
          });
        }
      }

      for (let k = 0; k < numRows; k++) {
        const left = vertices[col];
        const right = vertices[col + 1];

        {
          const a = right[k];
          const b = right[k + 1];
          const d = left[k + 1];
          const cx = (a.x + b.x + d.x) / 3;
          const cy = (a.y + b.y + d.y) / 3;
          const lightness = getLightnessAt(cx, cy);
          const pattern = assignPattern(lightness, activePatterns);
          triangles.push({
            vertices: [a, b, d],
            center: { x: cx, y: cy },
            col, row: k,
            isInverted: false,
            lightness,
            pattern,
          });
        }
      }
    }
  }

  return triangles;
}
