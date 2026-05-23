/**
 * DentAI – Annotator Module
 * Draws detection overlays on the OPG radiograph canvas:
 *   - Bounding boxes per tooth (color-coded by status)
 *   - FDI number labels
 *   - Status indicators
 *   - Arch divider lines
 *   - Confidence opacity mapping
 */

const Annotator = (() => {

  const STATUS_COLORS = {
    Healthy: { stroke: '#34d399', fill: 'rgba(52,211,153,0.12)', label: '#34d399' },
    Decayed: { stroke: '#f87171', fill: 'rgba(248,113,113,0.18)', label: '#f87171' },
    Missing: { stroke: '#fb923c', fill: 'rgba(251,146,60,0.10)',  label: '#fb923c' },
    Filled:  { stroke: '#60a5fa', fill: 'rgba(96,165,250,0.14)',  label: '#60a5fa' },
    Impacted: { stroke: '#a78bfa', fill: 'rgba(167,139,250,0.18)', label: '#a78bfa' },
    Root_Fragment: { stroke: '#fb923c', fill: 'rgba(251,146,60,0.18)', label: '#fb923c' },
    Needs_Review: { stroke: '#fbbf24', fill: 'rgba(251,191,36,0.18)', label: '#fbbf24' }
  };

  const STATUS_ICONS = {
    Healthy: '✓',
    Decayed: '✕',
    Missing: '○',
    Filled:  '◉',
    Impacted: '!',
    Root_Fragment: '↓',
    Needs_Review: '?'
  };

  /**
   * Draw a rounded rectangle path
   */
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /**
   * Draw dashed bounding box (for missing teeth)
   */
  function dashedBox(ctx, x, y, w, h, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.globalAlpha = 0.65;
    roundRect(ctx, x, y, w, h, 5);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Draw solid bounding box with fill
   */
  function solidBox(ctx, x, y, w, h, strokeColor, fillColor, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fillColor;
    roundRect(ctx, x, y, w, h, 5);
    ctx.fill();
    ctx.globalAlpha = alpha * 1.4;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth   = 1.8;
    roundRect(ctx, x, y, w, h, 5);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Draw FDI number label above the tooth box
   */
  function drawLabel(ctx, fdi, x, y, color, confidence) {
    const label = String(fdi);
    ctx.save();
    ctx.font      = 'bold 9px Inter, sans-serif';
    ctx.textAlign = 'center';

    // Background pill
    const tw = ctx.measureText(label).width + 6;
    const tx = x - tw / 2;
    const ty = y - 15;
    ctx.globalAlpha = 0.85;
    ctx.fillStyle   = 'rgba(5,11,24,0.8)';
    roundRect(ctx, tx, ty, tw, 13, 3);
    ctx.fill();

    // Text
    ctx.globalAlpha = 1;
    ctx.fillStyle   = color;
    ctx.fillText(label, x, y - 5);
    ctx.restore();
  }

  /**
   * Draw arch label (Upper / Lower)
   */
  function drawArchLabel(ctx, text, x, y, canvasWidth) {
    ctx.save();
    ctx.font         = 'bold 10px Inter, sans-serif';
    ctx.fillStyle    = 'rgba(139,174,212,0.55)';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 8, y);
    ctx.restore();
  }

  /**
   * Draw a subtle arch divider line
   */
  function drawDivider(ctx, y, width) {
    ctx.save();
    ctx.strokeStyle = 'rgba(96,165,250,0.18)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Main annotation function.
   * Draws all tooth detections onto destCanvas, sourcing pixels from srcCanvas.
   */
  function annotate(srcCanvas, destCanvas, teeth, showHeatmap = false) {
    const { width, height } = srcCanvas;
    destCanvas.width  = width;
    destCanvas.height = height;
    const ctx = destCanvas.getContext('2d');

    // Draw source image
    ctx.drawImage(srcCanvas, 0, 0);

    // Overlay dark tint to make annotations pop
    ctx.fillStyle = 'rgba(5,11,24,0.15)';
    ctx.fillRect(0, 0, width, height);

    // Arch divider
    const divY = height * 0.50;
    drawDivider(ctx, divY, width);
    drawArchLabel(ctx, 'UPPER ARCH', 8, height * 0.30, width);
    drawArchLabel(ctx, 'LOWER ARCH', 8, height * 0.72, width);

    // Draw each tooth
    for (const tooth of teeth) {
      const c = STATUS_COLORS[tooth.status];
      const { x, y, w, h } = tooth.bbox;
      const baseAlpha = 0.55 + (tooth.confidence / 100) * 0.35;
      
      // Calculate drawing opacities
      const alpha = showHeatmap ? baseAlpha * 0.3 : baseAlpha;
      const fillAlpha = showHeatmap ? 0.03 : c.fill;

      // Draw heatmap glow if enabled
      if (showHeatmap) {
        ctx.save();
        const cx = x + w / 2;
        const cy = y + h / 2;
        const radius = Math.max(w, h) * 0.85;

        // Establish the color of the glow
        let glowColor = 'rgba(52, 211, 153, 0.35)'; // Healthy (soft green)
        if (tooth.status === 'Decayed') {
          glowColor = 'rgba(248, 113, 113, 0.75)'; // Decayed (high-risk red)
        } else if (tooth.consensus === false) {
          glowColor = 'rgba(251, 191, 36, 0.7)';  // Disagreement (uncertainty amber)
        } else if (tooth.status === 'Missing') {
          glowColor = 'rgba(251, 146, 60, 0.4)';  // Missing (orange)
        } else if (tooth.status === 'Filled') {
          glowColor = 'rgba(96, 165, 250, 0.45)'; // Filled (blue)
        }

        const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, radius);
        grad.addColorStop(0, glowColor);
        grad.addColorStop(0.3, glowColor.replace(/[\d\.]+\)$/, '0.2)'));
        grad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (tooth.status === 'Missing') {
        dashedBox(ctx, x, y, w, h, c.stroke);
        // X marker for missing
        ctx.save();
        ctx.strokeStyle = c.stroke;
        ctx.lineWidth   = 1.5;
        ctx.globalAlpha = showHeatmap ? 0.2 : 0.6;
        const cx = x + w / 2, cy = y + h / 2, hs = Math.min(w, h) * 0.22;
        ctx.beginPath(); ctx.moveTo(cx - hs, cy - hs); ctx.lineTo(cx + hs, cy + hs); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + hs, cy - hs); ctx.lineTo(cx - hs, cy + hs); ctx.stroke();
        ctx.restore();
      } else {
        solidBox(ctx, x, y, w, h, c.stroke, showHeatmap ? 'rgba(0,0,0,0)' : c.fill, alpha);
      }

      // Status icon in box (only if heatmap is NOT active, or very subtle)
      if (!showHeatmap) {
        const iconX = x + w / 2;
        const iconY = y + h * 0.62;
        ctx.save();
        ctx.font      = `bold ${Math.max(9, Math.min(13, w * 0.38))}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = c.label;
        ctx.globalAlpha = 0.8;
        ctx.fillText(STATUS_ICONS[tooth.status], iconX, iconY);
        ctx.restore();
      }

      // FDI label (subtle in heatmap)
      drawLabel(ctx, tooth.fdi, x + w / 2, y, c.label, tooth.confidence);
    }

    // Confidence heatmap legend (bottom-right)
    drawLegend(ctx, width, height, showHeatmap);
  }

  function drawLegend(ctx, w, h, showHeatmap = false) {
    const items = [
      { label: 'Healthy', color: '#34d399' },
      { label: 'Decayed', color: '#f87171' },
      { label: 'Missing', color: '#fb923c' },
      { label: 'Filled',  color: '#60a5fa' },
    ];
    if (showHeatmap) {
      items.push({ label: 'Review Flag', color: '#fbbf24' });
    }
    const legendW = showHeatmap ? 104 : 88, itemH = 16, pad = 8;
    const legendH = items.length * itemH + pad * 2;
    const lx = w - legendW - 8;
    const ly = h - legendH - 8;

    ctx.save();
    ctx.globalAlpha = 0.82;
    ctx.fillStyle   = 'rgba(5,11,24,0.85)';
    roundRect(ctx, lx, ly, legendW, legendH, 6);
    ctx.fill();
    ctx.globalAlpha = 1;

    items.forEach((item, i) => {
      const iy = ly + pad + i * itemH;
      ctx.fillStyle  = item.color;
      ctx.fillRect(lx + pad, iy + 3, 8, 8);
      ctx.font       = '9px Inter, sans-serif';
      ctx.fillStyle  = 'rgba(240,246,255,0.75)';
      ctx.textBaseline = 'top';
      ctx.fillText(item.label, lx + pad + 12, iy + 2);
    });
    ctx.restore();
  }

  /**
   * Generate an enhanced (contrast-boosted) version for display
   */
  function renderEnhanced(srcCanvas, destCanvas) {
    const { width, height } = srcCanvas;
    destCanvas.width  = width;
    destCanvas.height = height;
    const ctx = destCanvas.getContext('2d');
    ctx.drawImage(srcCanvas, 0, 0);

    // Pseudo-colormap: map grayscale to blue-white
    const imgData = ctx.getImageData(0, 0, width, height);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const g = d[i];
      // Low intensity -> deep blue, mid -> cyan, high -> white
      if (g < 80) {
        d[i]   = Math.round(g * 0.3);
        d[i+1] = Math.round(g * 0.5);
        d[i+2] = Math.round(80 + g * 0.8);
      } else if (g < 160) {
        const t = (g - 80) / 80;
        d[i]   = Math.round(t * 180);
        d[i+1] = Math.round(80 + t * 160);
        d[i+2] = 255;
      } else {
        d[i] = d[i+1] = d[i+2] = Math.min(255, g + 20);
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Grid overlay
    ctx.save();
    ctx.strokeStyle = 'rgba(96,165,250,0.08)';
    ctx.lineWidth   = 0.5;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
    ctx.restore();
  }

  return { annotate, renderEnhanced, STATUS_COLORS };
})();
