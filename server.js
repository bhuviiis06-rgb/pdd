/**
 * DentAI – Backend Server v3 (Strict Conservative Consensus)
 * Multi-model consensus OPG analysis: Gemini (x2) + OpenAI GPT-4o
 * Strict JSON schema with Data Validator step.
 */

const express = require('express');
const cors = require('cors');

// Polyfill for MongoDB driver missing global crypto in older Node environments
const crypto = require('crypto');
if (typeof global.crypto === 'undefined') {
  global.crypto = crypto;
}
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = crypto;
}
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const mongoose = require('mongoose');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dentai')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

const { exec } = require('child_process');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(__dirname));

// ─── Rich OPG Analysis Prompt ────────────────────────────────────────────────
const OPG_PROMPT = `You are Dr. DentAI, a world-class dental radiologist with 30 years of experience reading OPG (Orthopantomogram) panoramic X-rays.

You are known for being ACCURATE, BALANCED and CONSISTENT.
You never overcount. You never undercount. You report what you clearly see.

════════════════════════════════════════
STEP 1: IMAGE QUALITY ASSESSMENT
════════════════════════════════════════
First examine the overall image before looking at any tooth:

□ Is the image centered? (if not, left/right side may be cut off)
□ Is the image sharp or blurry?
□ Are all teeth clearly visible?
□ Is there any distortion or artifact?

Quality Scoring:
- Excellent → all teeth sharp, centered, no artifacts
- Good      → minor blur, slightly off-center
- Fair      → moderate blur, some teeth unclear  
- Poor      → significant blur, major areas unclear

⚠️ If quality is Fair or Poor:
   → Increase needs_review assignments
   → Lower all confidence scores by 15-20%
   → Note which regions are unclear

════════════════════════════════════════
STEP 2: SYSTEMATIC TOOTH EXAMINATION
════════════════════════════════════════
Examine teeth in this exact order using FDI numbering:

UPPER RIGHT → UPPER LEFT → LOWER LEFT → LOWER RIGHT
18,17,16,15,14,13,12,11 → 21,22,23,24,25,26,27,28
31,32,33,34,35,36,37,38 → 41,42,43,44,45,46,47,48

For EACH tooth ask yourself:
1. Can I clearly see this tooth? (yes/no)
2. What is the tooth structure like?
3. Are there dark shadows? (possible decay)
4. Are there bright white areas? (possible filling)
5. Is the tooth space empty? (possible missing)
6. How confident am I? (0-100%)

════════════════════════════════════════
STEP 3: STRICT STATUS CLASSIFICATION
════════════════════════════════════════

"healthy" → assign when:
  ✓ Clear tooth structure visible
  ✓ No dark shadows or lesions
  ✓ No bright restoration spots
  ✓ Normal bone level around tooth
  ✓ Confidence ≥ 70%

"decayed" → assign ONLY when ALL true:
  ✓ CLEAR dark shadow or cavity visible
  ✓ Shadow has irregular shape (not just blur)
  ✓ Affects tooth crown or root clearly
  ✓ Confidence ≥ 80%
  ✗ If ANY doubt exists → use needs_review instead

"filled" → assign when:
  ✓ Bright white radiopaque area visible
  ✓ Has defined clear boundary
  ✓ Distinguishable from tooth structure
  ✓ Confidence ≥ 75%

"missing" → assign when:
  ✓ Tooth space clearly empty
  ✓ No root or crown visible
  ✓ Adjacent teeth may have drifted
  ✓ Confidence ≥ 80%

"impacted" → assign when:
  ✓ Tooth visible but below bone level
  ✓ Not erupted into normal position
  ✓ Usually wisdom teeth (18,28,38,48)

"needs_review" → assign when:
  ✓ Confidence is between 55-79%
  ✓ Image is unclear in that region
  ✓ Finding is ambiguous
  ✓ You are not fully sure
  ⚠️ DO NOT count in DMFT score

════════════════════════════════════════
STEP 4: CONFIDENCE SCORING RULES
════════════════════════════════════════
Each tooth gets individual confidence score.

Then calculate:
- decay_confidence = average of ALL decayed teeth confidence scores
- filling_confidence = average of ALL filled teeth confidence scores  
- missing_confidence = average of ALL missing teeth confidence scores
- overall_confidence = average of (decay + filling + missing confidence)

CRITICAL RULE:
overall_confidence MUST be ≤ lowest subcategory confidence
Example: if decay=65%, filling=99%, missing=83%
→ overall = average = 82% BUT cap at 65% (lowest)
→ overall_confidence = 65%

════════════════════════════════════════
STEP 5: DMFT CALCULATION
════════════════════════════════════════
DMFT = Decayed + Missing + Filled

STRICT RULES:
□ needs_review → NOT counted in DMFT
□ impacted     → NOT counted in DMFT  
□ healthy      → NOT counted in DMFT
□ Only D + M + F = DMFT

Verify: decayed + missing + filled = dmft_score
Verify: decayed + missing + filled + healthy 
        + needs_review + impacted = 32

════════════════════════════════════════
STEP 6: CARIES CLASSIFICATION
════════════════════════════════════════
Use DMFT score to set BOTH labels from this table:
(Both labels MUST always match — never set separately)

DMFT = 0     → experience: "Very Low Caries Experience"
               risk: "Caries Risk: Very Low"

DMFT = 1-5   → experience: "Low Caries Experience"  
               risk: "Caries Risk: Low"

DMFT = 6-9   → experience: "Moderate Caries Experience"
               risk: "Caries Risk: Moderate"

DMFT = 10-13 → experience: "High Caries Experience"
               risk: "Caries Risk: High"

DMFT ≥ 14   → experience: "Very High Caries Experience"
               risk: "Caries Risk: Very High"

════════════════════════════════════════
STEP 7: MANDATORY SELF-CHECK
════════════════════════════════════════
Before returning JSON, verify ALL of these:

□ Check 1: D + M + F = dmft_score?
□ Check 2: All statuses total = 32 teeth?
□ Check 3: overall_confidence ≤ lowest subcategory?
□ Check 4: caries_experience matches caries_risk?
□ Check 5: No tooth marked decayed if confidence < 80%?
□ Check 6: No tooth marked missing if confidence < 80%?
□ Check 7: Are needs_review teeth listed in flags?
□ Check 8: Does decay count seem realistic for this X-ray?
           (Typical OPG: 0-6 decayed is normal,
            7-12 is high, 13+ is very rare — double check)

If ANY check fails → fix before responding.

════════════════════════════════════════
RETURN THIS EXACT JSON FORMAT:
════════════════════════════════════════
{
  "image_assessment": {
    "quality": "Poor|Fair|Good|Excellent",
    "centered": true|false,
    "all_teeth_visible": true|false,
    "unclear_regions": "describe or null",
    "quality_penalty_applied": true|false
  },

  "teeth": {
    "11": { "status": "healthy|decayed|filled|missing|impacted|needs_review", "confidence": "[0-100]", "severity": "mild|moderate|severe|null", "surface": "occlusal|mesial|distal|buccal|lingual|null", "notes": "" },
    "12": { "status": "healthy|decayed|filled|missing|impacted|needs_review", "confidence": "[0-100]", "severity": "mild|moderate|severe|null", "surface": "occlusal|mesial|distal|buccal|lingual|null", "notes": "" },
    "13": { "status": "healthy|decayed|filled|missing|impacted|needs_review", "confidence": "[0-100]", "severity": "mild|moderate|severe|null", "surface": "occlusal|mesial|distal|buccal|lingual|null", "notes": "" },
    "14": { "status": "healthy|decayed|filled|missing|impacted|needs_review", "confidence": "[0-100]", "severity": "mild|moderate|severe|null", "surface": "occlusal|mesial|distal|buccal|lingual|null", "notes": "" },
    "15": { "status": "healthy|decayed|filled|missing|impacted|needs_review", "confidence": "[0-100]", "severity": "mild|moderate|severe|null", "surface": "occlusal|mesial|distal|buccal|lingual|null", "notes": "" },
    "16": { "status": "healthy|decayed|filled|missing|impacted|needs_review", "confidence": "[0-100]", "severity": "mild|moderate|severe|null", "surface": "occlusal|mesial|distal|buccal|lingual|null", "notes": "" },
    "17": { "status": "healthy|decayed|filled|missing|impacted|needs_review", "confidence": "[0-100]", "severity": "mild|moderate|severe|null", "surface": "occlusal|mesial|distal|buccal|lingual|null", "notes": "" },
    "18": { "status": "healthy|decayed|filled|missing|impacted|needs_review", "confidence": "[0-100]", "severity": "mild|moderate|severe|null", "surface": "occlusal|mesial|distal|buccal|lingual|null", "notes": "" },
    "21": { "status": "healthy|decayed|filled|missing|impacted|needs_review", "confidence": "[0-100]", "severity": "mild|moderate|severe|null", "surface": "occlusal|mesial|distal|buccal|lingual|null", "notes": "" },
    "22": { "status": "healthy|decayed|filled|missing|impacted|needs_review", "confidence": "[0-100]", "severity": "mild|moderate|severe|null", "surface": "occlusal|mesial|distal|buccal|lingual|null", "notes": "" },
    "23": { "status": "healthy|decayed|filled|missing|impacted|needs_review", "confidence": "[0-100]", "severity": "mild|moderate|severe|null", "surface": "occlusal|mesial|distal|buccal|lingual|null", "notes": "" },
    "24": { "status": "healthy|decayed|filled|missing|impacted|needs_review", "confidence": "[0-100]", "severity": "mild|moderate|severe|null", "surface": "occlusal|mesial|distal|buccal|lingual|null", "notes": "" },
    "25": { "status": "healthy|decayed|filled|missing|impacted|needs_review", "confidence": "[0-100]", "severity": "mild|moderate|severe|null", "surface": "occlusal|mesial|distal|buccal|lingual|null", "notes": "" },
    "26": { "status": "healthy|decayed|filled|missing|impacted|needs_review", "confidence": "[0-100]", "severity": "mild|moderate|severe|null", "surface": "occlusal|mesial|distal|buccal|lingual|null", "notes": "" },
    "27": { "status": "healthy|decayed|filled|missing|impacted|needs_review", "confidence": "[0-100]", "severity": "mild|moderate|severe|null", "surface": "occlusal|mesial|distal|buccal|lingual|null", "notes": "" },
    "28": { "status": "healthy|decayed|filled|missing|impacted|needs_review", "confidence": "[0-100]", "severity": "mild|moderate|severe|null", "surface": "occlusal|mesial|distal|buccal|lingual|null", "notes": "" },
    "31": { "status": "healthy|decayed|filled|missing|impacted|needs_review", "confidence": "[0-100]", "severity": "mild|moderate|severe|null", "surface": "occlusal|mesial|distal|buccal|lingual|null", "notes": "" },
    "32": { "status": "healthy|decayed|filled|missing|impacted|needs_review", "confidence": "[0-100]", "severity": "mild|moderate|severe|null", "surface": "occlusal|mesial|distal|buccal|lingual|null", "notes": "" },
    "33": { "status": "healthy|decayed|filled|missing|impacted|needs_review", "confidence": "[0-100]", "severity": "mild|moderate|severe|null", "surface": "occlusal|mesial|distal|buccal|lingual|null", "notes": "" },
    "34": { "status": "healthy|decayed|filled|missing|impacted|needs_review", "confidence": "[0-100]", "severity": "mild|moderate|severe|null", "surface": "occlusal|mesial|distal|buccal|lingual|null", "notes": "" },
    "35": { "status": "healthy|decayed|filled|missing|impacted|needs_review", "confidence": "[0-100]", "severity": "mild|moderate|severe|null", "surface": "occlusal|mesial|distal|buccal|lingual|null", "notes": "" },
    "36": { "status": "healthy|decayed|filled|missing|impacted|needs_review", "confidence": "[0-100]", "severity": "mild|moderate|severe|null", "surface": "occlusal|mesial|distal|buccal|lingual|null", "notes": "" },
    "37": { "status": "healthy|decayed|filled|missing|impacted|needs_review", "confidence": "[0-100]", "severity": "mild|moderate|severe|null", "surface": "occlusal|mesial|distal|buccal|lingual|null", "notes": "" },
    "38": { "status": "healthy|decayed|filled|missing|impacted|needs_review", "confidence": "[0-100]", "severity": "mild|moderate|severe|null", "surface": "occlusal|mesial|distal|buccal|lingual|null", "notes": "" },
    "41": { "status": "healthy|decayed|filled|missing|impacted|needs_review", "confidence": "[0-100]", "severity": "mild|moderate|severe|null", "surface": "occlusal|mesial|distal|buccal|lingual|null", "notes": "" },
    "42": { "status": "healthy|decayed|filled|missing|impacted|needs_review", "confidence": "[0-100]", "severity": "mild|moderate|severe|null", "surface": "occlusal|mesial|distal|buccal|lingual|null", "notes": "" },
    "43": { "status": "healthy|decayed|filled|missing|impacted|needs_review", "confidence": "[0-100]", "severity": "mild|moderate|severe|null", "surface": "occlusal|mesial|distal|buccal|lingual|null", "notes": "" },
    "44": { "status": "healthy|decayed|filled|missing|impacted|needs_review", "confidence": "[0-100]", "severity": "mild|moderate|severe|null", "surface": "occlusal|mesial|distal|buccal|lingual|null", "notes": "" },
    "45": { "status": "healthy|decayed|filled|missing|impacted|needs_review", "confidence": "[0-100]", "severity": "mild|moderate|severe|null", "surface": "occlusal|mesial|distal|buccal|lingual|null", "notes": "" },
    "46": { "status": "healthy|decayed|filled|missing|impacted|needs_review", "confidence": "[0-100]", "severity": "mild|moderate|severe|null", "surface": "occlusal|mesial|distal|buccal|lingual|null", "notes": "" },
    "47": { "status": "healthy|decayed|filled|missing|impacted|needs_review", "confidence": "[0-100]", "severity": "mild|moderate|severe|null", "surface": "occlusal|mesial|distal|buccal|lingual|null", "notes": "" },
    "48": { "status": "healthy|decayed|filled|missing|impacted|needs_review", "confidence": "[0-100]", "severity": "mild|moderate|severe|null", "surface": "occlusal|mesial|distal|buccal|lingual|null", "notes": "" }
  },

  "summary": {
    "decayed": "[count of decayed teeth, 0-32]",
    "missing": "[count of missing teeth, 0-32]",
    "filled": "[count of filled teeth, 0-32]",
    "healthy": "[count of healthy teeth, 0-32]",
    "needs_review": "[count of needs_review teeth, 0-32]",
    "impacted": "[count of impacted teeth, 0-32]",
    "total": 32
  },

  "dmft_score": "[D + M + F score, 0-32]",
  "caries_experience": "[Very Low Caries Experience|Low Caries Experience|Moderate Caries Experience|High Caries Experience|Very High Caries Experience]",
  "caries_risk": "[Caries Risk: Very Low|Caries Risk: Low|Caries Risk: Moderate|Caries Risk: High|Caries Risk: Very High]",

  "confidence_metrics": {
    "overall_confidence": "[average of decay, missing, and filling averages, capped at the lowest of the three, 0-100]",
    "decay_detection_confidence": "[average confidence of decayed teeth, or 0 if none]",
    "missing_detection_confidence": "[average confidence of missing teeth, or 0 if none]",
    "filling_detection_confidence": "[average confidence of filled teeth, or 0 if none]"
  },

  "flags": {
    "urgent_teeth": ["[FDI tooth numbers with decay/pathology needing immediate care]"],
    "needs_review_teeth": ["[FDI tooth numbers marked needs_review]"],
    "impacted_teeth": ["[FDI tooth numbers marked impacted]"],
    "bone_loss_detected": "[true if bone loss/periapical pathology seen, false otherwise]",
    "bone_loss_location": "[location of bone loss/pathology or null]",
    "abnormalities": "[describe any other abnormalities/findings or null]",
    "radiologist_notes": "[detailed diagnostic notes and findings summary]"
  },

  "validation": {
    "dmft_check": "[dmft verification equation, e.g., 'D+M+F=DMFT ✅']",
    "total_check": "[total verification status]",
    "confidence_check": "[confidence verification status]",
    "labels_match": "[labels match verification status]",
    "decay_realistic": "[decay level verification status]"
  }
}

RETURN ONLY VALID JSON. NOTHING ELSE.`;

