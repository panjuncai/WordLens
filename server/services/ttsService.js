const axios = require('axios');
const { defaultVoice, azureKey: envKey, azureRegion: envRegion } = require('../config/env');

async function synthesize(text, { voice, azureKey, azureRegion }) {
  const key = azureKey || envKey;
  const region = azureRegion || envRegion;
  const voiceName = voice || defaultVoice;
  if (!key || !region) {
    const err = new Error('Missing AZURE_SPEECH_KEY or AZURE_REGION env vars');
    err.status = 500;
    throw err;
  }
  const ssml = `<speak version="1.0" xml:lang="fr-FR"><voice name="${voiceName}">${text}</voice></speak>`;
  const ttsResponse = await axios.post(
    `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
    ssml,
    {
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Ocp-Apim-Subscription-Region': region,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      },
      responseType: 'arraybuffer',
      proxy: false,
    },
  );
  return {
    audioBase64: Buffer.from(ttsResponse.data).toString('base64'),
    format: 'audio/mp3',
  };
}

module.exports = { synthesize };
