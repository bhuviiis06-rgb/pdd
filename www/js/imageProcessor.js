/**
 * DentAI – Image Processor Module
 * Handles OPG radiograph preprocessing:
 *   - Grayscale conversion
 *   - CLAHE-style contrast enhancement
 *   - Gaussian noise reduction
 *   - Edge sharpening
 *   - Quality assessment
 */

const ImageProcessor = (() => {

  /**
   * Load an image file into an HTMLImageElement
   */
  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload  = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to decode image'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Draw an image onto a canvas, returning the context + pixel data
   */
  function drawToCanvas(img, canvas) {
    const maxW = 1200, maxH = 600;
    let w = img.naturalWidth  || img.width;
    let h = img.naturalHeight || img.height;
    const scale = Math.min(maxW / w, maxH / h, 1);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
    canvas.width  = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    return ctx;
  }

  /**
   * Convert image to grayscale in-place on pixel data array
   */
  function toGrayscale(data) {
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      data[i] = data[i + 1] = data[i + 2] = gray;
    }
  }

  /**
   * Adaptive histogram equalization (simplified tile-based CLAHE)
   */
  function clahe(data, width, height, tileSize = 64, clipLimit = 4.0) {
    const gray = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
      gray[i] = data[i * 4]; // already grayscale
    }

    const tilesX = Math.ceil(width  / tileSize);
    const tilesY = Math.ceil(height / tileSize);

    // Build histogram + LUT per tile
    const luts = [];
    for (let ty = 0; ty < tilesY; ty++) {
      for (let tx = 0; tx < tilesX; tx++) {
        const x0 = tx * tileSize, y0 = ty * tileSize;
        const x1 = Math.min(x0 + tileSize, width);
        const y1 = Math.min(y0 + tileSize, height);
        const hist = new Array(256).fill(0);
        let count = 0;
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            hist[Math.round(gray[y * width + x])]++;
            count++;
          }
        }
        // Clip
        const excess = Math.max(0, hist.reduce((s, v) => s + Math.max(0, v - clipLimit * count / 256), 0));
        const add = Math.floor(excess / 256);
        for (let b = 0; b < 256; b++) {
          hist[b] = Math.min(hist[b] + add, clipLimit * count / 256);
        }
        // Build CDF -> LUT
        const lut = new Uint8Array(256);
        let cdf = 0, cdfMin = -1;
        for (let b = 0; b < 256; b++) {
          cdf += hist[b];
          if (cdfMin < 0 && hist[b] > 0) cdfMin = cdf;
          lut[b] = count > cdfMin ? Math.round((cdf - cdfMin) / (count - cdfMin) * 255) : 0;
        }
        luts.push(lut);
      }
    }

    // Bilinear interpolation of LUT values
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const txf = x / tileSize - 0.5;
        const tyf = y / tileSize - 0.5;
        const tx0 = Math.max(0, Math.floor(txf));
        const ty0 = Math.max(0, Math.floor(tyf));
        const tx1 = Math.min(tilesX - 1, tx0 + 1);
        const ty1 = Math.min(tilesY - 1, ty0 + 1);
        const ax  = txf - tx0, ay = tyf - ty0;
        const v   = Math.round(gray[y * width + x]);
        const v00 = luts[ty0 * tilesX + tx0][v];
        const v10 = luts[ty0 * tilesX + tx1][v];
        const v01 = luts[ty1 * tilesX + tx0][v];
        const v11 = luts[ty1 * tilesX + tx1][v];
        const out = (1 - ay) * ((1 - ax) * v00 + ax * v10) + ay * ((1 - ax) * v01 + ax * v11);
        const idx = (y * width + x) * 4;
        data[idx] = data[idx + 1] = data[idx + 2] = Math.round(Math.min(255, Math.max(0, out)));
      }
    }
  }

  /**
   * Simple 3x3 Gaussian blur for noise reduction
   */
  function gaussianBlur(data, width, height, sigma = 0.8) {
    const kernel = buildGaussian(3, sigma);
    const tmp = new Uint8ClampedArray(data.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0, wt = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const nx = Math.min(width  - 1, Math.max(0, x + kx));
            const ny = Math.min(height - 1, Math.max(0, y + ky));
            const k  = kernel[(ky + 1) * 3 + (kx + 1)];
            sum += data[(ny * width + nx) * 4] * k;
            wt  += k;
          }
        }
        const idx = (y * width + x) * 4;
        tmp[idx] = tmp[idx+1] = tmp[idx+2] = Math.round(sum / wt);
        tmp[idx+3] = 255;
      }
    }
    for (let i = 0; i < data.length; i++) data[i] = tmp[i];
  }

  function buildGaussian(size, sigma) {
    const k = [], r = Math.floor(size / 2);
    let sum = 0;
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        const v = Math.exp(-(x*x + y*y) / (2 * sigma * sigma));
        k.push(v); sum += v;
      }
    }
    return k.map(v => v / sum);
  }

  /**
   * Unsharp masking for edge enhancement
   */
  function unsharpMask(data, width, height, amount = 0.7) {
    const blurred = new Uint8ClampedArray(data.length);
    for (let i = 0; i < data.length; i++) blurred[i] = data[i];
    gaussianBlur(blurred, width, height, 1.5);
    for (let i = 0; i < data.length; i += 4) {
      const sharpened = data[i] + amount * (data[i] - blurred[i]);
      data[i] = data[i+1] = data[i+2] = Math.round(Math.min(255, Math.max(0, sharpened)));
    }
  }

  /**
   * Assess image quality (0–100)
   */
  function assessQuality(data, width, height) {
    // Sample brightness distribution
    const samples = [], step = Math.floor(width * height / 2000);
    for (let i = 0; i < width * height; i += step) {
      samples.push(data[i * 4]);
    }
    const mean = samples.reduce((a,b) => a+b, 0) / samples.length;
    const std  = Math.sqrt(samples.reduce((s, v) => s + (v - mean) ** 2, 0) / samples.length);

    // Good OPG: moderate brightness (80-180), good contrast (std > 40)
    const brightScore   = 100 - Math.abs(mean - 130) * 0.8;
    const contrastScore = Math.min(100, std * 2.2);
    const dimScore      = mean < 40 || mean > 230 ? 30 : 100;

    const quality = Math.round(
      Math.min(100, Math.max(0, (brightScore * 0.35 + contrastScore * 0.45 + dimScore * 0.2)))
    );
    return quality;
  }

  /**
   * Full preprocessing pipeline.
   * Returns { enhancedCanvas, qualityScore, width, height, imageData }
   */
  async function preprocess(file) {
    const img    = await loadImage(file);
    const canvas = document.createElement('canvas');
    const ctx    = drawToCanvas(img, canvas);

    const { width, height } = canvas;
    const imgData = ctx.getImageData(0, 0, width, height);
    const data    = imgData.data;

    // Step 1: Grayscale
    toGrayscale(data);

    // Step 2: CLAHE contrast
    clahe(data, width, height, 80, 3.5);

    // Step 3: Noise reduction
    gaussianBlur(data, width, height, 0.7);

    // Step 4: Edge sharpening
    unsharpMask(data, width, height, 0.6);

    const qualityScore = assessQuality(data, width, height);

    ctx.putImageData(imgData, 0, 0);
    return { enhancedCanvas: canvas, qualityScore, width, height, imageData: imgData };
  }

  return { preprocess, loadImage, drawToCanvas, assessQuality };
})();
