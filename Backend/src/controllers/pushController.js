import { PushDeviceToken } from '../models/PushDeviceToken.js';

function normalizeToken(raw) {
  const t = typeof raw === 'string' ? raw.trim() : '';
  if (!t || t.length < 10) return '';
  return t;
}

export async function registerDevicePushToken(req, res, next) {
  try {
    const token = normalizeToken(req.body?.token);
    if (!token) {
      return res.status(400).json({ error: 'Push token is required' });
    }
    const platformRaw = typeof req.body?.platform === 'string' ? req.body.platform.toLowerCase() : '';
    const platform = platformRaw === 'android' || platformRaw === 'ios' ? platformRaw : 'unknown';

    await PushDeviceToken.findOneAndUpdate(
      { clerkUserId: req.clerkUserId, expoPushToken: token },
      { clerkUserId: req.clerkUserId, expoPushToken: token, platform },
      { upsert: true, new: true }
    );

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

export async function unregisterDevicePushToken(req, res, next) {
  try {
    const token = normalizeToken(req.body?.token);
    if (!token) {
      return res.status(400).json({ error: 'Push token is required' });
    }
    await PushDeviceToken.deleteOne({ clerkUserId: req.clerkUserId, expoPushToken: token });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}
