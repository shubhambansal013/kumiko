export function rgbToHex(r, g, b) {
  const toHex = c => {
    const hex = c.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  };
}

function colorLuminance(c) {
  return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
}

function colorDistSq(a, b) {
  const dr = a.r - b.r, dg = a.g - b.g, db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

export function kMeansCluster(colors, k, maxIterations = 20) {
  const n = colors.length;
  if (n === 0) return [];
  if (k >= n) return colors.map(c => ({ r: c.r, g: c.g, b: c.b }));

  const sorted = [...colors].sort((a, b) => colorLuminance(a) - colorLuminance(b));

  const centroids = [];
  for (let i = 0; i < k; i++) {
    const idx = Math.floor((i + 0.5) * n / k);
    centroids.push({ r: sorted[idx].r, g: sorted[idx].g, b: sorted[idx].b });
  }

  const assignments = new Int32Array(n);
  for (let iter = 0; iter < maxIterations; iter++) {
    let changed = false;
    for (let i = 0; i < n; i++) {
      let minDist = Infinity;
      let best = 0;
      for (let j = 0; j < k; j++) {
        const d = colorDistSq(colors[i], centroids[j]);
        if (d < minDist) { minDist = d; best = j; }
      }
      if (assignments[i] !== best) { assignments[i] = best; changed = true; }
    }
    if (!changed) break;

    const sums = Array.from({ length: k }, () => ({ r: 0, g: 0, b: 0, count: 0 }));
    for (let i = 0; i < n; i++) {
      const j = assignments[i];
      sums[j].r += colors[i].r;
      sums[j].g += colors[i].g;
      sums[j].b += colors[i].b;
      sums[j].count++;
    }
    for (let j = 0; j < k; j++) {
      if (sums[j].count > 0) {
        centroids[j].r = sums[j].r / sums[j].count;
        centroids[j].g = sums[j].g / sums[j].count;
        centroids[j].b = sums[j].b / sums[j].count;
      }
    }
  }

  return centroids;
}

export function nearestCentroid(color, centroids) {
  let best = centroids[0];
  let minDist = colorDistSq(color, best);
  for (let i = 1; i < centroids.length; i++) {
    const d = colorDistSq(color, centroids[i]);
    if (d < minDist) { minDist = d; best = centroids[i]; }
  }
  return { r: Math.round(best.r), g: Math.round(best.g), b: Math.round(best.b) };
}
