const userModel = require('../models/userModel');

const getLocalDay = (tzOffsetMinutes) => {
  const offset = Number.isFinite(tzOffsetMinutes) ? tzOffsetMinutes : new Date().getTimezoneOffset();
  const local = new Date(Date.now() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
};

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

async function getStudyStats(req, res, next) {
  try {
    const tzOffsetMinutes = Number(req.query?.tz_offset_minutes);
    const today = getLocalDay(Number.isFinite(tzOffsetMinutes) ? tzOffsetMinutes : undefined);
    const user = await userModel.findById(req.user.id);
    const totalMs = Number(user?.study_total_ms) || 0;
    const storedDay = user?.study_today_date || null;
    let todayMs = Number(user?.study_today_ms) || 0;
    if (storedDay !== today) {
      todayMs = 0;
      await userModel.updateStudyStats(req.user.id, {
        studyTotalMs: totalMs,
        studyTodayMs: 0,
        studyTodayDate: today,
      });
    }
    res.json({ today_ms: todayMs, total_ms: totalMs, day: today });
  } catch (err) {
    next(err);
  }
}

async function addStudyTime(req, res, next) {
  try {
    const { delta_ms: deltaMsRaw, tz_offset_minutes: tzOffsetMinutesRaw } = req.body || {};
    const deltaMs = Number(deltaMsRaw);
    const tzOffsetMinutes = Number(tzOffsetMinutesRaw);
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
      res.status(400).json({ error: 'delta_ms 必须为正数' });
      return;
    }
    // Client should send small increments; cap to reduce abuse and accidental huge deltas.
    const safeDelta = Math.min(deltaMs, 5 * 60 * 1000);
    const today = getLocalDay(Number.isFinite(tzOffsetMinutes) ? tzOffsetMinutes : undefined);
    const user = await userModel.findById(req.user.id);
    const totalMs = (Number(user?.study_total_ms) || 0) + safeDelta;
    const storedDay = user?.study_today_date || null;
    const baseTodayMs = storedDay === today ? (Number(user?.study_today_ms) || 0) : 0;
    const todayMs = baseTodayMs + safeDelta;
    await userModel.updateStudyStats(req.user.id, {
      studyTotalMs: totalMs,
      studyTodayMs: todayMs,
      studyTodayDate: today,
    });
    res.json({ today_ms: todayMs, total_ms: totalMs, day: today });
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

module.exports = { getConfig, updateConfig, getStudyStats, addStudyTime };
