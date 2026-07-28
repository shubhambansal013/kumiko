export function assignPattern(lightness, activePatterns) {
  if (!activePatterns || activePatterns.length === 0) return null;
  const bucketSize = 1 / activePatterns.length;
  const bucketIdx = Math.min(activePatterns.length - 1, Math.floor(lightness / bucketSize));
  return activePatterns[bucketIdx] ?? null;
}

/**
 * Generate a proper equilateral-triangle asanoha lattice.
 *
 * Geometry (equilateral triangles with side = pitch):
 *   horizontal vertex spacing = pitch * 2/sqrt(3)
 *   vertical vertex spacing   = pitch
 *   odd rows offset by pitchX / 2
 *
 * Odd rows include an extra vertex at -pitchX/2 so left-edge triangles
 * are complete; the rendering clips to the inner area.
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

  const rows = numRows + 1;

  const vertices = [];
  for (let row = 0; row < rows; row++) {
    vertices[row] = [];
    const isOdd = row % 2 === 1;
    if (isOdd) {
      for (let col = 0; col <= numCols + 1; col++) {
        vertices[row][col] = {
          x: col * pitchX - pitchX / 2,
          y: row * h,
        };
      }
    } else {
      for (let col = 0; col <= numCols; col++) {
        vertices[row][col] = {
          x: col * pitchX,
          y: row * h,
        };
      }
    }
  }

  const triangles = [];

  for (let row = 0; row < numRows; row++) {
    const isOdd = row % 2 === 1;

    if (!isOdd) {
      for (let c = 0; c < numCols; c++) {
        const top = vertices[row];
        const bot = vertices[row + 1];

        {
          const a = top[c];
          const b = top[c + 1];
          const d = bot[c + 1];
          const cx = (a.x + b.x + d.x) / 3;
          const cy = (a.y + b.y + d.y) / 3;
          const lightness = getLightnessAt(cx, cy);
          const pattern = assignPattern(lightness, activePatterns);
          triangles.push({
            vertices: [a, b, d],
            center: { x: cx, y: cy },
            col: c, row,
            isInverted: false,
            lightness,
            pattern,
          });
        }

        {
          const a = top[c];
          const d = bot[c];
          const e = bot[c + 1];
          const cx = (a.x + d.x + e.x) / 3;
          const cy = (a.y + d.y + e.y) / 3;
          const lightness = getLightnessAt(cx, cy);
          const pattern = assignPattern(lightness, activePatterns);
          triangles.push({
            vertices: [a, d, e],
            center: { x: cx, y: cy },
            col: c, row,
            isInverted: true,
            lightness,
            pattern,
          });
        }
      }
    } else {
      for (let c = 0; c <= numCols; c++) {
        const top = vertices[row];
        const bot = vertices[row + 1];

        if (c <= numCols) {
          const a = top[c];
          const b = top[c + 1];
          const d = bot[c];
          const cx = (a.x + b.x + d.x) / 3;
          const cy = (a.y + b.y + d.y) / 3;
          const lightness = getLightnessAt(cx, cy);
          const pattern = assignPattern(lightness, activePatterns);
          triangles.push({
            vertices: [a, b, d],
            center: { x: cx, y: cy },
            col: c, row,
            isInverted: true,
            lightness,
            pattern,
          });
        }
      }

      for (let c = 0; c < numCols; c++) {
        const top = vertices[row];
        const bot = vertices[row + 1];

        const a = bot[c];
        const b = bot[c + 1];
        const d = top[c + 1];
        const cx = (a.x + b.x + d.x) / 3;
        const cy = (a.y + b.y + d.y) / 3;
        const lightness = getLightnessAt(cx, cy);
        const pattern = assignPattern(lightness, activePatterns);
        triangles.push({
          vertices: [a, b, d],
          center: { x: cx, y: cy },
          col: c, row,
          isInverted: false,
          lightness,
          pattern,
        });
      }
    }
  }

  return triangles;
}
