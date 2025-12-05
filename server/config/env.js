const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

const requiredVars = ['JWT_SECRET'];
const missing = requiredVars.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

module.exports = {
  port: process.env.PORT || 4000,
  defaultVoice: process.env.AZURE_VOICE || 'fr-FR-DeniseNeural',
  jwtSecret: process.env.JWT_SECRET,
  azureKey: process.env.AZURE_SPEECH_KEY,
  azureRegion: process.env.AZURE_REGION,
};
