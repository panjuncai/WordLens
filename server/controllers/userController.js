const userModel = require('../models/userModel');

async function getConfig(req, res, next) {
  try {
    const user = await userModel.findById(req.user.id);
    res.json({
      azure_key: user?.azure_key || '',
      azure_region: user?.azure_region || '',
      azure_voice: user?.azure_voice || '',
    });
  } catch (err) {
    next(err);
  }
}

async function updateConfig(req, res, next) {
  const { azure_key: azureKey, azure_region: azureRegion, azure_voice: azureVoice } = req.body || {};
  try {
    await userModel.updateConfig(req.user.id, { azureKey, azureRegion, azureVoice });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { getConfig, updateConfig };