const VALIDATOR_PROMPT = `You are a dental consensus validator.

Review this consensus dental analysis JSON and check:

1. DMFT CHECK: Does final_summary.decayed + final_summary.missing + final_summary.filled = final_dmft? (If there is a mismatch due to rounding of the two models' raw averages vs. the conservative consensus statuses, reconcile them to match final_dmft).
2. TOTAL CHECK: Does final_summary.decayed + final_summary.missing + final_summary.filled + final_summary.healthy + final_summary.needs_review + final_summary.impacted = 32? (re-tally if necessary).
3. CONFIDENCE CHECK: Is overall confidence = average of decay, missing, and filling averages, capped at the lowest of the three?
4. LABELS MATCH CHECK: Does final_caries_experience match final_caries_risk exactly?
   - final_dmft = 0    → "Very Low Caries Experience" + "Caries Risk: Very Low"
   - final_dmft = 1-5  → "Low Caries Experience"      + "Caries Risk: Low"
   - final_dmft = 6-9  → "Moderate Caries Experience" + "Caries Risk: Moderate"
   - final_dmft = 10-13→ "High Caries Experience"     + "Caries Risk: High"
   - final_dmft = 14+  → "Very High Caries Experience"+ "Caries Risk: Very High"

Input JSON: {JSON_PAYLOAD}

Return corrected JSON conforming to the original consensus schema.
RETURN ONLY JSON. NO explanation text. NO markdown. JUST the JSON object.`;

