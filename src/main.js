import './style.css';
import { DEFAULT_IMAGE_B64 } from './default-image.js';
import { rgbToHex, kMeansCluster, nearestCentroid } from './utils.js';
import { polygonBoundsAndAvgColor } from './geometry.js';
import { generateLockedGrid } from './grid.js';
import { paintPatternTile, sortPatternsByDensity, getPatternFeatures } from './patterns.js';
import { selectedPatterns, renderGallery, setupGalleryButtons } from './gallery.js';
import { drawPreview, applyZoomStyle, renderOutput } from './renderer.js';
import { getImageCrop } from './image-fit.js';

const fileInput = document.getElementById('fileInput');
const processBtn = document.getElementById('processBtn');
const canvasArea = document.getElementById('canvasArea');
const resultsEl = document.getElementById('results');
const downloadImgBtn = document.getElementById('downloadImgBtn');
const downloadCsvBtn = document.getElementById('downloadCsvBtn');
const zoomSlider = document.getElementById('zoomSlider');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const zoomResetBtn = document.getElementById('zoomResetBtn');
const zoomValLabel = document.getElementById('zoomValLabel');
const mitsukeInput = document.getElementById('mitsuke');
const patternThicknessInput = document.getElementById('patternThickness');

let currentZoomLevel = 100;
let sourceImg = null;
let outputCanvas = null;
let lastCounts = null;

const patternFeatures = getPatternFeatures();

function syncPatternThicknessPlaceholder() {
  if (mitsukeInput && patternThicknessInput) {
    patternThicknessInput.placeholder = mitsukeInput.value;
  }
}
if (mitsukeInput) {
  mitsukeInput.addEventListener('input', syncPatternThicknessPlaceholder);
  syncPatternThicknessPlaceholder();
}

function setupColorSync(colorId, hexId) {
  const colorInput = document.getElementById(colorId);
  const hexInput = document.getElementById(hexId);

  colorInput.addEventListener('input', (e) => {
    hexInput.value = e.target.value.toUpperCase();
    if (sourceImg) processBtn.click();
  });

  hexInput.addEventListener('input', (e) => {
    let value = e.target.value.trim();
    if (!value.startsWith('#')) {
      value = '#' + value;
    }
    const validHex = /^#[0-9A-F]{6}$/i.test(value) || /^#[0-9A-F]{3}$/i.test(value);
    if (validHex) {
      if (value.length === 4) {
        value = '#' + value[1] + value[1] + value[2] + value[2] + value[3] + value[3];
      }
      colorInput.value = value;
      if (sourceImg) processBtn.click();
    }
  });
}

setupColorSync('frameColor', 'frameColorHex');
setupColorSync('jigumiColor', 'jigumiColorHex');
setupColorSync('backfillColor', 'backfillColorHex');

function loadDefaultImage() {
  const img = new Image();
  img.onload = () => {
    sourceImg = img;
    processBtn.disabled = false;
    drawPreview(canvasArea, sourceImg);
    processBtn.click();
  };
  img.src = 'data:image/jpeg;base64,' + DEFAULT_IMAGE_B64;
}
window.addEventListener('DOMContentLoaded', loadDefaultImage);

renderGallery();
setupGalleryButtons();

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => { sourceImg = img; processBtn.disabled = false; drawPreview(canvasArea, sourceImg); };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

function processingDebug(label, data) {
  if (location.search.includes('debug')) console.log(`[kumiko-debug] ${label}:`, data);
}

