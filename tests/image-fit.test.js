import { describe, it, expect } from 'vitest';
import { getImageCrop } from '../src/image-fit.js';

describe('getImageCrop', () => {
  const imgW = 1200;
  const imgH = 800;
  const panelW = 400;
  const panelH = 500;

  it('stretch returns full source to full panel', () => {
    const r = getImageCrop(imgW, imgH, panelW, panelH, 'stretch');
    expect(r).toEqual({ sx: 0, sy: 0, sw: 1200, sh: 800, dx: 0, dy: 0, dw: 400, dh: 500 });
  });

  it('unknown mode defaults to stretch', () => {
    const r = getImageCrop(imgW, imgH, panelW, panelH, 'bogus');
    expect(r).toEqual({ sx: 0, sy: 0, sw: 1200, sh: 800, dx: 0, dy: 0, dw: 400, dh: 500 });
  });

  it('cover crops a wide image to panel aspect ratio', () => {
    // 1200/800 = 1.5, panel = 400/500 = 0.8 → img is wider → crop sides
    const r = getImageCrop(imgW, imgH, panelW, panelH, 'cover');
    const expectedCropW = imgH * (panelW / panelH); // 800 * 0.8 = 640
    const expectedSx = (imgW - expectedCropW) / 2; // (1200 - 640) / 2 = 280
    expect(r.sx).toBeCloseTo(expectedSx, 5);
    expect(r.sy).toBe(0);
    expect(r.sw).toBeCloseTo(expectedCropW, 5);
    expect(r.sh).toBe(imgH);
    expect(r.dx).toBe(0);
    expect(r.dy).toBe(0);
    expect(r.dw).toBe(panelW);
    expect(r.dh).toBe(panelH);
  });

  it('cover crops a tall image to panel aspect ratio', () => {
    // 400/600 = 0.667, panel = 400/500 = 0.8 → img is taller → crop top/bottom
    const r = getImageCrop(400, 600, panelW, panelH, 'cover');
    const expectedCropH = 400 / (400 / 500); // 400 / 0.8 = 500
    const expectedSy = (600 - expectedCropH) / 2; // (600 - 500) / 2 = 50
    expect(r.sx).toBe(0);
    expect(r.sy).toBeCloseTo(expectedSy, 5);
    expect(r.sw).toBe(400);
    expect(r.sh).toBeCloseTo(expectedCropH, 5);
  });

  it('cover handles exact aspect ratio match', () => {
    // 800/1000 = 0.8, panel = 400/500 = 0.8 → no crop
    const r = getImageCrop(800, 1000, panelW, panelH, 'cover');
    expect(r).toEqual({ sx: 0, sy: 0, sw: 800, sh: 1000, dx: 0, dy: 0, dw: 400, dh: 500 });
  });

  it('contain fits a wide image with pillarboxing', () => {
    // 1200/800 = 1.5, panel = 400/500 = 0.8 → wide image → limit by width
    // scale = min(400/1200, 500/800) = min(0.333, 0.625) = 0.333
    const r = getImageCrop(imgW, imgH, panelW, panelH, 'contain');
    expect(r.sw).toBe(1200);
    expect(r.sh).toBe(800);
    expect(r.dw).toBeCloseTo(400, 5);
    expect(r.dh).toBeCloseTo(266.6667, 4);
    expect(r.dx).toBe(0);
    expect(r.dy).toBeCloseTo(116.6667, 4);
  });

  it('contain fits a tall image with letterboxing', () => {
    // 400/600 = 0.667, panel = 400/500 = 0.8 → tall image → limit by width
    // scale = min(400/400, 500/600) = min(1, 0.833) = 0.833
    const r = getImageCrop(400, 600, 400, 500, 'contain');
    expect(r.sw).toBe(400);
    expect(r.sh).toBe(600);
    expect(r.dw).toBeCloseTo(333.3333, 4);
    expect(r.dh).toBe(500);
    expect(r.dx).toBeCloseTo(33.3333, 4);
    expect(r.dy).toBe(0);
  });

  it('contain handles exact aspect ratio match', () => {
    const r = getImageCrop(800, 1000, panelW, panelH, 'contain');
    expect(r).toEqual({ sx: 0, sy: 0, sw: 800, sh: 1000, dx: 0, dy: 0, dw: 400, dh: 500 });
  });

  it('contain with smaller image centers it', () => {
    // 200/200 = 1, panel = 400/500 = 0.8 → scale by min(400/200, 500/200) = min(2, 2.5) = 2
    const r = getImageCrop(200, 200, 400, 500, 'contain');
    expect(r).toEqual({
      sx: 0, sy: 0, sw: 200, sh: 200,
      dx: (400 - 400) / 2, // 0
      dy: (500 - 400) / 2, // 50
      dw: 400,
      dh: 400,
    });
  });
});
