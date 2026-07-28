import { NUM_PATTERNS, buildPatternSvg } from './patterns.js';

export const selectedPatterns = new Set([9, 5, 12, 13, 8, 20, 21]);

export function renderGallery() {
  const gallery = document.getElementById('patternGallery');
  gallery.innerHTML = '';
  for (let i = 1; i <= NUM_PATTERNS; i++) {
    const tile = document.createElement('div');
    tile.className = 'gtile' + (selectedPatterns.has(i) ? ' selected' : '');
    tile.dataset.i = i;

    const svg = buildPatternSvg(i, 90, 90, '#e8ddc9', '#241f19', false, 12);
    const img = document.createElement('img');
    img.src = 'data:image/svg+xml,' + encodeURIComponent(svg);
    tile.appendChild(img);

    const num = document.createElement('span');
    num.className = 'gnum'; num.textContent = i;
    tile.appendChild(num);
    if (selectedPatterns.has(i)) {
      const chk = document.createElement('span');
      chk.className = 'gcheck'; chk.textContent = '\u2713';
      tile.appendChild(chk);
    }
    tile.addEventListener('click', () => {
      if (selectedPatterns.has(i)) selectedPatterns.delete(i); else selectedPatterns.add(i);
      renderGallery();
      const btn = document.getElementById('processBtn');
      if (!btn.disabled) btn.click();
    });
    gallery.appendChild(tile);
  }
}

export function setupGalleryButtons() {
  document.getElementById('selectAllBtn').addEventListener('click', () => {
    for (let i = 1; i <= NUM_PATTERNS; i++) selectedPatterns.add(i);
    renderGallery();
    const btn = document.getElementById('processBtn');
    if (!btn.disabled) btn.click();
  });
  document.getElementById('selectNoneBtn').addEventListener('click', () => {
    selectedPatterns.clear();
    renderGallery();
    const btn = document.getElementById('processBtn');
    if (!btn.disabled) btn.click();
  });
}
