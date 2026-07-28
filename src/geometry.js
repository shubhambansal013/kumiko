export function polygonBoundsAndAvgColor(poly, imgData, w, h) {
  if (poly.length < 3) return null;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  poly.forEach(p => {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  });
  minX = Math.max(0, Math.floor(minX));
  maxX = Math.min(w - 1, Math.ceil(maxX));
  minY = Math.max(0, Math.floor(minY));
  maxY = Math.min(h - 1, Math.ceil(maxY));

  function pointInPoly(px, py) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
      const intersect = ((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  let rSum = 0, gSum = 0, bSum = 0, n = 0;
  const step = 2;
  const samples = [];
  for (let y = minY; y <= maxY; y += step) {
    for (let x = minX; x <= maxX; x += step) {
      if (pointInPoly(x, y)) {
        const idx = (y * w + x) * 4;
        const r = imgData[idx];
        const g = imgData[idx + 1];
        const b = imgData[idx + 2];
        rSum += r;
        gSum += g;
        bSum += b;
        samples.push(0.299 * r + 0.587 * g + 0.114 * b);
        n++;
      }
    }
  }
  if (n === 0) {
    const cx = Math.floor((minX + maxX) / 2), cy = Math.floor((minY + maxY) / 2);
    const idx = (Math.min(h - 1, Math.max(0, cy)) * w + Math.min(w - 1, Math.max(0, cx))) * 4;
    return { r: imgData[idx], g: imgData[idx + 1], b: imgData[idx + 2], stdDev: 0 };
  }
  const rAvg = rSum / n;
  const gAvg = gSum / n;
  const bAvg = bSum / n;

  const lAvg = 0.299 * rAvg + 0.587 * gAvg + 0.114 * bAvg;
  let sqDiffSum = 0;
  for (let i = 0; i < samples.length; i++) {
    sqDiffSum += (samples[i] - lAvg) ** 2;
  }
  const stdDev = Math.sqrt(sqDiffSum / n);

  return { r: rAvg, g: gAvg, b: bAvg, stdDev: stdDev };
}
