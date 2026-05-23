const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { exec } = require('child_process');

dotenv.config();

const img_path = "C:/Users/dines/.gemini/antigravity/brain/3b97af62-d5f0-47ca-b87b-dd6f55ec517d/.tempmediaStorage/media_3b97af62-d5f0-47ca-b87b-dd6f55ec517d_1779437158488.png";
const base64Image = fs.readFileSync(img_path).toString('base64');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

function extractJson(text) {
  let clean = text.trim();
  clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(clean); } catch (_) {}
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonCandidate = clean.slice(firstBrace, lastBrace + 1);
    try { return JSON.parse(jsonCandidate); } catch (e) {}
  }
  throw new Error('Could not extract JSON: ' + clean.slice(0, 100));
}

function analyzeWithYOLO(base64Image) {
  return new Promise((resolve, reject) => {
    const tempFile = path.join(__dirname, 'temp_xray.jpg');
    fs.writeFileSync(tempFile, Buffer.from(base64Image, 'base64'));
    const scriptPath = path.join(__dirname, 'predict.py');
    exec(`python "${scriptPath}" "${tempFile}"`, (error, stdout, stderr) => {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      if (error) return reject(error);
      try {
        resolve(extractJson(stdout));
      } catch (parseErr) {
        reject(parseErr);
      }
    });
  });
}

// Prompt and Validator logic copied from server.js
const serverFile = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');

// Simple regex or substring extraction to get OPG_PROMPT, VALIDATOR_PROMPT, runConsensusArbitrator, etc.
// But to be safe, let's define a basic runner that calls the API or extracts functions.
// Actually, since we can just run the functions directly, let's write a small script that loads them dynamically using require or we copy them.
// Let's copy them exactly to avoid regex issues.

const OPG_PROMPT = `You are Dr. DentAI, a world-class dental radiologist with 30 years of experience reading OPG (Orthopantomogram) panoramic X-rays.
You are known for being ACCURATE, BALANCED and CONSISTENT.
You never overcount. You never undercount. You report what you clearly see.
[Truncated for test...]
`;

async function analyzeWithGemini(base64Image, apiKey, temperature = 0, model = 'gemini-2.5-flash') {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: "Analyze this OPG panoramic radiograph using the FDI tooth numbering system. For EVERY tooth (11-18, 21-28, 31-38, 41-48), classify as: healthy / decayed / filled / missing / unerupted / impacted / needs_review. Be accurate. Return the exact JSON schema with 'teeth' containing teeth objects and a summary, dmft_score, caries_experience, caries_risk, confidence_metrics, flags, and validation. Return only JSON." },
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

function runConsensusArbitrator(activeModels) {
  const ALL_FDI = [
    '18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28',
    '31','32','33','34','35','36','37','38','41','42','43','44','45','46','47','48'
  ];

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
    for (const fdi of ALL_FDI) {
      const status = consensusTeeth[fdi].final_status;
      finalSummary[status]++;
    }
    return {
      consensus_teeth: consensusTeeth,
      final_dmft: finalSummary.decayed + finalSummary.missing + finalSummary.filled,
      final_summary: finalSummary
    };
  }

  const n = activeModels.length;
  const consensusTeeth = {};
  let highCount = 0, mediumCount = 0, disputedCount = 0;
  const disputedTeethList = [];
  const DANGEROUS = new Set(['decayed', 'missing']);
  const MIN_CONF_FOR_DANGEROUS = 80;

  for (const fdi of ALL_FDI) {
    const readings = activeModels.map(m => {
      const t = (m.teeth && m.teeth[fdi]) || { status: 'healthy', confidence: 95 };
      return { status: (t.status || 'healthy').toLowerCase(), confidence: Number(t.confidence) || 85 };
    });
    const votes = {};
    readings.forEach(r => { votes[r.status] = (votes[r.status] || 0) + 1; });
    const topStatus = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
    const winStatus = topStatus[0];
    const winVotes  = topStatus[1];
    const agreers = readings.filter(r => r.status === winStatus);
    const avgConf = Math.round(agreers.reduce((s, r) => s + r.confidence, 0) / agreers.length);

    let finalStatus, agreement, finalConfidence;

    if (winVotes === n) {
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
    } else if (winVotes >= 2) {
      if (DANGEROUS.has(winStatus) && avgConf < MIN_CONF_FOR_DANGEROUS) {
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
      disputedTeethList.push(fdi);
      disputedCount++;
      agreement   = 'disputed';
      finalStatus = 'needs_review';
      finalConfidence = Math.max(50, avgConf - 20);
    }

    consensusTeeth[fdi] = {
      final_status: finalStatus,
      agreement: agreement,
      final_confidence: finalConfidence,
      votes: winVotes + '/' + n
    };
  }

  const finalSummary = { decayed: 0, missing: 0, filled: 0, healthy: 0, needs_review: 0, impacted: 0 };
  for (const fdi of ALL_FDI) {
    const status = consensusTeeth[fdi].final_status;
    if (finalSummary[status] !== undefined) finalSummary[status]++;
    else finalSummary.healthy++;
  }

  return {
    consensus_teeth: consensusTeeth,
    high_agree_count: highCount,
    medium_agree_count: mediumCount,
    disputed_count: disputedCount,
    final_dmft: finalSummary.decayed + finalSummary.missing + finalSummary.filled,
    final_summary: finalSummary,
    disputed_teeth_list: disputedTeethList
  };
}

async function run() {
  console.log("Running YOLOv11...");
  const yolo = await analyzeWithYOLO(base64Image);
  console.log("\n=== YOLOv11 Detections (Non-healthy) ===");
  for (const [k, v] of Object.entries(yolo.teeth)) {
    if (v.status !== 'healthy') {
      console.log(`Tooth ${k}: status=${v.status}, conf=${v.confidence}, notes=${v.notes}`);
    }
  }

  console.log("\nRunning Gemini-2.5-flash...");
  const gemini = await analyzeWithGemini(base64Image, GEMINI_API_KEY);
  console.log("\n=== Gemini-2.5-flash Detections (Non-healthy) ===");
  for (const [k, v] of Object.entries(gemini.teeth)) {
    if (v.status !== 'healthy') {
      console.log(`Tooth ${k}: status=${v.status}, conf=${v.confidence}`);
    }
  }

  console.log("\nRunning Consensus Arbitrator...");
  const consensus = runConsensusArbitrator([yolo, gemini]);
  console.log("\n=== Consensus Results (Non-healthy) ===");
  for (const [k, v] of Object.entries(consensus.consensus_teeth)) {
    if (v.final_status !== 'healthy') {
      console.log(`Tooth ${k}: final_status=${v.final_status}, agreement=${v.agreement}, conf=${v.final_confidence}`);
    }
  }
}

run().catch(console.error);