processBtn.addEventListener('click', async () => {
  if (!sourceImg) return;

  const sizeA = Math.max(1, parseInt(document.getElementById('sizeA').value) || 1);
  const sizeB = Math.max(1, parseInt(document.getElementById('sizeB').value) || 1);
  const pitch = parseFloat(document.getElementById('pitch').value) || 50;
  const mitsuke = parseFloat(document.getElementById('mitsuke').value) || 0;
  const frameWidthMM = parseFloat(document.getElementById('frameWidth').value) || 0;
  const frameColor = document.getElementById('frameColor').value;
  const jigumiColor = document.getElementById('jigumiColor').value;

  processingDebug('params', { sizeA, sizeB, pitch, mitsuke, frameWidthMM });

  const patternName = "Kumiko Pattern Map";

  const innerWidthMM = sizeB * pitch * Math.sqrt(3) / 2;
  const innerHeightMM = sizeA * pitch;
  const panelWidthMM = innerWidthMM + frameWidthMM * 2;
  const panelHeightMM = innerHeightMM + frameWidthMM * 2;

  const W = 2400;
  const pxPerMM = W / panelWidthMM;
  const H = Math.round(panelHeightMM * pxPerMM);

  const W_sample = 800;
  const pxPerMM_sample = W_sample / panelWidthMM;
  const H_sample = Math.round(panelHeightMM * pxPerMM_sample);

  const frameWidthPx = frameWidthMM * pxPerMM;
  const mitsukePx = Math.max(0.5, mitsuke * pxPerMM);
  const patternLinePx = mitsukePx * 0.8;
  const innerWpx = innerWidthMM * pxPerMM;
  const innerHpx = innerHeightMM * pxPerMM;
  const s = W_sample / W;

  processingDebug('dimensions', { innerWpx, innerHpx, W, H, W_sample, H_sample, pxPerMM, frameWidthPx, patternLinePx, s });

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = W_sample; srcCanvas.height = H_sample;
  const sctx = srcCanvas.getContext('2d');
  const fitMode = document.getElementById('imageFit').value;
  const r = getImageCrop(sourceImg.naturalWidth, sourceImg.naturalHeight, innerWpx, innerHpx, fitMode);
  sctx.fillStyle = '#ffffff';
  sctx.fillRect(0, 0, W_sample, H_sample);
  sctx.drawImage(sourceImg, r.sx, r.sy, r.sw, r.sh, (frameWidthPx + r.dx) * s, (frameWidthPx + r.dy) * s, r.dw * s, r.dh * s);
  const imgData = sctx.getImageData(0, 0, W_sample, H_sample).data;

  outputCanvas = document.createElement('canvas');
  outputCanvas.width = W; outputCanvas.height = H;
  const octx = outputCanvas.getContext('2d');

  const showImage = document.getElementById('showImage').checked;
  const showPattern = document.getElementById('showPattern').checked;

  octx.fillStyle = frameColor;
  octx.fillRect(0, 0, W, H);

  if (showImage) {
    octx.save();
    octx.beginPath();
    octx.rect(frameWidthPx, frameWidthPx, innerWpx, innerHpx);
    octx.clip();
    octx.drawImage(sourceImg, r.sx, r.sy, r.sw, r.sh, frameWidthPx + r.dx, frameWidthPx + r.dy, r.dw, r.dh);
    octx.restore();
  } else {
    octx.fillStyle = "#ffffff";
    octx.fillRect(frameWidthPx, frameWidthPx, innerWpx, innerHpx);
  }

  const backfillColor = document.getElementById('backfillColor').value;
  const activePatterns = sortPatternsByDensity(Array.from(selectedPatterns.values()), patternLinePx);
  processingDebug('activePatterns (by density)', activePatterns);

  const wDensity = parseFloat(document.getElementById('wDensity')?.value || 50) / 100;
  const wDetail = parseFloat(document.getElementById('wDetail')?.value || 30) / 100;
  const wColor = parseFloat(document.getElementById('wColor')?.value || 20) / 100;

  // Adaptive stdDev normalization — estimate 95th percentile from image patches
  const maxStdDev = (() => {
    const step = 20, radius = 4;
    const vals = [];
    for (let y = radius; y + radius < H_sample; y += step) {
      for (let x = radius; x + radius < W_sample; x += step) {
        const samples = [];
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const idx = ((y + dy) * W_sample + (x + dx)) * 4;
            samples.push(0.299 * imgData[idx] + 0.587 * imgData[idx + 1] + 0.114 * imgData[idx + 2]);
          }
        }
        const m = samples.reduce((a, b) => a + b, 0) / samples.length;
        vals.push(Math.sqrt(samples.reduce((s, v) => s + (v - m) ** 2, 0) / samples.length));
      }
    }
    vals.sort((a, b) => a - b);
    return Math.max(1, vals[Math.floor(0.95 * vals.length)]);
  })();

  const gridTriangles = generateLockedGrid(
    innerWpx, innerHpx, sizeB, sizeA,
    activePatterns,
    (vertices) => {
      const scaled = vertices.map(p => ({
        x: (p.x + frameWidthPx) * (W_sample / W),
        y: (p.y + frameWidthPx) * (W_sample / W)
      }));
      const avg = polygonBoundsAndAvgColor(scaled, imgData, W_sample, H_sample);
      if (!avg) return { lightness: 0.5, stdDev: 0, chroma: 0 };
      const lightness = (avg.r + avg.g + avg.b) / (3 * 255);
      const stdDev = Math.min(1, (avg.stdDev || 0) / maxStdDev);
      const chroma = (Math.max(avg.r, avg.g, avg.b) - Math.min(avg.r, avg.g, avg.b)) / 255;
      return { lightness, stdDev, chroma };
    },
    patternFeatures,
    { density: wDensity, detail: wDetail, color: wColor }
  );

  const processedTriangles = [];
  for (const t of gridTriangles) {
    const sampleClipped = t.vertices.map(p => ({
      x: (p.x + frameWidthPx) * (W_sample / W),
      y: (p.y + frameWidthPx) * (W_sample / W)
    }));

    const avg = polygonBoundsAndAvgColor(sampleClipped, imgData, W_sample, H_sample);
    if (!avg) continue;

    processedTriangles.push({
      t,
      avg,
      isPatterned: t.pattern !== null,
    });
  }

  const numColors = Math.max(1, parseInt(document.getElementById('numInsertColors').value) || 3);
  const patternColors = processedTriangles.filter(pt => pt.isPatterned).map(pt => pt.avg);
  if (patternColors.length > 1 && numColors < patternColors.length) {
    const centroids = kMeansCluster(patternColors, Math.min(numColors, patternColors.length));
    for (const pt of processedTriangles) {
      if (pt.isPatterned) {
        pt.avg = nearestCentroid(pt.avg, centroids);
      }
    }
  }

  const counts = {};
  let totalPieces = 0;
  let totalPatterned = 0;
  let totalFlat = 0;

  octx.save();
  octx.translate(frameWidthPx, frameWidthPx);
  octx.beginPath();
  octx.rect(0, 0, innerWpx, innerHpx);
  octx.clip();

  for (const { t, avg, isPatterned } of processedTriangles) {
    const hexColor = rgbToHex(Math.round(avg.r), Math.round(avg.g), Math.round(avg.b));
    const v = t.vertices;

    octx.save();
    octx.beginPath();
    octx.moveTo(v[0].x, v[0].y);
    octx.lineTo(v[1].x, v[1].y);
    octx.lineTo(v[2].x, v[2].y);
    octx.closePath();
    octx.clip();

    const pNum = t.pattern;

    if (showPattern && pNum > 0) {
      const opacityVal = parseFloat(document.getElementById('backfillOpacity').value);
      const opacity = isNaN(opacityVal) ? 0.5 : opacityVal;

      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      v.forEach(p => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); });

      paintPatternTile(octx, pNum, minX, minY, Math.max(1, maxX - minX), Math.max(1, maxY - minY), hexColor, backfillColor, t.isInverted, opacity, patternLinePx);
      totalPatterned++;
    } else {
      totalFlat++;
    }
    octx.restore();

    const patternKey = pNum > 0 ? "Pattern " + pNum : "Flat/None";
    const colorKey = pNum > 0 ? hexColor.toUpperCase() : "N/A";
    const combKey = pNum > 0 ? (patternKey + "_" + colorKey) : "Flat/None";

    if (!counts[combKey]) {
      counts[combKey] = { pattern: patternKey, color: colorKey, count: 0 };
    }
    counts[combKey].count++;
    totalPieces++;

    octx.beginPath();
    octx.moveTo(v[0].x, v[0].y);
    octx.lineTo(v[1].x, v[1].y);
    octx.lineTo(v[2].x, v[2].y);
    octx.closePath();
    octx.lineWidth = mitsukePx;
    octx.strokeStyle = jigumiColor;
    octx.stroke();
  }

  octx.restore();

  processingDebug('distribution', Object.fromEntries(
    [...new Set(processedTriangles.map(t => t.pattern || 'flat'))].map(k => [k, processedTriangles.filter(x => (x.pattern || 'flat') === k).length])
  ));
  const lightnesses = processedTriangles.map(t => t.t?.lightness).filter(l => l !== undefined);
  if (lightnesses.length) {
    const sortedL = [...lightnesses].sort((a, b) => a - b);
    const sum = sortedL.reduce((a, b) => a + b, 0);
    processingDebug('lightness', { min: sortedL[0], max: sortedL[sortedL.length - 1], avg: sum / sortedL.length, count: sortedL.length });
  }

  lastCounts = {
    counts, patternName, sizeA, sizeB, total: totalPieces,
    totalPatterned, totalFlat,
    pitch, mitsuke, frameWidthMM,
    panelWidthMM: panelWidthMM.toFixed(0), panelHeightMM: panelHeightMM.toFixed(0)
  };
  renderOutput({ canvasArea, resultsEl, outputCanvas, lastCounts, currentZoomLevel, downloadImgBtn, downloadCsvBtn });
});

