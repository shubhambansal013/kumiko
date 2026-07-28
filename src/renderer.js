let colorChangeCallback = null;

export function setColorChangeCallback(callback) {
  colorChangeCallback = callback;
}

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

function createColorInputGroup(combKey, patternKey, color, defaultColor, userOverrides) {
  const currentColor = userOverrides[patternKey] || color;
  const isDefault = !userOverrides[patternKey];
  const resetBtn = !isDefault ? `<button type="button" class="reset-color-btn" data-pattern="${patternKey}" title="Reset to default" style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:0.75rem;padding:0;margin-left:4px;">↩</button>` : '';
  return `<div class="color-input-group" data-comb="${combKey}" data-pattern="${patternKey}" style="display:flex;align-items:center;gap:4px;">
    <input type="color" class="result-color-picker" value="${currentColor}" style="width:28px;height:28px;padding:0;border:1px solid var(--line);border-radius:4px;cursor:pointer;">
    <input type="text" class="result-color-hex" value="${currentColor}" style="width:80px;font-family:monospace;font-size:0.8rem;text-transform:uppercase;border:1px solid var(--line);border-radius:4px;padding:2px 6px;">
    ${resetBtn}
  </div>`;
}

export function renderOutput({ canvasArea, resultsEl, outputCanvas, lastCounts, currentZoomLevel, downloadImgBtn, downloadCsvBtn, userColorOverrides = {}, originalColorMap = {}, originalColorByPattern = {} }) {
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
  }).forEach(combKey => {
    const item = counts[combKey];
    const pct = total > 0 ? ((item.count / total) * 100).toFixed(1) : '0.0';
    const patternKey = item.pattern;
    const defaultColor = originalColorMap[combKey]?.toUpperCase() || item.color.toUpperCase();
    const colorCell = item.color === "N/A" ? "" : createColorInputGroup(combKey, patternKey, item.color.toUpperCase(), defaultColor, userColorOverrides);
    html += `<tr>
      <td>${colorCell}</td>
      <td>${item.pattern}</td>
      <td>${item.count}</td>
      <td>${pct}%</td>
    </tr>`;
  });
  html += `</tbody></table>`;
  html += `<div class="hint" style="margin-top:10px;max-width:480px;">Frame (border) pieces aren't in this table \u2014 order those separately per Paper View's frame color/width spec.</div>`;
  html += `<div style="margin-top:12px; display:flex; gap:8px; align-items:center;">
    <button type="button" id="resetAllColorsBtn" class="ghost-btn" style="font-size:0.85rem; padding:6px 12px;">Reset all colors to defaults</button>
  </div>`;

  resultsEl.innerHTML = html;
  downloadImgBtn.style.display = 'block';
  downloadCsvBtn.style.display = 'block';

  function getPatternKey(group) {
    return group.dataset.pattern;
  }

  function updateResetBtn(group, isDefault) {
    const resetBtn = group.querySelector('.reset-color-btn');
    if (!isDefault && !resetBtn) {
      const patternKey = group.dataset.pattern;
      const newResetBtn = document.createElement('button');
      newResetBtn.type = 'button';
      newResetBtn.className = 'reset-color-btn';
      newResetBtn.dataset.pattern = patternKey;
      newResetBtn.title = 'Reset to default';
      newResetBtn.textContent = '↩';
      newResetBtn.style.cssText = 'background:none;border:none;color:var(--accent);cursor:pointer;font-size:0.75rem;padding:0;margin-left:4px;';
      group.querySelector('.result-color-hex').parentElement.appendChild(newResetBtn);
    } else if (isDefault && resetBtn) {
      resetBtn.remove();
    }
  }

  resultsEl.querySelectorAll('.result-color-picker').forEach(picker => {
    picker.addEventListener('input', (e) => {
      const group = e.target.closest('.color-input-group');
      const patternKey = getPatternKey(group);
      const hexInput = group.querySelector('.result-color-hex');
      const color = e.target.value.toUpperCase();
      hexInput.value = color;
      if (colorChangeCallback) colorChangeCallback(patternKey, color);

      const defaultColor = originalColorByPattern[patternKey]?.toUpperCase();
      const isDefault = defaultColor === color;
      updateResetBtn(group, isDefault);
    });
  });

  resultsEl.querySelectorAll('.result-color-hex').forEach(hexInput => {
    hexInput.addEventListener('input', (e) => {
      const group = e.target.closest('.color-input-group');
      const patternKey = getPatternKey(group);
      const picker = group.querySelector('.result-color-picker');
      let value = e.target.value.trim();
      if (!value.startsWith('#')) value = '#' + value;
      const validHex = /^#[0-9A-F]{6}$/i.test(value) || /^#[0-9A-F]{3}$/i.test(value);
      if (validHex) {
        if (value.length === 4) {
          value = '#' + value[1] + value[1] + value[2] + value[2] + value[3] + value[3];
        }
        const color = value.toUpperCase();
        e.target.value = color;
        picker.value = color;
        if (colorChangeCallback) colorChangeCallback(patternKey, color);

        const defaultColor = originalColorByPattern[patternKey]?.toUpperCase();
        const isDefault = defaultColor === color;
        updateResetBtn(group, isDefault);
      }
    });
  });

  resultsEl.querySelectorAll('.reset-color-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const group = e.target.closest('.color-input-group');
      const patternKey = group.dataset.pattern;
      const defaultColor = originalColorByPattern[patternKey]?.toUpperCase();
      if (!defaultColor) return;

      const picker = group.querySelector('.result-color-picker');
      const hexInput = group.querySelector('.result-color-hex');

      picker.value = defaultColor;
      hexInput.value = defaultColor;
      e.target.remove();

      if (colorChangeCallback) colorChangeCallback(patternKey, defaultColor);
    });
  });

  const resetAllBtn = resultsEl.querySelector('#resetAllColorsBtn');
  if (resetAllBtn) {
    resetAllBtn.addEventListener('click', () => {
      const patternKeys = Object.keys(originalColorByPattern);
      patternKeys.forEach(patternKey => {
        const defaultColor = originalColorByPattern[patternKey]?.toUpperCase();
        if (!defaultColor) return;

        const groups = resultsEl.querySelectorAll(`.color-input-group[data-pattern="${patternKey}"]`);
        groups.forEach(group => {
          const picker = group.querySelector('.result-color-picker');
          const hexInput = group.querySelector('.result-color-hex');
          const resetBtn = group.querySelector('.reset-color-btn');
          if (picker) picker.value = defaultColor;
          if (hexInput) hexInput.value = defaultColor;
          if (resetBtn) resetBtn.remove();
        });

        if (colorChangeCallback) colorChangeCallback(patternKey, defaultColor);
      });
    });
  }
}