import { getPatternFeatures } from './patterns.js';

/**
 * Multi-dimensional pattern matching using weighted Euclidean distance.
 *
 * @param {object} triFeatures – { lightness (0..1), stdDev, chroma }
 * @param {Array} activePatterns – pattern index list
 * @param {Array} patternFeatures – pre-computed [{index, density, detail}]
 * @param {object} weights – { density, detail, color } (0..1 each)
 * @returns {number|null} matched pattern index (1-based), or null
 */
// Backward-compat alias for tests
export function assignPattern(lightness, activePatterns) {
  if (!activePatterns || activePatterns.length === 0) return null;
  const bucketSize = 1 / activePatterns.length;
  const rawIdx = Math.floor(lightness / bucketSize);
  const bucketIdx = activePatterns.length - 1 - Math.min(activePatterns.length - 1, rawIdx);
  return activePatterns[bucketIdx] ?? null;
}

export function assignMultiDimPattern(triFeatures, activePatterns, patternFeatures, weights) {
  if (!activePatterns || activePatterns.length === 0) return null;
  // Handle both old (number) and new (object) feature formats
  const lightness = typeof triFeatures === 'number' ? triFeatures : triFeatures.lightness;
  const triDensity = 1 - lightness;
  const triDetail = typeof triFeatures === 'number' ? 0 : Math.min(1, (triFeatures.stdDev || 0));
  const triChroma = typeof triFeatures === 'number' ? 0 : (triFeatures.chroma || 0);
  const wD = (weights && weights.density) || 0;
  const wDet = (weights && weights.detail) || 0;
  const wC = (weights && weights.color) || 0;

  // Non-linear: high-chroma triangles boost detail weight so colorful textured
  // areas get intricate patterns, while flat-color areas favor density matching.
  const effectiveDetailWeight = wDet * (1 + wC * triChroma);

  let bestDist = Infinity;
  let bestIdx = activePatterns[0];
  for (const patIdx of activePatterns) {
    const pf = patternFeatures[patIdx - 1];
    if (!pf) continue;
    const dDen = triDensity - pf.density;
    const dDet = triDetail - pf.detail;
    const dist = wD * dDen * dDen + effectiveDetailWeight * dDet * dDet;
    if (dist < bestDist) { bestDist = dist; bestIdx = patIdx; }
  }
  return bestIdx;
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
 * @param {Function} getFeaturesAt – (vertices) → { lightness, stdDev, chroma }
 * @param {Array}  patternFeatures – pre-computed pattern feature vectors
 * @param {object} weights – { density, detail, color }
 * @returns {Array} triangles
 */
export function generateLockedGrid(innerW, innerH, numCols, numRows, activePatterns, getFeaturesAt, patternFeatures, weights) {
  const hasFeatures = Array.isArray(patternFeatures) && patternFeatures.length > 0;
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
          const raw = getFeaturesAt([a, b, d]);
          const features = typeof raw === 'number' ? { lightness: raw, stdDev: 0, chroma: 0 } : raw;
          const pattern = hasFeatures
            ? assignMultiDimPattern(features, activePatterns, patternFeatures, weights)
            : assignPattern(features.lightness, activePatterns);
          triangles.push({
            vertices: [a, b, d],
            center: { x: (a.x + b.x + d.x) / 3, y: (a.y + b.y + d.y) / 3 },
            col, row: k,
            isInverted: true,
            lightness: features.lightness,
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
          const raw = getFeaturesAt([a, b, d]);
          const features = typeof raw === 'number' ? { lightness: raw, stdDev: 0, chroma: 0 } : raw;
          const pattern = hasFeatures
            ? assignMultiDimPattern(features, activePatterns, patternFeatures, weights)
            : assignPattern(features.lightness, activePatterns);
          triangles.push({
            vertices: [a, b, d],
            center: { x: (a.x + b.x + d.x) / 3, y: (a.y + b.y + d.y) / 3 },
            col, row: k,
            isInverted: false,
            lightness: features.lightness,
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
          const raw = getFeaturesAt([a, b, d]);
          const features = typeof raw === 'number' ? { lightness: raw, stdDev: 0, chroma: 0 } : raw;
          const pattern = hasFeatures
            ? assignMultiDimPattern(features, activePatterns, patternFeatures, weights)
            : assignPattern(features.lightness, activePatterns);
          triangles.push({
            vertices: [a, b, d],
            center: { x: (a.x + b.x + d.x) / 3, y: (a.y + b.y + d.y) / 3 },
            col, row: k,
            isInverted: true,
            lightness: features.lightness,
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
          const raw = getFeaturesAt([a, b, d]);
          const features = typeof raw === 'number' ? { lightness: raw, stdDev: 0, chroma: 0 } : raw;
          const pattern = hasFeatures
            ? assignMultiDimPattern(features, activePatterns, patternFeatures, weights)
            : assignPattern(features.lightness, activePatterns);
          triangles.push({
            vertices: [a, b, d],
            center: { x: (a.x + b.x + d.x) / 3, y: (a.y + b.y + d.y) / 3 },
            col, row: k,
            isInverted: false,
            lightness: features.lightness,
            pattern,
          });
        }
      }
    }
  }

  return triangles;
}
