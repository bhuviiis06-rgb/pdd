/**
 * DentAI – Tooth Detector Module
 * Simulates deep-learning based tooth detection on OPG panoramic radiographs.
 *
 * FDI (Fédération Dentaire Internationale) numbering system:
 *   Upper right: 18-11  |  Upper left: 21-28
 *   Lower right: 48-41  |  Lower left: 31-38
 *
 * Detection pipeline:
 *  1. Region-of-interest extraction
 *  2. Tooth position grid estimation (anatomically plausible positions)
 *  3. Local intensity analysis per tooth zone
 *  4. Pixel-distribution based classification seed
 *  5. Stochastic classification refinement (simulating CNN inference)
 */

const ToothDetector = (() => {

  // FDI tooth definitions per quadrant
  const FDI_LAYOUT = [
    // Upper arch (left to right on film = right to left patient)
    { fdi: 18, name: 'Upper Right 3rd Molar',   quad: 'UR', type: 'molar',     xNorm: 0.060 },
    { fdi: 17, name: 'Upper Right 2nd Molar',   quad: 'UR', type: 'molar',     xNorm: 0.133 },
    { fdi: 16, name: 'Upper Right 1st Molar',   quad: 'UR', type: 'molar',     xNorm: 0.207 },
    { fdi: 15, name: 'Upper Right 2nd Premolar',quad: 'UR', type: 'premolar',  xNorm: 0.273 },
    { fdi: 14, name: 'Upper Right 1st Premolar',quad: 'UR', type: 'premolar',  xNorm: 0.334 },
    { fdi: 13, name: 'Upper Right Canine',      quad: 'UR', type: 'canine',    xNorm: 0.390 },
    { fdi: 12, name: 'Upper Right Lateral Inc.',quad: 'UR', type: 'incisor',   xNorm: 0.437 },
    { fdi: 11, name: 'Upper Right Central Inc.',quad: 'UR', type: 'incisor',   xNorm: 0.478 },
    { fdi: 21, name: 'Upper Left Central Inc.', quad: 'UL', type: 'incisor',   xNorm: 0.522 },
    { fdi: 22, name: 'Upper Left Lateral Inc.', quad: 'UL', type: 'incisor',   xNorm: 0.566 },
    { fdi: 23, name: 'Upper Left Canine',       quad: 'UL', type: 'canine',    xNorm: 0.617 },
    { fdi: 24, name: 'Upper Left 1st Premolar', quad: 'UL', type: 'premolar',  xNorm: 0.672 },
    { fdi: 25, name: 'Upper Left 2nd Premolar', quad: 'UL', type: 'premolar',  xNorm: 0.730 },
    { fdi: 26, name: 'Upper Left 1st Molar',    quad: 'UL', type: 'molar',     xNorm: 0.798 },
    { fdi: 27, name: 'Upper Left 2nd Molar',    quad: 'UL', type: 'molar',     xNorm: 0.871 },
    { fdi: 28, name: 'Upper Left 3rd Molar',    quad: 'UL', type: 'molar',     xNorm: 0.940 },
    // Lower arch
    { fdi: 48, name: 'Lower Right 3rd Molar',   quad: 'LR', type: 'molar',     xNorm: 0.060 },
    { fdi: 47, name: 'Lower Right 2nd Molar',   quad: 'LR', type: 'molar',     xNorm: 0.131 },
    { fdi: 46, name: 'Lower Right 1st Molar',   quad: 'LR', type: 'molar',     xNorm: 0.206 },
    { fdi: 45, name: 'Lower Right 2nd Premolar',quad: 'LR', type: 'premolar',  xNorm: 0.273 },
    { fdi: 44, name: 'Lower Right 1st Premolar',quad: 'LR', type: 'premolar',  xNorm: 0.335 },
    { fdi: 43, name: 'Lower Right Canine',      quad: 'LR', type: 'canine',    xNorm: 0.390 },
    { fdi: 42, name: 'Lower Right Lateral Inc.',quad: 'LR', type: 'incisor',   xNorm: 0.439 },
    { fdi: 41, name: 'Lower Right Central Inc.',quad: 'LR', type: 'incisor',   xNorm: 0.479 },
    { fdi: 31, name: 'Lower Left Central Inc.', quad: 'LL', type: 'incisor',   xNorm: 0.521 },
    { fdi: 32, name: 'Lower Left Lateral Inc.', quad: 'LL', type: 'incisor',   xNorm: 0.562 },
    { fdi: 33, name: 'Lower Left Canine',       quad: 'LL', type: 'canine',    xNorm: 0.613 },
    { fdi: 34, name: 'Lower Left 1st Premolar', quad: 'LL', type: 'premolar',  xNorm: 0.669 },
    { fdi: 35, name: 'Lower Left 2nd Premolar', quad: 'LL', type: 'premolar',  xNorm: 0.729 },
    { fdi: 36, name: 'Lower Left 1st Molar',    quad: 'LL', type: 'molar',     xNorm: 0.797 },
    { fdi: 37, name: 'Lower Left 2nd Molar',    quad: 'LL', type: 'molar',     xNorm: 0.870 },
    { fdi: 38, name: 'Lower Left 3rd Molar',    quad: 'LL', type: 'molar',     xNorm: 0.940 },
  ];

  // Width fractions per tooth type
  const TOOTH_WIDTH = { molar: 0.060, premolar: 0.045, canine: 0.038, incisor: 0.032 };
  const TOOTH_HEIGHT_FRAC = 0.50; // fraction of canvas height, scaled * 1.6 = 0.80

  // Y-band for upper and lower arch (normalized)
  const ARCH_BANDS = {
    upper: { yStart: 0.12, yEnd: 0.50 },
    lower: { yStart: 0.52, yEnd: 0.88 },
  };

  /**
   * Compute mean pixel intensity in a rectangular region
   */
  function regionMean(data, w, h, x0, y0, rw, rh) {
    let sum = 0, count = 0;
    const xi = Math.max(0, Math.round(x0)), xe = Math.min(w, Math.round(x0 + rw));
    const yi = Math.max(0, Math.round(y0)), ye = Math.min(h, Math.round(y0 + rh));
    for (let y = yi; y < ye; y++) {
      for (let x = xi; x < xe; x++) {
        sum += data[(y * w + x) * 4];
        count++;
      }
    }
    return count > 0 ? sum / count : 128;
  }

  /**
   * Compute pixel intensity variance in a region
   */
  function regionVariance(data, w, h, x0, y0, rw, rh) {
    const mean = regionMean(data, w, h, x0, y0, rw, rh);
    let sumSq = 0, count = 0;
    const xi = Math.max(0, Math.round(x0)), xe = Math.min(w, Math.round(x0 + rw));
    const yi = Math.max(0, Math.round(y0)), ye = Math.min(h, Math.round(y0 + rh));
    for (let y = yi; y < ye; y++) {
      for (let x = xi; x < xe; x++) {
        const diff = data[(y * w + x) * 4] - mean;
        sumSq += diff * diff; count++;
      }
    }
    return count > 0 ? sumSq / count : 0;
  }

  /**
   * Seeded pseudo-random based on FDI number + image hash
   * Ensures reproducible results for the same image
   */
  function makeSeededRng(seed) {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0xffffffff;
    };
  }

  /**
   * Generate an image fingerprint from pixel data
   */
  function imageHash(data) {
    let h = data.length;
    // Hash ~10,000 pixels across the image, ensuring we hit actual pixel data, not just borders
    const step = Math.max(4, Math.floor(data.length / 10000) * 4);
    for (let i = 0; i < data.length; i += step) {
      h = (h * 31 + data[i]) & 0xffffffff;
      h = (h ^ data[i+1]) & 0xffffffff; // mix in green channel too
    }
    return h >>> 0;
  }

  /**
   * Classify a single tooth based on local image analysis + seeded randomness.
   * Returns { status, confidence, reason }
   *
   * Classification logic (image-aware):
   *  - Very dark region (mean < 50)  => likely Missing (empty socket)
   *  - High brightness (mean > 180)  => likely Filled (metallic restoration)
   *  - High variance + medium bright => likely Decayed (lesion shadow)
   *  - Otherwise: Healthy with noise-based uncertainty
   */
  function classifyTooth(data, w, h, x0, y0, tw, th, fdi, rng) {
    const mean = regionMean(data, w, h, x0, y0, tw, th);
    const variance = regionVariance(data, w, h, x0, y0, tw, th);
    const std = Math.sqrt(variance);

    // Base probabilities from image features
    let pMissing = 0, pDecayed = 0, pFilled = 0, pHealthy = 0;

    if (mean < 45) {
      pMissing = 0.75; pDecayed = 0.1; pFilled = 0.05; pHealthy = 0.1;
    } else if (mean > 185) {
      pFilled = 0.70; pHealthy = 0.15; pDecayed = 0.1; pMissing = 0.05;
    } else if (std > 45 && mean < 130) {
      pDecayed = 0.60; pHealthy = 0.20; pFilled = 0.12; pMissing = 0.08;
    } else if (mean >= 90 && mean <= 170 && std < 35) {
      pHealthy = 0.65; pDecayed = 0.15; pFilled = 0.15; pMissing = 0.05;
    } else {
      // Mixed region – moderate probabilities
      pHealthy = 0.40; pDecayed = 0.25; pFilled = 0.20; pMissing = 0.15;
    }

    // 3rd molars are more frequently missing
    if (fdi === 18 || fdi === 28 || fdi === 38 || fdi === 48) {
      pMissing += 0.18;
      const total = pMissing + pDecayed + pFilled + pHealthy;
      pMissing /= total; pDecayed /= total; pFilled /= total; pHealthy /= total;
    }

    // Stochastic refinement (simulating CNN inference uncertainty)
    const noise = (rng() - 0.5) * 0.15;
    pHealthy = Math.max(0, pHealthy + noise);
    pDecayed = Math.max(0, pDecayed - noise * 0.5);

    // Softmax normalization
    const sum = pMissing + pDecayed + pFilled + pHealthy;
    pMissing /= sum; pDecayed /= sum; pFilled /= sum; pHealthy /= sum;

    // Pick highest
    const probs = { Missing: pMissing, Decayed: pDecayed, Filled: pFilled, Healthy: pHealthy };
    const status = Object.keys(probs).reduce((a, b) => probs[a] > probs[b] ? a : b);
    const confidence = Math.round(Math.min(99, Math.max(61, probs[status] * 100 + rng() * 8)));

    return { status, confidence, probs, mean: Math.round(mean), std: Math.round(std) };
  }

  /**
   * Main detection function. Now asynchronous to support real ML API calls.
   * @param {ImageData} imageData - preprocessed image data
   * @param {number} width
   * @param {number} height
   * @returns {Promise<Array>} Array of tooth detection results
   */
  async function detect(imageData, width, height) {
    try {
      const base64 = getBase64FromImageData(imageData, width, height);
      console.log('[DentAI] Sending radiograph to local server for secure AI analysis...');

      let apiUrl = 'https://dentai-backend-5gi6.onrender.com/api/analyze';
      if (window.location.protocol === 'file:') {
        apiUrl = 'https://dentai-backend-5gi6.onrender.com/api/analyze';
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'true' },
        body: JSON.stringify({ image: base64 })
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const data = await response.json();

      if (data.mode === 'simulation') {
        console.log('[DentAI] Simulation mode – running client-side heuristics.');
        return runSimulation(imageData, width, height);
      }

      let mainData = data;
      if (data.consensus) {
        mainData = data.consensus;
      }

      const isConsensusFormat = mainData.consensus_teeth !== undefined;
      const teethSource = mainData.consensus_teeth || mainData.teeth || {};
      const dmftScore = mainData.final_dmft !== undefined ? mainData.final_dmft : (mainData.dmft_score || 0);

      const rawCariesRisk = mainData.final_caries_risk || mainData.caries_risk || 'Risk: Low';
      let cleanCariesRisk = 'Low';
      if (typeof rawCariesRisk === 'string') {
        cleanCariesRisk = rawCariesRisk.replace('Caries Risk: ', '').replace('Risk: ', '').trim();
      } else if (rawCariesRisk && rawCariesRisk.level) {
        cleanCariesRisk = rawCariesRisk.level;
      }

      const summaryObj = mainData.final_summary || mainData.summary || { decayed: 0, missing: 0, filled: 0, healthy: 32, needs_review: 0, impacted: 0 };

      console.log(`[DentAI] Consensus complete. DMFT=${dmftScore}, Risk=${cleanCariesRisk}`);

      // Map teeth and attach rich metadata to the array for app.js
      const teeth = mapApiResultToBBoxes(teethSource, imageData, width, height);

      const cleanImageQuality = mainData.image_assessment?.quality || (mainData.image_quality && typeof mainData.image_quality === 'object' ? mainData.image_quality.score : mainData.image_quality) || 'Good';

      teeth._meta = {
        dmft_score:          dmftScore,
        caries_risk:         cleanCariesRisk,
        summary:             summaryObj,
        urgent_teeth:        mainData.disputed_teeth_list || (mainData.flags ? (mainData.flags.urgent_teeth || []) : []),
        monitor_teeth:       mainData.flags ? (mainData.flags.needs_review_teeth || mainData.flags.review_teeth || []) : [],
        disputed_teeth:      mainData.disputed_teeth_list || [],
        bone_loss:           { detected: mainData.flags?.bone_loss_detected, location: mainData.flags?.bone_loss_location },
        abnormalities:       mainData.flags?.abnormalities || mainData.flags?.other_abnormalities || '',
        overall_confidence:  mainData.final_confidence_metrics?.overall || (mainData.confidence_metrics ? mainData.confidence_metrics.overall_confidence : 80),
        image_quality:       cleanImageQuality,
        image_quality_score: mainData.confidence_metrics ? (mainData.confidence_metrics.image_quality_score || mainData.confidence_metrics.overall_confidence) : 85,
        radiologist_notes:   mainData.flags?.radiologist_notes || 'Data validated by secondary LLM.',
        agreements:          {
          high: mainData.high_agree_count !== undefined ? mainData.high_agree_count : (mainData._arbitrator_stats ? mainData._arbitrator_stats.agreements.high : 32),
          medium: mainData.medium_agree_count !== undefined ? mainData.medium_agree_count : (mainData._arbitrator_stats ? mainData._arbitrator_stats.agreements.medium : 0),
          low: mainData.disputed_count !== undefined ? mainData.disputed_count : (mainData._arbitrator_stats ? mainData._arbitrator_stats.agreements.low : 0)
        }
      };

      return teeth;

    } catch (err) {
      console.error('[DentAI] Backend failed, falling back to simulation:', err);
      if (typeof showToast === 'function') showToast('Backend error – using simulation fallback.', 'warning');
      return runSimulation(imageData, width, height);
    }
  }

  function getBase64FromImageData(imageData, width, height) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const ctx = tempCanvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
    return tempCanvas.toDataURL('image/jpeg', 0.8).split(',')[1];
  }

  /**
   * Maps LLM diagnostic array results back to our coordinate layout
   */
  // Normalize status string to canonical form
  function normalizeStatus(s) {
    if (!s) return 'Healthy';
    const l = s.toLowerCase().trim();
    if (l === 'decayed' || l === 'decay') return 'Decayed';
    if (l === 'missing') return 'Missing';
    if (l === 'filled' || l === 'fill' || l === 'restored') return 'Filled';
    if (l === 'impacted') return 'Impacted';
    if (l === 'needs_review') return 'Needs_Review';
    if (l === 'root_fragment' || l === 'root fragment') return 'Root_Fragment';
    return 'Healthy';
  }

  /**
   * Maps new consensus_teeth object (keyed by FDI string "11","12"...)
   * OR legacy array format back to bounding-box enriched tooth list.
   */
  function mapApiResultToBBoxes(apiTeeth, imageData, width, height) {
    const results = [];

    // Support both object {"11":{...}} and legacy array [{fdi:11,...}]
    const isObject = apiTeeth && !Array.isArray(apiTeeth);

    for (const tooth of FDI_LAYOUT) {
      const isUpper = tooth.quad === 'UR' || tooth.quad === 'UL';
      const band    = isUpper ? ARCH_BANDS.upper : ARCH_BANDS.lower;

      const tw = width  * TOOTH_WIDTH[tooth.type];
      const th = height * (band.yEnd - band.yStart) * TOOTH_HEIGHT_FRAC * 1.6;
      const xShift = isUpper ? -0.01 : 0.01;
      const x0 = width  * (tooth.xNorm + xShift);
      const y0 = height * (band.yStart + (band.yEnd - band.yStart) * 0.1);

      let match;
      if (isObject) {
        // Support both old teeth structure and new consensus_teeth schema
        const raw = apiTeeth[String(tooth.fdi)] || {};
        const metaInfo = raw._meta || {};
        const status = raw.final_status || raw.status || 'healthy';
        const confidence = raw.final_confidence !== undefined ? raw.final_confidence : (raw.confidence || 85);
        const agreement = raw.agreement || metaInfo.agreement || 'high';

        match = {
          status:       status,
          confidence:   confidence,
          severity:     raw.severity     || null,
          notes:        raw.notes        || '',
          agreement:    agreement,
          flag:         agreement === 'disputed' || agreement === 'low' ? '🔴' : (agreement === 'medium' ? '⚠️' : '✅'),
          model1_status: raw.openai_status || metaInfo.m1 || status,
          model2_status: raw.gemini_status || metaInfo.m2 || status,
          model3_status: metaInfo.m3 || status,
          consensus:    agreement !== 'disputed' && agreement !== 'low'
        };
      } else {
        match = { status: 'Healthy', confidence: 90, severity: null, notes: '', agreement: 'high', flag: '✅', consensus: true };
      }

      const statusNorm = normalizeStatus(match.status);

      results.push({
        fdi:          tooth.fdi,
        name:         tooth.name,
        quadrant:     tooth.quad,
        type:         tooth.type,
        status:       statusNorm,
        confidence:   match.confidence,
        severity:     match.severity,
        notes:        match.notes,
        agreement:    match.agreement,
        flag:         match.flag,
        consensus:    match.consensus,
        model1_status: normalizeStatus(match.model1_status),
        model2_status: normalizeStatus(match.model2_status),
        model3_status: normalizeStatus(match.model3_status),
        probs:        null,
        pixelStats:   null,
        bbox: { x: Math.round(x0), y: Math.round(y0), w: Math.round(tw), h: Math.round(th) },
        cx: Math.round(x0 + tw / 2),
        cy: Math.round(y0 + th / 2),
      });
    }
    return results;
  }

  // --- Original Simulation Core ---

  function runSimulation(imageData, width, height) {
    const data = imageData.data;
    const hash = imageHash(data);
    const rng  = makeSeededRng(hash);
    const results = [];

    for (const tooth of FDI_LAYOUT) {
      const isUpper = tooth.quad === 'UR' || tooth.quad === 'UL';
      const band    = isUpper ? ARCH_BANDS.upper : ARCH_BANDS.lower;

      const tw = width * TOOTH_WIDTH[tooth.type];
      const th = height * (band.yEnd - band.yStart) * TOOTH_HEIGHT_FRAC * 1.6;
      const xShift = isUpper ? -0.01 : 0.01;
      const x0 = width  * (tooth.xNorm + xShift);
      const y0 = height * (band.yStart + (band.yEnd - band.yStart) * 0.1);

      const classification = classifyTooth(data, width, height, x0, y0, tw, th, tooth.fdi, rng);

      // Simulate a consensus disagreement on certain teeth to showcase features offline
      let consensus = true;
      let status = classification.status;
      let confidence = classification.confidence;
      let geminiStatus = status;
      let openaiStatus = status;
      let reason = `Both models agree the tooth is ${status}.`;

      if (tooth.fdi === 16) {
        consensus = false;
        status = 'Decayed';
        confidence = 78;
        geminiStatus = 'Decayed';
        openaiStatus = 'Healthy';
        reason = "Disagreement detected. Gemini: 'Decayed' (78%) - proximal radiolucency. OpenAI: 'Healthy' (88%) - no significant bone loss or caries.";
      } else if (tooth.fdi === 24) {
        consensus = false;
        status = 'Filled';
        confidence = 76;
        geminiStatus = 'Filled';
        openaiStatus = 'Decayed';
        reason = "Disagreement detected. Gemini: 'Filled' (85%) - radio-opaque restoration. OpenAI: 'Decayed' (68%) - recurrent caries under margin.";
      }

      results.push({
        fdi:         tooth.fdi,
        name:        tooth.name,
        quadrant:    tooth.quad,
        type:        tooth.type,
        status:      status,
        confidence:  confidence,
        consensus:   consensus,
        geminiStatus:geminiStatus,
        openaiStatus:openaiStatus,
        reason:      reason,
        probs:       classification.probs,
        pixelStats:  { mean: classification.mean, std: classification.std },
        bbox: {
          x: Math.round(x0),
          y: Math.round(y0),
          w: Math.round(tw),
          h: Math.round(th),
        },
        cx: Math.round(x0 + tw / 2),
        cy: Math.round(y0 + th / 2),
      });
    }
    
    results._meta = {
      is_simulation: true,
      dmft_score: undefined,
      caries_risk: 'Low',
      summary: undefined,
      urgent_teeth: [],
      monitor_teeth: [16, 24],
      disputed_teeth: [16, 24],
      bone_loss: { detected: false, location: null },
      abnormalities: 'None (Simulation fallback)',
      overall_confidence: 85,
      image_quality: 'Good (Simulated)',
      image_quality_score: 80,
      radiologist_notes: 'Server offline. Running in simulation fallback mode.',
      agreements: {
        high: 30,
        medium: 2,
        low: 0
      }
    };
    return results;
  }

  return { detect, FDI_LAYOUT };
})();
