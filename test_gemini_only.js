const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Copy OPG_PROMPT from server.js
const serverFile = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
const opgPromptMatch = serverFile.match(/const OPG_PROMPT = `([\s\S]*?)`;/);
const OPG_PROMPT = opgPromptMatch ? opgPromptMatch[1] : '';

const img_path = "C:/Users/dines/.gemini/antigravity/brain/3b97af62-d5f0-47ca-b87b-dd6f55ec517d/.tempmediaStorage/media_3b97af62-d5f0-47ca-b87b-dd6f55ec517d_1779437158488.png";
const base64Image = fs.readFileSync(img_path).toString('base64');

async function analyzeWithGemini(base64Image, apiKey, temperature = 0, model = 'gemini-2.5-flash') {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: OPG_PROMPT },
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
  const text = resJson.candidates[0].content.parts[0].text;
  
  // Clean JSON
  let clean = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(clean);
}

async function run() {
  console.log("Calling Gemini-2.5-flash with real OPG_PROMPT...");
  try {
    const res = await analyzeWithGemini(base64Image, GEMINI_API_KEY, 0, 'gemini-2.5-flash');
    console.log("Gemini DMFT:", res.dmft_score);
    console.log("Gemini Summary:", JSON.stringify(res.summary, null, 2));
    const nonHealthy = {};
    for (const [k, v] of Object.entries(res.teeth)) {
      if (v.status !== 'healthy') nonHealthy[k] = v;
    }
    console.log("Gemini Non-healthy teeth:", JSON.stringify(nonHealthy, null, 2));
  } catch (err) {
    console.error(err);
  }
}

run();
