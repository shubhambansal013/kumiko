export function applyZoomStyle(canvas, wrap) {
  if (!canvas) return;
  if (!canvas.zoomLevel) canvas.zoomLevel = 100;
  if (canvas.zoomLevel === 100) {
    canvas.style.width = '100%';
    canvas.style.maxWidth = '100%';
    if (wrap) {
      wrap.style.maxWidth = '100%';
      wrap.style.width = 'auto';
    }
  } else {
    canvas.style.width = canvas.zoomLevel + '%';
    canvas.style.maxWidth = 'none';
    if (wrap) {
      wrap.style.maxWidth = 'none';
      wrap.style.width = 'max-content';
    }
  }
}

export function drawPreview(canvasArea, sourceImg) {
  canvasArea.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'canvas-wrap';
  const c = document.createElement('canvas');
  const maxW = 760;
  const scale = Math.min(1, maxW / sourceImg.width);
  c.width = sourceImg.width * scale;
  c.height = sourceImg.height * scale;
  c.getContext('2d').drawImage(sourceImg, 0, 0, c.width, c.height);
  wrap.appendChild(c);
  canvasArea.appendChild(wrap);
}

export function renderOutput({ canvasArea, resultsEl, outputCanvas, lastCounts, currentZoomLevel, downloadImgBtn, downloadCsvBtn }) {
  canvasArea.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'canvas-wrap';

  outputCanvas.style.display = 'block';
  outputCanvas.style.background = '#eee';
  outputCanvas.zoomLevel = currentZoomLevel;
  applyZoomStyle(outputCanvas, wrap);

  wrap.appendChild(outputCanvas);
  canvasArea.appendChild(wrap);

  const { counts, patternName, sizeA, sizeB, total, totalPatterned, totalFlat, pitch, mitsuke, frameWidthMM, panelWidthMM, panelHeightMM } = lastCounts;

  let html = `<div class="section-title">Result \u2014 ${patternName}</div>`;
  html += `<div class="stats-row">
    <div class="stat"><b>${total}</b>Total triangles</div>
    <div class="stat"><b>${totalPatterned || 0}</b>Patterned pieces</div>
    <div class="stat"><b>${totalFlat || 0}</b>Flat/Empty pieces</div>
    <div class="stat"><b>${sizeA} \u00d7 ${sizeB}</b>Height \u00d7 Width</div>
    <div class="stat"><b>${panelWidthMM} \u00d7 ${panelHeightMM} mm</b>Panel size</div>
    <div class="stat"><b>${pitch} mm</b>Pitch</div>
  </div>`;

  html += `<table><thead><tr><th>Color</th><th>Pattern</th><th>Pieces</th><th>% of panel</th></tr></thead><tbody>`;
  Object.keys(counts).sort((a, b) => {
    const ca = counts[a].color, cb = counts[b].color;
    if (ca !== cb) return ca.localeCompare(cb);
    return a.localeCompare(b);
  }).forEach(key => {
    const item = counts[key];
    const pct = total > 0 ? ((item.count / total) * 100).toFixed(1) : '0.0';
    const colorCell = item.color === "N/A" ? "" : `<span class="swatch" style="background:${item.color}"></span>${item.color}`;
    html += `<tr>
      <td>${colorCell}</td>
      <td>${item.pattern}</td>
      <td>${item.count}</td>
      <td>${pct}%</td>
    </tr>`;
  });
  html += `</tbody></table>`;
  html += `<div class="hint" style="margin-top:10px;max-width:480px;">Frame (border) pieces aren't in this table \u2014 order those separately per Paper View's frame color/width spec.</div>`;

  resultsEl.innerHTML = html;
  downloadImgBtn.style.display = 'block';
  downloadCsvBtn.style.display = 'block';
}