// ─── Consensus Arbitrator ────────────────────────────────────────────────────────
function runConsensusArbitrator(activeModels) {
  const ALL_FDI = [
    '18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28',
    '31','32','33','34','35','36','37','38','41','42','43','44','45','46','47','48'
  ];

  // Single model path — return normalized consensus-schema format
  if (activeModels.length === 1) {
    const single = activeModels[0];
    const consensusTeeth = {};
    for (const fdi of ALL_FDI) {
      const t = (single.teeth && single.teeth[fdi]) || { status: 'healthy', confidence: 95 };
      const status = (t.status || 'healthy').toLowerCase();
      consensusTeeth[fdi] = {
        final_status: status,
        agreement: 'high',
        openai_status: status,
        gemini_status: status,
        final_confidence: t.confidence || 95
      };
    }

    const finalSummary = { decayed: 0, missing: 0, filled: 0, healthy: 0, needs_review: 0, impacted: 0 };
    let totalDecayConf = 0, countDecay = 0;
    let totalMissingConf = 0, countMissing = 0;
    let totalFilledConf = 0, countFilled = 0;

    for (const fdi of ALL_FDI) {
      const tooth = consensusTeeth[fdi];
      const status = tooth.final_status;
      if (finalSummary[status] !== undefined) finalSummary[status]++;
      else finalSummary.healthy++;
      if (status === 'decayed') { totalDecayConf += tooth.final_confidence; countDecay++; }
      else if (status === 'missing') { totalMissingConf += tooth.final_confidence; countMissing++; }
      else if (status === 'filled') { totalFilledConf += tooth.final_confidence; countFilled++; }
    }

    const decayAvg = countDecay ? Math.round(totalDecayConf / countDecay) : 0;
    const missingAvg = countMissing ? Math.round(totalMissingConf / countMissing) : 0;
    const filledAvg = countFilled ? Math.round(totalFilledConf / countFilled) : 0;
    const activeSubcategories = [decayAvg, missingAvg, filledAvg].filter(c => c > 0);
    let overallConf = activeSubcategories.length ? Math.round(activeSubcategories.reduce((s, c) => s + c, 0) / activeSubcategories.length) : 85;
    const lowestSubcategory = Math.min(...(activeSubcategories.length ? activeSubcategories : [85]));
    if (overallConf > lowestSubcategory) overallConf = lowestSubcategory;

    const finalDmft = single.dmft_score !== undefined ? single.dmft_score : (finalSummary.decayed + finalSummary.missing + finalSummary.filled);

    let expLabel = "Very Low Caries Experience";
    let riskLabel = "Caries Risk: Very Low";
    if (finalDmft <= 0) { expLabel = "Very Low Caries Experience"; riskLabel = "Caries Risk: Very Low"; }
    else if (finalDmft <= 5) { expLabel = "Low Caries Experience"; riskLabel = "Caries Risk: Low"; }
    else if (finalDmft <= 9) { expLabel = "Moderate Caries Experience"; riskLabel = "Caries Risk: Moderate"; }
    else if (finalDmft <= 13) { expLabel = "High Caries Experience"; riskLabel = "Caries Risk: High"; }
    else { expLabel = "Very High Caries Experience"; riskLabel = "Caries Risk: Very High"; }

    const qualityRaw = single.image_assessment || single.image_quality || {};
    const scoreLabel = qualityRaw.quality || qualityRaw.score || qualityRaw || "Good";

    return {
      consensus_teeth: consensusTeeth,
      high_agree_count: 32,
      medium_agree_count: 0,
      disputed_count: 0,
      final_dmft: finalDmft,
      final_summary: finalSummary,
      final_confidence_metrics: { overall: overallConf, decay: decayAvg, missing: missingAvg, filling: filledAvg },
      disputed_teeth_list: [],
      final_caries_experience: expLabel,
      final_caries_risk: riskLabel,
      image_quality: scoreLabel
    };
  }

  // ── Multi-model path: strict majority vote across 2 or 3 runs ──
  const n = activeModels.length; // 2 or 3

  const consensusTeeth = {};
  let highCount = 0, mediumCount = 0, disputedCount = 0;
  const disputedTeethList = [];

  // "Dangerous" statuses require higher agreement to avoid false positives
  const DANGEROUS = new Set(['decayed', 'missing']);
  const MIN_CONF_FOR_DANGEROUS = 40; // each run must hit this avg to confirm

  for (const fdi of ALL_FDI) {
    // Gather each run's reading for this tooth
    const readings = activeModels.map(m => {
      const t = (m.teeth && m.teeth[fdi]) || { status: 'healthy', confidence: 95 };
      return { status: (t.status || 'healthy').toLowerCase(), confidence: Number(t.confidence) || 85 };
    });

    // Count votes per status
    const votes = {};
    readings.forEach(r => { votes[r.status] = (votes[r.status] || 0) + 1; });

    // Find the winning status (most votes)
    const topStatus = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
    const winStatus = topStatus[0];
    const winVotes  = topStatus[1];

    // Average confidence of runs that AGREE with the winner
    const agreers = readings.filter(r => r.status === winStatus);
    const avgConf = Math.round(agreers.reduce((s, r) => s + r.confidence, 0) / agreers.length);

    let finalStatus, agreement, finalConfidence;

    if (winVotes === n) {
      // ── UNANIMOUS (all agree) ─────────────────────────────
      // If dangerous & avg confidence below threshold → needs_review
      if (DANGEROUS.has(winStatus) && avgConf < MIN_CONF_FOR_DANGEROUS) {
        finalStatus = 'needs_review';
        agreement   = 'medium';
        mediumCount++;
      } else {
        finalStatus = winStatus;
        agreement   = 'high';
        highCount++;
      }
      finalConfidence = avgConf;

    } else if (n >= 2 && winVotes >= 2) {
      // ── MAJORITY (2/3 or 2/2 agree) ──────────────────────
      if (DANGEROUS.has(winStatus) && avgConf < MIN_CONF_FOR_DANGEROUS) {
        // Majority says dangerous but confidence too low → needs_review
        finalStatus = 'needs_review';
        agreement   = 'medium';
        mediumCount++;
        finalConfidence = Math.max(55, avgConf - 10);
      } else {
        finalStatus = winStatus;
        agreement   = 'medium';
        mediumCount++;
        finalConfidence = avgConf;
      }

    } else {
      // ── MINORITY / NO MAJORITY: 1-to-1 tie (or 1-1-1) ─────────
      disputedTeethList.push(fdi);
      disputedCount++;
      agreement = 'disputed';
      
      const isFinding = s => ['decayed', 'missing', 'filled', 'impacted'].includes(s);
      const r1 = readings[0] || { status: 'healthy', confidence: 50 };
      const r2 = readings[1] || { status: 'healthy', confidence: 50 };

      // In a 1-1 tie, prioritize surfacing actual clinical findings over "healthy" or "needs_review".
      if (n === 2) {
        if (isFinding(r1.status) && !isFinding(r2.status)) {
          finalStatus = r1.status;
          finalConfidence = r1.confidence;
        } else if (isFinding(r2.status) && !isFinding(r1.status)) {
          finalStatus = r2.status;
          finalConfidence = r2.confidence;
        } else if (!isFinding(r1.status) && !isFinding(r2.status)) {
          // healthy vs needs_review -> default to healthy to avoid ? spam
          finalStatus = 'healthy';
          finalConfidence = Math.max(r1.confidence, r2.confidence);
        } else {
          // both are findings (e.g. decayed vs missing) -> pick highest confidence
          if (r1.confidence >= r2.confidence) {
            finalStatus = r1.status;
            finalConfidence = r1.confidence;
          } else {
            finalStatus = r2.status;
            finalConfidence = r2.confidence;
          }
        }
      } else {
        // Safe fallback for 3 models with a 3-way tie
        finalStatus = 'needs_review'; 
        finalConfidence = Math.max(50, avgConf - 20);
      }
    }

    consensusTeeth[fdi] = {
      final_status:    finalStatus,
      agreement:       agreement,
      run1_status:     readings[0]?.status || 'healthy',
      run2_status:     readings[1]?.status || 'healthy',
      run3_status:     readings[2]?.status || 'healthy',
      final_confidence: finalConfidence,
      votes:           winVotes + '/' + n
    };
  }

  // ── Build final summary counts ─────────────────────────────────────────────
  const finalSummary = { decayed: 0, missing: 0, filled: 0, healthy: 0, needs_review: 0, impacted: 0 };
  let totalDecayConf = 0, countDecay = 0;
  let totalMissingConf = 0, countMissing = 0;
  let totalFilledConf  = 0, countFilled  = 0;

  for (const fdi of ALL_FDI) {
    const tooth  = consensusTeeth[fdi];
    const status = tooth.final_status;
    if (finalSummary[status] !== undefined) finalSummary[status]++;
    else finalSummary.healthy++;
    if (status === 'decayed') { totalDecayConf  += tooth.final_confidence; countDecay++;  }
    else if (status === 'missing') { totalMissingConf += tooth.final_confidence; countMissing++; }
    else if (status === 'filled')  { totalFilledConf  += tooth.final_confidence; countFilled++;  }
  }

  // ── Confidence metrics ─────────────────────────────────────────────────────
  const decayAvg   = countDecay   ? Math.round(totalDecayConf  / countDecay)   : 0;
  const missingAvg = countMissing ? Math.round(totalMissingConf / countMissing) : 0;
  const filledAvg  = countFilled  ? Math.round(totalFilledConf  / countFilled)  : 0;

  const activeSubcategories = [decayAvg, missingAvg, filledAvg].filter(c => c > 0);
  let overallConf = activeSubcategories.length
    ? Math.round(activeSubcategories.reduce((s, c) => s + c, 0) / activeSubcategories.length)
    : 88;
  // RULE: overall MUST be ≤ lowest subcategory
  if (activeSubcategories.length) {
    overallConf = Math.min(overallConf, Math.min(...activeSubcategories));
  }

  // ── Final DMFT = count directly from consensus statuses (not averaged) ─────
  const finalDmft = finalSummary.decayed + finalSummary.missing + finalSummary.filled;

  // ── Caries labels ─────────────────────────────────────────────────────────
  let expLabel, riskLabel;
  if (finalDmft === 0)       { expLabel = "Very Low Caries Experience"; riskLabel = "Caries Risk: Very Low"; }
  else if (finalDmft <= 5)   { expLabel = "Low Caries Experience";       riskLabel = "Caries Risk: Low"; }
  else if (finalDmft <= 9)   { expLabel = "Moderate Caries Experience";  riskLabel = "Caries Risk: Moderate"; }
  else if (finalDmft <= 13)  { expLabel = "High Caries Experience";      riskLabel = "Caries Risk: High"; }
  else                       { expLabel = "Very High Caries Experience";  riskLabel = "Caries Risk: Very High"; }

  const firstQuality = activeModels[0].image_assessment || activeModels[0].image_quality || {};
  const scoreLabel = firstQuality.quality || firstQuality.score || firstQuality || "Good";

  return {
    consensus_teeth: consensusTeeth,
    high_agree_count:   highCount,
    medium_agree_count: mediumCount,
    disputed_count:     disputedCount,
    final_dmft:         finalDmft,
    final_summary:      finalSummary,
    final_confidence_metrics: { overall: overallConf, decay: decayAvg, missing: missingAvg, filling: filledAvg },
    disputed_teeth_list: disputedTeethList,
    final_caries_experience: expLabel,
    final_caries_risk:       riskLabel,
    image_quality: scoreLabel
  };
}

