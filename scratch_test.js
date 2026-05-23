const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { exec } = require('child_process');

dotenv.config();

const img_path = "C:/Users/dines/.gemini/antigravity/brain/3b97af62-d5f0-47ca-b87b-dd6f55ec517d/.tempmediaStorage/media_3b97af62-d5f0-47ca-b87b-dd6f55ec517d_1779437158488.png";
const base64Image = fs.readFileSync(img_path).toString('base64');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const serverCode = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');

// Append exports to the server code
const exportsCode = `
module.exports = {
  analyzeWithYOLO,
  analyzeWithGemini,
  runConsensusArbitrator,
  validateWithGemini
};
`;

// Remove the app.listen block securely by splitting
const cleanCode = serverCode.split('app.listen(')[0];

const tempFile = path.join(__dirname, 'temp_server.js');
fs.writeFileSync(tempFile, cleanCode + exportsCode);

const { analyzeWithYOLO, analyzeWithGemini, runConsensusArbitrator, validateWithGemini } = require('./temp_server.js');

async function run() {
  console.log("Running YOLOv11...");
  const yolo = await analyzeWithYOLO(base64Image);
  console.log("YOLO DMFT:", yolo.dmft_score);
  
  const yoloNonHealthy = {};
  for (const [k, v] of Object.entries(yolo.teeth)) {
    if (v.status !== 'healthy') yoloNonHealthy[k] = v;
  }
  console.log("YOLO non-healthy teeth:", JSON.stringify(yoloNonHealthy, null, 2));

  console.log("Running Gemini-2.5-flash...");
  const gemini = await analyzeWithGemini(base64Image, GEMINI_API_KEY, 0, 'gemini-2.5-flash');
  console.log("Gemini DMFT:", gemini.dmft_score);
  
  const geminiNonHealthy = {};
  for (const [k, v] of Object.entries(gemini.teeth)) {
    if (v.status !== 'healthy') geminiNonHealthy[k] = v;
  }
  console.log("Gemini non-healthy teeth:", JSON.stringify(geminiNonHealthy, null, 2));

  console.log("Running Consensus Arbitrator...");
  const consensus = runConsensusArbitrator([yolo, gemini]);
  console.log("Consensus DMFT:", consensus.final_dmft);
  
  const consensusNonHealthy = {};
  for (const [k, v] of Object.entries(consensus.consensus_teeth)) {
    if (v.final_status !== 'healthy') consensusNonHealthy[k] = v;
  }
  console.log("Consensus non-healthy teeth:", JSON.stringify(consensusNonHealthy, null, 2));
  
  console.log("Running Validator...");
  const validated = await validateWithGemini(consensus, GEMINI_API_KEY);
  console.log("Validated DMFT:", validated.final_dmft);
  
  const validatedNonHealthy = {};
  const validatedTeeth = validated.consensus_teeth || validated.teeth || {};
  for (const [k, v] of Object.entries(validatedTeeth)) {
    const status = v.final_status || v.status || 'healthy';
    if (status !== 'healthy') validatedNonHealthy[k] = v;
  }
  console.log("Validated non-healthy teeth:", JSON.stringify(validatedNonHealthy, null, 2));

  fs.unlinkSync(tempFile);
}

run().catch(err => {
  console.error(err);
  if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
});
