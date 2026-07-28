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
 *   horizontal vertex spacing = pitch
 *   vertical vertex spacing   = pitch * sqrt(3) / 2
 *   odd rows offset by pitch / 2
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
  const pitch = (2 * h) / Math.sqrt(3);

  const cols = numCols + 1;
  const rows = numRows + 1;

  const vertices = [];
  for (let row = 0; row < rows; row++) {
    vertices[row] = [];
    const offsetX = (row % 2 === 1) ? pitchX / 2 : 0;
    for (let col = 0; col < cols; col++) {
      vertices[row][col] = {
        x: col * pitchX + offsetX,
        y: row * h,
      };
    }
  }

  const triangles = [];

  for (let row = 0; row < numRows; row++) {
    const isOdd = row % 2 === 1;

    const colsStart = isOdd ? 0 : 0;
    const colsEnd = isOdd ? numCols : numCols;

    for (let col = colsStart; col < colsEnd; col++) {
      if (!isOdd) {
        if (col < numCols) {
          const a = vertices[row][col];
          const b = vertices[row][col + 1];
          const c = vertices[row + 1][col];

          const cx = (a.x + b.x + c.x) / 3;
          const cy = (a.y + b.y + c.y) / 3;
          const lightness = getLightnessAt(cx, cy);
          const pattern = assignPattern(lightness, activePatterns);

          triangles.push({
            vertices: [a, b, c],
            center: { x: cx, y: cy },
            col, row,
            isInverted: false,
            lightness,
            pattern,
          });
        }

        if (col > 0) {
          const a = vertices[row][col];
          const b = vertices[row + 1][col];
          const c = vertices[row + 1][col - 1];

          const cx = (a.x + b.x + c.x) / 3;
          const cy = (a.y + b.y + c.y) / 3;
          const lightness = getLightnessAt(cx, cy);
          const pattern = assignPattern(lightness, activePatterns);

          triangles.push({
            vertices: [a, b, c],
            center: { x: cx, y: cy },
            col, row,
            isInverted: true,
            lightness,
            pattern,
          });
        }
      } else {
        if (col < numCols) {
          const a = vertices[row][col];
          const b = vertices[row + 1][col];
          const c = vertices[row + 1][col + 1];

          const cx = (a.x + b.x + c.x) / 3;
          const cy = (a.y + b.y + c.y) / 3;
          const lightness = getLightnessAt(cx, cy);
          const pattern = assignPattern(lightness, activePatterns);

          triangles.push({
            vertices: [a, b, c],
            center: { x: cx, y: cy },
            col, row,
            isInverted: false,
            lightness,
            pattern,
          });
        }

        if (col < numCols) {
          const a = vertices[row][col + 1];
          const b = vertices[row][col];
          const c = vertices[row + 1][col + 1];

          const cx = (a.x + b.x + c.x) / 3;
          const cy = (a.y + b.y + c.y) / 3;
          const lightness = getLightnessAt(cx, cy);
          const pattern = assignPattern(lightness, activePatterns);

          triangles.push({
            vertices: [a, b, c],
            center: { x: cx, y: cy },
            col, row,
            isInverted: true,
            lightness,
            pattern,
          });
        }
      }
    }
  }

  return triangles;
}