// ─── YOLO Helper ──────────────────────────────────────────────────────────────
function analyzeWithYOLO(base64Image) {
  return new Promise((resolve, reject) => {
    const tempFile = path.join(__dirname, 'temp_xray.jpg');
    // Save base64 image to temporary file
    try {
      const buffer = Buffer.from(base64Image, 'base64');
      fs.writeFileSync(tempFile, buffer);
    } catch (writeErr) {
      return reject(new Error(`Failed to write temporary image: ${writeErr.message}`));
    }

    const scriptPath = path.join(__dirname, 'predict.py');
    console.log('[DentAI] Running local YOLOv11 inference script...');
    
    exec(`python "${scriptPath}" "${tempFile}"`, (error, stdout, stderr) => {
      // Clean up the temporary file immediately
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      } catch (cleanupErr) {
        console.error('[DentAI] Warning: Temp file cleanup error:', cleanupErr.message);
      }

      if (error) {
        console.error('[DentAI] predict.py stderr:', stderr);
        return reject(new Error(`YOLO inference execution failed: ${error.message}`));
      }

      try {
        const result = extractJson(stdout);
        resolve(result);
      } catch (parseErr) {
        console.error('[DentAI] Failed to parse YOLO output:', stdout);
        reject(new Error(`Failed to parse YOLO output: ${parseErr.message}`));
      }
    });
  });
}