downloadImgBtn.addEventListener('click', () => {
  if (!outputCanvas) return;
  const a = document.createElement('a');
  a.download = 'kumiko-color-map.png';
  a.href = outputCanvas.toDataURL('image/png');
  a.click();
});

downloadCsvBtn.addEventListener('click', () => {
  if (!lastCounts) return;
  let csv = 'pattern,color,pieces,percent\n';
  Object.keys(lastCounts.counts).sort((a, b) => {
    const ca = lastCounts.counts[a].color, cb = lastCounts.counts[b].color;
    if (ca !== cb) return ca.localeCompare(cb);
    return a.localeCompare(b);
  }).forEach(key => {
    const item = lastCounts.counts[key];
    const pct = lastCounts.total > 0 ? ((item.count / lastCounts.total) * 100).toFixed(1) : '0.0';
    csv += `"${item.pattern}","${item.color}",${item.count},${pct}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.download = 'kumiko-piece-count.csv';
  a.href = URL.createObjectURL(blob);
  a.click();
});

function updateZoom(newZoom) {
  newZoom = Math.max(100, Math.min(400, newZoom));
  currentZoomLevel = newZoom;
  if (outputCanvas) {
    outputCanvas.zoomLevel = newZoom;
    const wrap = canvasArea.querySelector('.canvas-wrap');
    applyZoomStyle(outputCanvas, wrap);
  }
  if (zoomSlider) {
    zoomSlider.value = newZoom;
  }
  if (zoomValLabel) {
    zoomValLabel.textContent = newZoom + '%';
  }
}

if (zoomSlider) {
  zoomSlider.addEventListener('input', (e) => {
    updateZoom(parseInt(e.target.value));
  });
}
if (zoomInBtn) {
  zoomInBtn.addEventListener('click', () => {
    updateZoom(currentZoomLevel + 10);
  });
}
if (zoomOutBtn) {
  zoomOutBtn.addEventListener('click', () => {
    updateZoom(currentZoomLevel - 10);
  });
}
if (zoomResetBtn) {
  zoomResetBtn.addEventListener('click', () => {
    updateZoom(100);
  });
}

document.getElementById('showImage').addEventListener('change', () => {
  if (sourceImg) {
    processBtn.click();
  }
});
document.getElementById('showPattern').addEventListener('change', () => {
  if (sourceImg) {
    processBtn.click();
  }
});
document.getElementById('imageFit').addEventListener('change', () => {
  if (sourceImg) processBtn.click();
});

function setupWeightSlider(id, labelId) {
  const slider = document.getElementById(id);
  const label = document.getElementById(labelId);
  if (slider && label) {
    const update = () => { label.textContent = slider.value + '%'; };
    slider.addEventListener('input', () => {
      update();
      if (sourceImg) processBtn.click();
    });
    update();
  }
}
setupWeightSlider('wDensity', 'wDensityVal');
setupWeightSlider('wDetail', 'wDetailVal');
setupWeightSlider('wColor', 'wColorVal');
