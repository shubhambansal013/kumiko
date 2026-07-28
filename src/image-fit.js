export function getImageCrop(imgW, imgH, panelW, panelH, fitMode) {
  const imgAspect = imgW / imgH;
  const panelAspect = panelW / panelH;
  switch (fitMode) {
    case 'cover':
      if (imgAspect > panelAspect) {
        const cropW = imgH * panelAspect;
        return { sx: (imgW - cropW) / 2, sy: 0, sw: cropW, sh: imgH, dx: 0, dy: 0, dw: panelW, dh: panelH };
      } else {
        const cropH = imgW / panelAspect;
        return { sx: 0, sy: (imgH - cropH) / 2, sw: imgW, sh: cropH, dx: 0, dy: 0, dw: panelW, dh: panelH };
      }
    case 'contain': {
      const scale = Math.min(panelW / imgW, panelH / imgH);
      const drawW = imgW * scale;
      const drawH = imgH * scale;
      return { sx: 0, sy: 0, sw: imgW, sh: imgH, dx: (panelW - drawW) / 2, dy: (panelH - drawH) / 2, dw: drawW, dh: drawH };
    }
    default:
      return { sx: 0, sy: 0, sw: imgW, sh: imgH, dx: 0, dy: 0, dw: panelW, dh: panelH };
  }
}
