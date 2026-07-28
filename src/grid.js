export function assignPattern(lightness, activePatterns) {
  if (!activePatterns || activePatterns.length === 0) return null;
  const bucketSize = 1 / activePatterns.length;
  const bucketIdx = Math.min(activePatterns.length - 1, Math.floor(lightness / bucketSize));
  return activePatterns[bucketIdx] ?? null;
}

export function generateLockedGrid(panelWidth, panelHeight, numCols, numRows, activePatterns, getLightnessAt) {
  const W = (2 * panelWidth) / (numCols + 1);
  const H = panelHeight / numRows;
  const colH = W / 2;

  const triangles = [];

  for (let col = 0; col < numCols; col++) {
    const x0 = col * colH;
    const parity = col % 2;

    for (let row = 0; row < numRows; row++) {
      const yBase = row * H;
      const offsetY = parity * (H / 2);

      const ax = x0;
      const ay = yBase + offsetY;
      const bx = x0 + colH;
      const by = yBase + offsetY + H / 2;
      const cx = x0;
      const cy = yBase + offsetY + H;

      const centerUpX = (ax + bx + cx) / 3;
      const centerUpY = (ay + by + cy) / 3;

      const lightnessUp = getLightnessAt(centerUpX, centerUpY);
      const patternUp = assignPattern(lightnessUp, activePatterns);

      triangles.push({
        vertices: [{ x: ax, y: ay }, { x: bx, y: by }, { x: cx, y: cy }],
        center: { x: centerUpX, y: centerUpY },
        col, row,
        isInverted: false,
        lightness: lightnessUp,
        pattern: patternUp,
      });

      const dx = x0 + colH;
      const dy = yBase + offsetY;
      const ex = x0;
      const ey = yBase + offsetY + H / 2;
      const fx = x0 + colH;
      const fy = yBase + offsetY + H;

      const centerDownX = (dx + ex + fx) / 3;
      const centerDownY = (dy + ey + fy) / 3;

      const lightnessDown = getLightnessAt(centerDownX, centerDownY);
      const patternDown = assignPattern(lightnessDown, activePatterns);

      triangles.push({
        vertices: [{ x: dx, y: dy }, { x: ex, y: ey }, { x: fx, y: fy }],
        center: { x: centerDownX, y: centerDownY },
        col, row,
        isInverted: true,
        lightness: lightnessDown,
        pattern: patternDown,
      });
    }
  }

  return triangles;
}