// ─── API Endpoint ─────────────────────────────────────────────────────────────

// ─── USER MANAGEMENT API (MongoDB) ───────────────────────────────────────────
app.post('/api/users', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const User = mongoose.model('User');
    const newUser = new User(req.body);
    await newUser.save();
    res.status(201).json(newUser);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Username already exists' });
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const User = mongoose.model('User');
    const users = await User.find({});
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const User = mongoose.model('User');
    const user = await User.findOne({ id: req.params.id });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (req.body.name) user.name = req.body.name;
    if (req.body.username) user.username = req.body.username;
    if (req.body.specialty !== undefined) user.specialty = req.body.specialty;
    if (req.body.password) user.password = req.body.password;
    if (req.body.email !== undefined) user.email = req.body.email;
    if (req.body.mobile !== undefined) user.mobile = req.body.mobile;
    if (req.body.address !== undefined) user.address = req.body.address;
    
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const User = mongoose.model('User');
    const result = await User.findOneAndDelete({ id: req.params.id });
    if (!result) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.put('/api/users/:id/password', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const User = mongoose.model('User');
    const user = await User.findOne({ id: req.params.id });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.passwordChanged) return res.status(400).json({ error: 'Password has already been changed once' });
    if (user.password !== req.body.oldPassword) return res.status(401).json({ error: 'Incorrect old password' });
    
    user.password = req.body.newPassword;
    user.passwordChanged = true;
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id/suspend', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const User = mongoose.model('User');
    const user = await User.findOne({ id: req.params.id });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Toggle status
    if (user.status === 'suspended') {
      user.status = 'active';
      user.suspendReason = '';
    } else {
      user.status = 'suspended';
      user.suspendReason = req.body.reason || 'Admin suspension';
    }
    await user.save();
    
    res.json({ success: true, status: user.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const User = mongoose.model('User');
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.status === 'suspended') {
      return res.status(403).json({ error: `Account suspended. Reason: ${user.suspendReason || 'No reason provided'}` });
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/analyze', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'Missing image payload' });

    const aiMode = process.env.AI_MODE || 'consensus';
    console.log(`[DentAI] Starting analysis in mode: ${aiMode}`);

    if (aiMode === 'simulation') {
      return res.json({ mode: 'simulation' });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (aiMode === 'gemini') {
      if (!geminiKey) throw new Error('GEMINI_API_KEY is not set in .env.');
      let result;
      let modelUsed = 'gemini-2.5-pro';
      try {
        result = await analyzeWithGemini(image, geminiKey, 0, 'gemini-2.5-pro');
      } catch (err) {
        console.warn('[DentAI] gemini-2.5-pro failed, falling back to gemini-2.5-flash:', err.message);
        result = await analyzeWithGemini(image, geminiKey, 0, 'gemini-2.5-flash');
        modelUsed = 'gemini-2.5-flash';
      }
      const finalDMFT = result.dmft_score !== undefined ? result.dmft_score : 0;
      const finalConfidence = (result.confidence_metrics && result.confidence_metrics.overall_confidence) || 85;
      return res.json({
        gemini: result,
        consensus: result,
        final_dmft: finalDMFT,
        final_confidence: finalConfidence,
        runs_succeeded: 1,
        mode: modelUsed
      });
    }

    if (aiMode === 'openai') {
      if (!openaiKey) throw new Error('OPENAI_API_KEY is not set in .env.');
      const result = await analyzeWithOpenai(image, openaiKey);
      const finalDMFT = result.dmft_score !== undefined ? result.dmft_score : 0;
      const finalConfidence = (result.confidence_metrics && result.confidence_metrics.overall_confidence) || 85;
      return res.json({
        gemini: result,
        consensus: result,
        final_dmft: finalDMFT,
        final_confidence: finalConfidence,
        runs_succeeded: 1,
        mode: 'openai'
      });
    }

    // ─── CONSENSUS MODE (Sequential Chain-of-Thought) ───
    if (aiMode === 'consensus') {
      try {
        console.log('[Chain] Starting Sequential Agentic Workflow...');
        
        // Tier 1: YOLO
        let yoloData = null;
        try {
           yoloData = await analyzeWithYOLO(image);
           console.log('[Chain] Tier 1: YOLO completed successfully.');
        } catch(e) {
           console.warn('[Chain] Tier 1: YOLO failed:', e.message);
        }

        // Tier 2: Gemini
        let geminiData = null;
        if (geminiKey) {
           try {
             geminiData = await analyzeWithGemini(image, geminiKey, 0, 'gemini-2.5-flash', yoloData);
             console.log('[Chain] Tier 2: Gemini completed successfully.');
           } catch(e) {
             console.warn('[Chain] Tier 2: Gemini failed:', e.message);
           }
        }

        // Tier 3: ChatGPT
        let chatgptData = null;
        if (openaiKey) {
           try {
             const hintsForGpt = {
                yolo_findings: yoloData || "Failed/Unavailable",
                gemini_findings: geminiData || "Failed/Unavailable"
             };
             chatgptData = await analyzeWithOpenai(image, openaiKey, hintsForGpt);
             console.log('[Chain] Tier 3: ChatGPT completed successfully.');
           } catch(e) {
             console.warn('[Chain] Tier 3: ChatGPT failed (handled gracefully):', e.message);
           }
        }

        // Resolve Final Arbitrator Data
        let finalData = null;
        if (chatgptData) {
            finalData = chatgptData;
            console.log('[Chain] ✅ Workflow Done. Using ChatGPT as final definitive result.');
        } else if (geminiData) {
            finalData = geminiData;
            console.log('[Chain] ✅ Workflow Done. Using Gemini as final definitive result.');
        } else if (yoloData) {
            finalData = yoloData;
            console.log('[Chain] ✅ Workflow Done. Using YOLO as final definitive result.');
        } else {
            throw new Error('All AI tiers failed to analyze the image.');
        }

        // We wrap the single definitive result into the frontend's consensus UI format
        const finalConsensus = runConsensusArbitrator([finalData]);
        
        return res.json({
          gemini: geminiData || finalData,
          consensus: finalConsensus,
          final_dmft: finalConsensus.final_dmft,
          final_confidence: finalConsensus.final_confidence_metrics.overall,
          runs_succeeded: [yoloData, geminiData, chatgptData].filter(x => x).length,
          mode: 'sequential-chain'
        });

      } catch (error) {
        console.error('[Chain] Fatal Workflow Error:', error);
        return res.status(500).json({ error: error.message });
      }
    }

    // Fallback if AI_MODE is unrecognized
    throw new Error(`Unrecognized AI_MODE: ${aiMode}`);

  } catch (err) {
    console.error('[DentAI] Error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ─── Model Helpers ────────────────────────────────────────────────────────────

// Clean markdown from JSON responses
function extractJson(text) {
  let clean = text.trim();
  
  // Strip markdown code fences if present
  clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // Try direct parse first
  try {
    return JSON.parse(clean);
  } catch (_) {}

  // Fallback: Find first { and last }
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonCandidate = clean.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(jsonCandidate);
    } catch (e) {
      console.warn("[DentAI] Failed to parse extracted brace block:", e.message);
    }
  }

  // Fallback: Find first [ and last ]
  const firstBracket = clean.indexOf('[');
  const lastBracket = clean.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    const jsonCandidate = clean.slice(firstBracket, lastBracket + 1);
    try {
      return JSON.parse(jsonCandidate);
    } catch (e) {
      console.warn("[DentAI] Failed to parse extracted bracket block:", e.message);
    }
  }

  throw new Error('Could not extract JSON from response: ' + clean.slice(0, 200));
}

async function analyzeWithGemini(base64Image, apiKey, temperature = 0, model = 'gemini-2.5-flash', priorHints = null) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  let dynamicPrompt = OPG_PROMPT;
  if (priorHints) {
    dynamicPrompt = `You are a senior dental radiologist. Your junior AI assistant (YOLO) has pre-screened this image and found the following:
${JSON.stringify(priorHints, null, 2)}

Please refine and verify these findings using the radiograph image. DO NOT blindly copy the hints if they are clinically incorrect. Keep the exact same JSON schema format for the output:
` + OPG_PROMPT;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: dynamicPrompt },
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
        ]
      }],
      generationConfig: { responseMimeType: 'application/json', temperature }
    })
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API Error (${response.status}): ${errText}`);
  }
  const resJson = await response.json();
  return extractJson(resJson.candidates[0].content.parts[0].text);
}

async function analyzeWithOpenai(base64Image, apiKey, priorHints = null) {
  const url = 'https://api.openai.com/v1/chat/completions';
  
  let dynamicPrompt = OPG_PROMPT;
  if (priorHints) {
    dynamicPrompt = `You are the Chief Dental Officer. 
Your junior assistants (YOLO and Gemini) have pre-screened this image and suggested the following findings:
${JSON.stringify(priorHints, null, 2)}

Please review the image carefully and act as the final clinical arbitrator. Verify their findings and produce the definitive clinical JSON. DO NOT blindly copy the hints if they are clinically incorrect. Keep the exact same JSON schema format for the output:
` + OPG_PROMPT;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: dynamicPrompt },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
        ]
      }],
      response_format: { type: 'json_object' },
      temperature: 0.2
    })
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API Error (${response.status}): ${errText}`);
  }
  const resJson = await response.json();
  return extractJson(resJson.choices[0].message.content);
}

async function validateWithGemini(consensusJson, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const prompt = VALIDATOR_PROMPT.replace('{JSON_PAYLOAD}', JSON.stringify(consensusJson, null, 2));
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0 }
    })
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Validator API Error (${response.status}): ${errText}`);
  }
  const resJson = await response.json();
  return extractJson(resJson.candidates[0].content.parts[0].text);
}

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`DentAI Server running successfully!`);
  console.log(`Local Access: http://localhost:${PORT}`);
  console.log(`Mode: strict conservative validation`);
  console.log(`==================================================\n`);
});
